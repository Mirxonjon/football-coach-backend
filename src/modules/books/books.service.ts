import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClickProvider } from '../payments/providers/click.provider';
import { StorageService } from '@/common/services/storage/storage.service';
import { CreateBookCategoryDto } from '@/types/books/create-book-category.dto';
import { UpdateBookCategoryDto } from '@/types/books/update-book-category.dto';
import { CreateBookDto } from '@/types/books/create-book.dto';
import { UpdateBookDto } from '@/types/books/update-book.dto';
import {
  BookSortBy,
  BookSortOrder,
  FilterBookDto,
} from '@/types/books/filter-book.dto';
import { FilterBookCategoryDto } from '@/types/books/filter-book-category.dto';
import { UpdateProgressDto } from '@/types/books/update-progress.dto';
import { DiscountType, Prisma } from '@prisma/client';

// Signed download URL stays valid long enough to download a 100MB PDF over a
// slow connection. User can re-request anytime — every download generates a
// fresh URL.
const DOWNLOAD_URL_TTL_SEC = 60 * 60; // 1 hour

@Injectable()
export class BooksService {
  private readonly logger = new Logger(BooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly click: ClickProvider,
    private readonly storage: StorageService,
  ) {}

  // ─── Book Categories ───

  async findAllCategories(filter: FilterBookCategoryDto = {}) {
    const where: Prisma.BookCategoryWhereInput = {};
    if (filter.categoryType) where.categoryType = filter.categoryType;
    if (filter.search) {
      where.OR = [
        { titleUz: { contains: filter.search, mode: 'insensitive' } },
        { titleRu: { contains: filter.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.bookCategory.findMany({
      where,
      orderBy: { id: 'desc' },
    });
  }

  async createCategory(dto: CreateBookCategoryDto) {
    return this.prisma.bookCategory.create({ data: dto });
  }

  async updateCategory(id: number, dto: UpdateBookCategoryDto) {
    await this.findCategoryOrFail(id);
    return this.prisma.bookCategory.update({ where: { id }, data: dto });
  }

  async deleteCategory(id: number) {
    await this.findCategoryOrFail(id);
    return this.prisma.bookCategory.delete({ where: { id } });
  }

  private async findCategoryOrFail(id: number) {
    const cat = await this.prisma.bookCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException(`BookCategory ${id} not found`);
    return cat;
  }

  // ─── Books ───

  async findAllBooks(filter: FilterBookDto = {}) {
    const where: Prisma.BookWhereInput = {};
    if (filter.categoryId) where.bookCategoryId = filter.categoryId;
    if (filter.categoryType) {
      where.bookCategory = { is: { categoryType: filter.categoryType } };
    }
    if (filter.search) {
      const q = filter.search.trim();
      where.OR = [
        { titleUz: { contains: q, mode: 'insensitive' } },
        { titleRu: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (filter.hasDiscount === true) {
      where.discountType = { not: 'NONE' };
    } else if (filter.hasDiscount === false) {
      where.discountType = 'NONE';
    }
    if (filter.isFree === true) where.basePrice = 0;
    else if (filter.isFree === false) where.basePrice = { gt: 0 };

    // sort
    const sortDir: 'asc' | 'desc' =
      filter.sortOrder === BookSortOrder.asc ? 'asc' : 'desc';
    let orderBy: Prisma.BookOrderByWithRelationInput;
    if (filter.sortBy === BookSortBy.createdAt) orderBy = { createdAt: sortDir };
    else if (filter.sortBy === BookSortBy.basePrice) orderBy = { basePrice: sortDir };
    else orderBy = { id: sortDir };

    if (filter.all) {
      const data = await this.prisma.book.findMany({
        where,
        include: { bookCategory: true },
        orderBy,
      });
      return { data };
    }

    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 12));
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.book.findMany({
        where,
        include: { bookCategory: true },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.book.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findBookById(id: number) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: { bookCategory: true },
    });
    if (!book) throw new NotFoundException(`Book ${id} not found`);
    return book;
  }

  async createBook(dto: CreateBookDto) {
    await this.findCategoryOrFail(dto.bookCategoryId);
    return this.prisma.book.create({
      data: dto,
      include: { bookCategory: true },
    });
  }

  async updateBook(id: number, dto: UpdateBookDto) {
    await this.findBookById(id);
    if (dto.bookCategoryId) await this.findCategoryOrFail(dto.bookCategoryId);
    return this.prisma.book.update({
      where: { id },
      data: dto,
      include: { bookCategory: true },
    });
  }

  async deleteBook(id: number) {
    await this.findBookById(id);
    return this.prisma.book.delete({ where: { id } });
  }

  // ─── User Books ───

  async getUserBooks(userId: number) {
    return this.prisma.userBook.findMany({
      where: { userId, isActive: true },
      include: { book: { include: { bookCategory: true } } },
      orderBy: { acquiredAt: 'desc' },
    });
  }

  /**
   * Purchase flow:
   * 1. Validate the book exists and isn't already purchased.
   * 2. Resolve the card to charge:
   *    - If the user passed an explicit cardId, use it.
   *    - Else if the user has exactly one verified card, auto-select it.
   *    - Else (zero / multiple cards, no cardId) → 400 — the UI must let the user pick.
   * 3. Compute the final price (basePrice − discount). If 0, skip Click and just hand the book over.
   * 4. Charge Click with the saved card token. Failure → 402 + WalletTransaction(FAILED).
   * 5. Success → create WalletTransaction(SUCCESS) + UserBook, link them by transactionId.
   */
  async purchaseBook(userId: number, bookId: number, cardId?: number) {
    const book = await this.findBookById(bookId);

    const existing = await this.prisma.userBook.findUnique({
      where: { userId_bookId: { userId, bookId } },
    });
    if (existing) throw new ConflictException('Book already purchased');

    const finalPrice = this.calculateFinalPrice(book);

    // Free book — no payment, just grant access.
    if (finalPrice <= 0) {
      const userBook = await this.prisma.userBook.create({
        data: { userId, bookId },
        include: { book: { include: { bookCategory: true } } },
      });
      return { userBook, transaction: null };
    }

    // Pick a card.
    const card = await this.resolveCard(userId, cardId);

    // Charge Click.
    const charge = await this.click.charge(finalPrice, card.token);
    if (!charge.success) {
      // Record the attempt for audit, then surface the error to the client.
      await this.prisma.walletTransaction.create({
        data: {
          userId,
          cardId: card.id,
          amount: finalPrice,
          provider: 'click',
          status: 'FAILED',
          externalId: charge.externalId ?? null,
          errorCode: charge.errorCode ?? null,
          errorMessage: charge.errorMessage ?? null,
        },
      });
      this.logger.warn(
        `[BOOK-BUY] ✗ userId=${userId} bookId=${bookId} amount=${finalPrice} err=${charge.errorCode}`,
      );
      throw new HttpException(
        {
          message: 'Payment failed',
          errorCode: charge.errorCode,
          errorMessage: charge.errorMessage,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    // Success — write the transaction and grant the book in one go so we
    // never end up charged-but-no-book or vice versa.
    const [userBook, transaction] = await this.prisma.$transaction(async (tx) => {
      const walletTx = await tx.walletTransaction.create({
        data: {
          userId,
          cardId: card.id,
          amount: finalPrice,
          provider: 'click',
          status: 'SUCCESS',
          externalId: charge.externalId ?? null,
        },
      });
      const ub = await tx.userBook.create({
        data: { userId, bookId, transactionId: walletTx.id },
        include: { book: { include: { bookCategory: true } } },
      });
      return [ub, walletTx];
    });

    this.logger.log(
      `[BOOK-BUY] ✓ userId=${userId} bookId=${bookId} amount=${finalPrice} txId=${transaction.id}`,
    );

    return {
      userBook,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
      },
    };
  }

  /**
   * DEV-ONLY: grant a book without charging Click. Refuses to run in
   * production. Useful when Click credentials are not yet configured.
   */
  async devGrantBook(userId: number, bookId: number) {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('dev-grant is disabled in production');
    }
    const book = await this.findBookById(bookId);
    const existing = await this.prisma.userBook.findUnique({
      where: { userId_bookId: { userId, bookId } },
    });
    if (existing) throw new ConflictException('Book already purchased');

    const userBook = await this.prisma.userBook.create({
      data: { userId, bookId },
      include: { book: { include: { bookCategory: true } } },
    });
    this.logger.log(
      `[BOOK-DEV-GRANT] userId=${userId} bookId=${bookId} price=${book.basePrice} (charge skipped)`,
    );
    return { userBook, transaction: null };
  }

  /**
   * Returns a fresh short-lived download URL for a book the user owns.
   * Frontend can call this every time the user taps "Yuklab olish" — link
   * never goes stale because we re-sign on demand.
   */
  async getDownloadUrl(userId: number, bookId: number) {
    const book = await this.findBookById(bookId);
    const owned = await this.prisma.userBook.findUnique({
      where: { userId_bookId: { userId, bookId } },
    });
    if (!owned || !owned.isActive) {
      throw new NotFoundException('You do not own this book');
    }

    const key = this.storage.urlToKey(book.fileUrl);
    if (!key) {
      // External URL (e.g. seeded `/books/...` path) — return as-is so dev/test still works.
      return { url: book.fileUrl, expiresInSec: 0 };
    }

    const url = await this.storage.getSignedDownloadUrl(key, DOWNLOAD_URL_TTL_SEC);
    return { url, expiresInSec: DOWNLOAD_URL_TTL_SEC };
  }

  // ─── Helpers ───────────────────────────────────────────────────────

  private calculateFinalPrice(book: {
    basePrice: number;
    discountType: DiscountType;
    discountPercent: number;
    fixedDiscountPrice: number | null;
  }): number {
    if (book.basePrice <= 0) return 0;
    switch (book.discountType) {
      case 'PERCENTAGE':
        return Math.max(
          0,
          Math.round(book.basePrice * (1 - book.discountPercent / 100) * 100) / 100,
        );
      case 'FIXED_PRICE':
        return book.fixedDiscountPrice ?? book.basePrice;
      default:
        return book.basePrice;
    }
  }

  private async resolveCard(userId: number, cardId?: number) {
    if (cardId) {
      const card = await this.prisma.card.findFirst({
        where: { id: cardId, userId, isActive: true, isVerified: true },
      });
      if (!card) {
        throw new BadRequestException('Card not found or not verified');
      }
      return card;
    }

    const cards = await this.prisma.card.findMany({
      where: { userId, isActive: true, isVerified: true },
    });
    if (cards.length === 0) {
      throw new BadRequestException('No saved card. Please add a card first.');
    }
    if (cards.length > 1) {
      throw new BadRequestException(
        'Multiple cards found. Please pass cardId to choose one.',
      );
    }
    return cards[0];
  }

  // ─── Book Progress ───

  async getProgress(userId: number, bookId: number) {
    const progress = await this.prisma.bookProgress.findUnique({
      where: { userId_bookId: { userId, bookId } },
    });
    if (!progress) {
      return { userId, bookId, lastPageRead: 0, isCompleted: false };
    }
    return progress;
  }

  async updateProgress(userId: number, bookId: number, dto: UpdateProgressDto) {
    const book = await this.findBookById(bookId);

    const owned = await this.prisma.userBook.findUnique({
      where: { userId_bookId: { userId, bookId } },
    });
    if (!owned) throw new NotFoundException('Book not purchased');

    // totalPages not in baseline schema — caller passes isCompleted via lastPageRead >= threshold separately
    const isCompleted = false;

    return this.prisma.bookProgress.upsert({
      where: { userId_bookId: { userId, bookId } },
      create: {
        userId,
        bookId,
        lastPageRead: dto.lastPageRead,
        isCompleted,
      },
      update: {
        lastPageRead: dto.lastPageRead,
        isCompleted,
      },
    });
  }
}
