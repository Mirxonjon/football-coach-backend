import {
  Controller,
  DefaultValuePipe,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { BookRagService } from './book-rag.service';

/**
 * In-app reader endpoint — returns the full ordered chunk list of a purchased
 * book so the frontend can render a NotebookLM-style "Read the book" panel
 * and scroll/highlight to `chunkIndex` when a citation [N] is clicked.
 *
 * Vector data is NOT returned — only text + language + chunkIndex.
 */
@ApiTags('Book Chunks (Reader)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/books/:bookId/chunks')
export class BookChunksController {
  constructor(private readonly service: BookRagService) {}

  @Get()
  @Header('Cache-Control', 'private, max-age=3600')
  @ApiOperation({
    summary:
      'Get all chunks of a purchased book in chunkIndex order. Supports ?offset & ?limit pagination (limit max 500, default 100). Cached 1h.',
  })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 100 })
  list(
    @Req() req: Request,
    @Param('bookId', ParseIntPipe) bookId: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    const userId = (req as any).user.sub as number;
    return this.service.getBookChunksForUser(userId, bookId, offset, limit);
  }
}
