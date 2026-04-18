import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookCategoryDto } from '@/types/books/create-book-category.dto';
import { UpdateBookCategoryDto } from '@/types/books/update-book-category.dto';
import { CreateBookDto } from '@/types/books/create-book.dto';
import { UpdateBookDto } from '@/types/books/update-book.dto';
import { FilterBookDto } from '@/types/books/filter-book.dto';
import { UpdateProgressDto } from '@/types/books/update-progress.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Book Categories ───

  async findAllCategories() {
    return this.prisma.bookCategory.findMany({
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

  async findAllBooks(filter: FilterBookDto) {
    const where: Prisma.BookWhereInput = {};
    if (filter.categoryId) where.bookCategoryId = filter.categoryId;
    if (filter.search) {
      where.OR = [
        { titleUz: { contains: filter.search, mode: 'insensitive' } },
        { titleRu: { contains: filter.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.book.findMany({
      where,
      include: { bookCategory: true },
      orderBy: { id: 'desc' },
    });
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

  async purchaseBook(userId: number, bookId: number) {
    await this.findBookById(bookId);

    const existing = await this.prisma.userBook.findUnique({
      where: { userId_bookId: { userId, bookId } },
    });
    if (existing) throw new ConflictException('Book already purchased');

    return this.prisma.userBook.create({
      data: { userId, bookId },
      include: { book: true },
    });
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
