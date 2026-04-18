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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BooksService } from './books.service';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateBookCategoryDto } from '@/types/books/create-book-category.dto';
import { UpdateBookCategoryDto } from '@/types/books/update-book-category.dto';
import { CreateBookDto } from '@/types/books/create-book.dto';
import { UpdateBookDto } from '@/types/books/update-book.dto';
import { FilterBookDto } from '@/types/books/filter-book.dto';
import { PurchaseBookDto } from '@/types/books/purchase-book.dto';
import { UpdateProgressDto } from '@/types/books/update-progress.dto';
import { Request } from 'express';

@ApiTags('Books')
@ApiBearerAuth()
@Controller()
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  // ─── Public ───

  @Public()
  @Get('book-categories')
  @ApiOperation({ summary: 'List all book categories' })
  findAllCategories() {
    return this.booksService.findAllCategories();
  }

  @Public()
  @Get('books')
  @ApiOperation({ summary: 'List books with optional filters' })
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
  @ApiOperation({ summary: 'Purchase a book' })
  purchaseBook(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() _dto: PurchaseBookDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).user.sub as number;
    return this.booksService.purchaseBook(userId, bookId);
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
