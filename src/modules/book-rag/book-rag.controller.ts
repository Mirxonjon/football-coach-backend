import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { BookRagService } from './book-rag.service';
import { SendBookChatMessageDto } from '@/types/book-rag/send-message.dto';

@ApiTags('Book RAG (AI Chat)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/books/:bookId/ai-chat')
export class BookRagController {
  constructor(private readonly service: BookRagService) {}

  @Get()
  @ApiOperation({
    summary:
      'Get my AI chat history for a purchased book. Requires UserBook.isActive=true.',
  })
  getChat(
    @Req() req: Request,
    @Param('bookId', ParseIntPipe) bookId: number,
  ) {
    const userId = (req as any).user.sub as number;
    return this.service.getMyChat(userId, bookId);
  }

  @Post('messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Ask the book a question. Language auto-detected (UZ/RU). Reply uses only this book\'s embedded chunks.',
  })
  send(
    @Req() req: Request,
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() dto: SendBookChatMessageDto,
  ) {
    const userId = (req as any).user.sub as number;
    return this.service.sendMessage(userId, bookId, dto.message);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear my chat history for this book' })
  clear(
    @Req() req: Request,
    @Param('bookId', ParseIntPipe) bookId: number,
  ) {
    const userId = (req as any).user.sub as number;
    return this.service.clearMyChat(userId, bookId);
  }
}
