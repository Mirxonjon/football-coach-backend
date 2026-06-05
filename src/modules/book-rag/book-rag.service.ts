import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from './gemini.service';
import { ChunkingService } from './chunking.service';
import { PdfExtractorService } from './pdf-extractor.service';
import { detectLanguage, RagLanguage } from './language-detector';
import { buildSystemPrompt, RetrievedChunk } from './prompts';

const HISTORY_TURNS = 10;
const TOP_K = 6;

@Injectable()
export class BookRagService {
  private readonly logger = new Logger(BookRagService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
    private readonly chunker: ChunkingService,
    private readonly pdf: PdfExtractorService,
  ) {}

  // ─── Ownership check ─────────────────────────────────────
  private async ensureOwnsBook(userId: number, bookId: number) {
    const owned = await this.prisma.userBook.findUnique({
      where: { userId_bookId: { userId, bookId } },
    });
    if (!owned || !owned.isActive) {
      throw new ForbiddenException(
        "Bu kitobga ruxsatingiz yo'q. Avval sotib oling.",
      );
    }
  }

  private async findBookOrFail(bookId: number) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException(`Book ${bookId} not found`);
    return book;
  }

  // ─── User: chat history ──────────────────────────────────
  async getOrCreateChat(userId: number, bookId: number) {
    let chat = await this.prisma.aiBookChat.findFirst({
      where: { userId, bookId },
      orderBy: { id: 'desc' },
    });
    if (!chat) {
      chat = await this.prisma.aiBookChat.create({
        data: { userId, bookId, title: null },
      });
    }
    return chat;
  }

  async getMyChat(userId: number, bookId: number) {
    await this.ensureOwnsBook(userId, bookId);
    await this.findBookOrFail(bookId);
    const chat = await this.getOrCreateChat(userId, bookId);
    const messages = await this.prisma.aiBookMessage.findMany({
      where: { chatId: chat.id },
      orderBy: { id: 'asc' },
    });
    return { chat, messages };
  }

  async clearMyChat(userId: number, bookId: number) {
    await this.ensureOwnsBook(userId, bookId);
    const chat = await this.prisma.aiBookChat.findFirst({
      where: { userId, bookId },
    });
    if (!chat) return { deleted: 0 };
    const res = await this.prisma.aiBookMessage.deleteMany({
      where: { chatId: chat.id },
    });
    return { deleted: res.count };
  }

  // ─── User: send message ──────────────────────────────────
  async sendMessage(userId: number, bookId: number, message: string) {
    await this.ensureOwnsBook(userId, bookId);
    const book = await this.findBookOrFail(bookId);

    const lang: RagLanguage = detectLanguage(message);

    // 1. Embed user query
    const queryVec = await this.gemini.embed(message);

    // 2. pgvector search — primary language
    let chunks = await this.searchChunks(bookId, queryVec, lang);

    // 3. Fallback to all languages of this book if no chunks
    if (chunks.length === 0) {
      chunks = await this.searchChunks(bookId, queryVec, null);
    }

    // 4. Build system prompt
    const bookTitle = lang === 'ru' ? book.titleRu : book.titleUz;
    const systemPrompt = buildSystemPrompt(lang, bookTitle, chunks);

    // 5. Recent chat history (oldest first)
    const chat = await this.getOrCreateChat(userId, bookId);
    const recent = await this.prisma.aiBookMessage.findMany({
      where: { chatId: chat.id },
      orderBy: { id: 'desc' },
      take: HISTORY_TURNS,
    });
    const history = recent.reverse().map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // 6. Gemini chat
    const reply = await this.gemini.chat({
      systemInstruction: systemPrompt,
      history,
      userMessage: message,
      temperature: 0.2,
      maxOutputTokens: 800,
    });

    // 7. Persist messages atomically
    await this.prisma.$transaction([
      this.prisma.aiBookMessage.create({
        data: {
          chatId: chat.id,
          role: 'user',
          language: lang,
          content: message,
        },
      }),
      this.prisma.aiBookMessage.create({
        data: {
          chatId: chat.id,
          role: 'assistant',
          language: lang,
          content: reply.text,
          tokensIn: reply.tokensIn,
          tokensOut: reply.tokensOut,
        },
      }),
      this.prisma.aiBookChat.update({
        where: { id: chat.id },
        data: { updatedAt: new Date() },
      }),
    ]);

    return {
      answer: reply.text,
      language: lang,
      sources: chunks.length,
      chatId: chat.id,
    };
  }

  // ─── pgvector retrieval ──────────────────────────────────
  private async searchChunks(
    bookId: number,
    queryVec: number[],
    language: RagLanguage | null,
  ): Promise<RetrievedChunk[]> {
    // pgvector expects vector literal: '[0.1,0.2,...]'
    const vecLiteral = `[${queryVec.join(',')}]`;

    if (language) {
      const rows = await this.prisma.$queryRaw<
        Array<{ content: string; language: string; chunkIndex: number }>
      >`
        SELECT content, language, "chunkIndex"
        FROM "BookEmbedding"
        WHERE "bookId" = ${bookId} AND language = ${language}
        ORDER BY embedding <=> ${vecLiteral}::vector
        LIMIT ${TOP_K}
      `;
      return rows;
    }
    const rows = await this.prisma.$queryRaw<
      Array<{ content: string; language: string; chunkIndex: number }>
    >`
      SELECT content, language, "chunkIndex"
      FROM "BookEmbedding"
      WHERE "bookId" = ${bookId}
      ORDER BY embedding <=> ${vecLiteral}::vector
      LIMIT ${TOP_K}
    `;
    return rows;
  }

  // ═══════════════════════════════════════════════════════
  // ADMIN: re-embed a book
  // ═══════════════════════════════════════════════════════
  async reembedBook(bookId: number) {
    const book = await this.findBookOrFail(bookId);

    // Determine which language files to embed.
    const langs: { lang: RagLanguage; url: string }[] = [];
    if (book.fileUrlUz) langs.push({ lang: 'uz', url: book.fileUrlUz });
    if (book.fileUrlRu) langs.push({ lang: 'ru', url: book.fileUrlRu });
    // Fallback: legacy single fileUrl → treat as 'uz' (titleUz primary).
    if (langs.length === 0 && book.fileUrl) {
      langs.push({ lang: 'uz', url: book.fileUrl });
    }
    if (langs.length === 0) {
      throw new BadRequestException(
        "Kitobning fileUrl / fileUrlUz / fileUrlRu maydonlari bo'sh",
      );
    }

    // Clean-restart: delete old chunks first.
    await this.prisma.bookEmbedding.deleteMany({ where: { bookId } });

    const summary: Record<string, { chunks: number; tokens: number }> = {};
    for (const { lang, url } of langs) {
      this.logger.log(`[RAG] Embedding bookId=${bookId} lang=${lang} url=${url}`);
      const { text, numPages } = await this.pdf.extractText(url);
      if (!text || text.trim().length < 20) {
        this.logger.warn(
          `[RAG] bookId=${bookId} lang=${lang} matn bo'sh yoki juda qisqa (${text.length} char)`,
        );
        summary[lang] = { chunks: 0, tokens: 0 };
        continue;
      }
      const chunks = this.chunker.chunk(text);
      this.logger.log(
        `[RAG] bookId=${bookId} lang=${lang} pages=${numPages} → ${chunks.length} chunk`,
      );
      let totalTokens = 0;
      // Embed and insert one-by-one (Gemini free tier RPM is modest).
      for (const c of chunks) {
        // eslint-disable-next-line no-await-in-loop
        const vec = await this.gemini.embed(c.text);
        const vecLiteral = `[${vec.join(',')}]`;
        // Insert via raw SQL — Prisma can't bind vector type otherwise.
        // eslint-disable-next-line no-await-in-loop
        await this.prisma.$executeRaw`
          INSERT INTO "BookEmbedding" ("bookId", "language", "chunkIndex", "content", "tokens", "embedding")
          VALUES (${bookId}, ${lang}, ${c.index}, ${c.text}, ${c.approxTokens}, ${vecLiteral}::vector)
        `;
        totalTokens += c.approxTokens;
      }
      summary[lang] = { chunks: chunks.length, tokens: totalTokens };
    }

    return {
      bookId,
      languages: summary,
      total: Object.values(summary).reduce(
        (acc, v) => ({
          chunks: acc.chunks + v.chunks,
          tokens: acc.tokens + v.tokens,
        }),
        { chunks: 0, tokens: 0 },
      ),
    };
  }

  async getEmbeddingStatus(bookId: number) {
    await this.findBookOrFail(bookId);
    const rows = await this.prisma.$queryRaw<
      Array<{ language: string; count: bigint; latest: Date | null }>
    >`
      SELECT language, COUNT(*)::bigint AS count, MAX("createdAt") AS latest
      FROM "BookEmbedding"
      WHERE "bookId" = ${bookId}
      GROUP BY language
    `;
    const map: Record<string, { chunks: number; latest: Date | null }> = {};
    for (const r of rows) {
      map[r.language] = {
        chunks: Number(r.count),
        latest: r.latest,
      };
    }
    return { bookId, languages: map };
  }

  async deleteEmbeddings(bookId: number) {
    await this.findBookOrFail(bookId);
    const res = await this.prisma.bookEmbedding.deleteMany({ where: { bookId } });
    return { bookId, deleted: res.count };
  }
}
