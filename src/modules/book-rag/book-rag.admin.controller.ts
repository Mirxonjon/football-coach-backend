import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BookRagService } from './book-rag.service';

@ApiTags('Book RAG Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/books/:bookId/embed')
export class BookRagAdminController {
  constructor(private readonly service: BookRagService) {}

  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Re-embed a book. Deletes existing chunks then re-ingests from fileUrlUz / fileUrlRu (or legacy fileUrl). Synchronous — may take 30-90s for a 200-page book.',
  })
  reembed(@Param('bookId', ParseIntPipe) bookId: number) {
    return this.service.reembedBook(bookId);
  }

  @Get('status')
  @Roles('ADMIN')
  @ApiOperation({
    summary:
      'Embedding status per language: chunk count and last update time.',
  })
  status(@Param('bookId', ParseIntPipe) bookId: number) {
    return this.service.getEmbeddingStatus(bookId);
  }

  @Delete()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Delete all embeddings for this book (does not delete the book).',
  })
  remove(@Param('bookId', ParseIntPipe) bookId: number) {
    return this.service.deleteEmbeddings(bookId);
  }
}
