import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { Request, Response } from 'express';
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

  /**
   * SSE streaming variant of POST /messages — emits tokens as Gemini
   * produces them so the UI renders a typing effect like ChatGPT/Claude.
   *
   * Event stream:
   *   event: meta    data: {chatId, language}
   *   event: token   data: {text}          (many)
   *   event: sources data: [{n, chunkIndex, language, preview}]
   *   event: done    data: {messageId, tokensIn, tokensOut, finishReason}
   *   event: error   data: {code, message} (terminal; replaces `done`)
   *
   * Uses raw `@Res()` so the global ResponseInterceptor does not wrap
   * the body in {status_code, data, ...}. Headers disable proxy/CDN
   * buffering (`X-Accel-Buffering: no`) so the stream is end-to-end.
   */
  @Post('messages/stream')
  @ApiOperation({
    summary:
      'Stream the AI reply as SSE (text/event-stream). Same auth, same body shape as /messages. Emits meta → tokens → sources → done events.',
  })
  async sendStream(
    @Req() req: Request,
    @Res() res: Response,
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() dto: SendBookChatMessageDto,
  ) {
    const userId = (req as any).user.sub as number;

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const write = (event: string, payload: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    // Detect client disconnect — abort persistence loop early.
    let aborted = false;
    req.on('close', () => {
      aborted = true;
    });

    try {
      for await (const ev of this.service.sendMessageStream(
        userId,
        bookId,
        dto.message,
      )) {
        if (aborted) break;
        switch (ev.kind) {
          case 'meta':
            write('meta', { chatId: ev.chatId, language: ev.language });
            break;
          case 'token':
            write('token', { text: ev.text });
            break;
          case 'sources':
            write('sources', ev.sources);
            break;
          case 'done':
            write('done', {
              messageId: ev.messageId,
              tokensIn: ev.tokensIn,
              tokensOut: ev.tokensOut,
              finishReason: ev.finishReason,
            });
            break;
          case 'error':
            write('error', { code: ev.code, message: ev.message });
            break;
        }
      }
    } catch (e: any) {
      const code =
        e instanceof ForbiddenException
          ? 'forbidden'
          : e instanceof NotFoundException
            ? 'not_found'
            : 'internal';
      write('error', {
        code,
        message: e?.message ?? 'Unexpected error',
      });
    } finally {
      res.end();
    }
  }
}
