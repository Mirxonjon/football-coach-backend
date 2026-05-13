import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BooksService } from './books.service';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CreateBookCategoryDto } from '@/types/books/create-book-category.dto';
import { UpdateBookCategoryDto } from '@/types/books/update-book-category.dto';
import { CreateBookDto } from '@/types/books/create-book.dto';
import { UpdateBookDto } from '@/types/books/update-book.dto';
import { FilterBookDto } from '@/types/books/filter-book.dto';
import { FilterBookCategoryDto } from '@/types/books/filter-book-category.dto';
import { PurchaseBookDto } from '@/types/books/purchase-book.dto';
import { UpdateProgressDto } from '@/types/books/update-progress.dto';
import { Request } from 'express';

@ApiTags('Books')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  // ─── Public ───

  @Public()
  @Get('book-categories')
  @ApiOperation({ summary: 'List all book categories' })
  findAllCategories(@Query() filter: FilterBookCategoryDto) {
    return this.booksService.findAllCategories(filter);
  }

  @Public()
  @Get('books')
  @ApiOperation({
    summary:
      'List books with pagination, filters and sort. Default page=1, limit=12, sortOrder=desc.',
    description:
      'Filters: categoryId, categoryType (BOOK|KONSPEKT), search (UZ/RU title), hasDiscount, isFree (basePrice=0). ' +
      'Sort: sortBy=id|createdAt|basePrice, sortOrder=asc|desc. ' +
      'Pass `all=true` to skip pagination.',
  })
  findAllBooks(@Query() filter: FilterBookDto) {
    return this.booksService.findAllBooks(filter);
  }

  @Public()
  @Get('books/:id')
  @ApiOperation({ summary: 'Get book by ID' })
  findBookById(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.findBookById(id);
  }

  // ─── Admin: Categories ───

  @Post('admin/book-categories')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create book category' })
  createCategory(@Body() dto: CreateBookCategoryDto) {
    return this.booksService.createCategory(dto);
  }

  @Patch('admin/book-categories/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update book category' })
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBookCategoryDto,
  ) {
    return this.booksService.updateCategory(id, dto);
  }

  @Delete('admin/book-categories/:id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete book category' })
  async deleteCategory(@Param('id', ParseIntPipe) id: number) {
    await this.booksService.deleteCategory(id);
  }

  // ─── Admin: Books ───

  @Post('admin/books')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create book' })
  createBook(@Body() dto: CreateBookDto) {
    return this.booksService.createBook(dto);
  }

  @Patch('admin/books/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update book' })
  updateBook(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBookDto,
  ) {
    return this.booksService.updateBook(id, dto);
  }

  @Delete('admin/books/:id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete book' })
  async deleteBook(@Param('id', ParseIntPipe) id: number) {
    await this.booksService.deleteBook(id);
  }

  // ─── User: My Books ───

  @Get('me/books')
  @ApiOperation({ summary: 'List my purchased books' })
  getMyBooks(@Req() req: Request) {
    const userId = (req as any).user.sub as number;
    return this.booksService.getUserBooks(userId);
  }

  @Post('me/books/:bookId/purchase')
  @ApiOperation({
    summary:
      'Purchase a book — charges the saved Click card. If the user has exactly one verified card, cardId is optional; otherwise pass cardId in the body.',
  })
  purchaseBook(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() dto: PurchaseBookDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).user.sub as number;
    return this.booksService.purchaseBook(userId, bookId, dto.cardId);
  }

  @Get('me/books/:bookId/download')
  @ApiOperation({
    summary:
      'Get a fresh short-lived download URL for an already-purchased book (valid 1 hour, regenerable on demand).',
  })
  downloadBook(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Req() req: Request,
  ) {
    const userId = (req as any).user.sub as number;
    return this.booksService.getDownloadUrl(userId, bookId);
  }

  @Post('me/books/:bookId/dev-grant')
  @ApiOperation({
    summary:
      'DEV-ONLY: grant a book without charging (skips Click). Disabled when NODE_ENV=production.',
  })
  devGrantBook(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Req() req: Request,
  ) {
    const userId = (req as any).user.sub as number;
    return this.booksService.devGrantBook(userId, bookId);
  }

  // ─── User: Progress ───

  @Get('me/books/:bookId/progress')
  @ApiOperation({ summary: 'Get my reading progress' })
  getProgress(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Req() req: Request,
  ) {
    const userId = (req as any).user.sub as number;
    return this.booksService.getProgress(userId, bookId);
  }

  @Patch('me/books/:bookId/progress')
  @ApiOperation({ summary: 'Update reading progress' })
  updateProgress(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() dto: UpdateProgressDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).user.sub as number;
    return this.booksService.updateProgress(userId, bookId, dto);
  }
}
