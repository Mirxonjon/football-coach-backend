import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from './gemini.service';
import { ChunkingService } from './chunking.service';
import { PdfExtractorService } from './pdf-extractor.service';
import { detectLanguage, RagLanguage } from './language-detector';
import { buildSystemPrompt, RetrievedChunk } from './prompts';
import { WeaviateService } from './weaviate.service';

const HISTORY_TURNS = 10;
const TOP_K = Number(process.env.RAG_TOP_K ?? 12);

@Injectable()
export class BookRagService {
  private readonly logger = new Logger(BookRagService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
    private readonly chunker: ChunkingService,
    private readonly pdf: PdfExtractorService,
    private readonly weaviate: WeaviateService,
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

  // ─── User: chat history (Postgres) ───────────────────────
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

  // ─── User: full book chunks (in-app reader) ──────────────
  async getBookChunksForUser(
    userId: number,
    bookId: number,
    offset = 0,
    limit = 100,
  ) {
    await this.ensureOwnsBook(userId, bookId);
    await this.findBookOrFail(bookId);
    const { chunks, total } = await this.weaviate.getChunksByBook({
      bookId,
      offset,
      limit,
    });
    return {
      bookId,
      totalChunks: total,
      offset,
      limit,
      hasMore: offset + chunks.length < total,
      chunks: chunks.map((c) => ({
        chunkIndex: c.chunkIndex,
        language: c.language,
        text: c.text,
      })),
    };
  }

  // ─── User: send message ──────────────────────────────────
  async sendMessage(userId: number, bookId: number, message: string) {
    await this.ensureOwnsBook(userId, bookId);
    const book = await this.findBookOrFail(bookId);

    const lang: RagLanguage = detectLanguage(message);

    // 1. Embed user query
    const queryVec = await this.gemini.embed(message);

    // 2. Weaviate search — primary language
    let chunks = await this.searchBookChunks(bookId, queryVec, lang);

    // 3. Fallback to all languages if nothing in the user's language
    if (chunks.length === 0) {
      chunks = await this.searchBookChunks(bookId, queryVec, null);
    }

    // 4. Build prompt
    const bookTitle = lang === 'ru' ? book.titleRu : book.titleUz;
    const systemPrompt = buildSystemPrompt(lang, bookTitle, chunks);

    // 5. Recent history (Postgres)
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

    // 6. Chat completion — temperature 0 for maximum grounding to the chunks
    //    (less "creative" drift away from the book's content)
    const reply = await this.gemini.chat({
      systemInstruction: systemPrompt,
      history,
      userMessage: message,
      temperature: 0,
      maxOutputTokens: 2048,
    });

    // 7. Build sources payload — one entry per chunk used in the prompt.
    //    `n` matches the [N] citation the model is instructed to emit.
    const sources = chunks.map((c, i) => ({
      n: i + 1,
      chunkIndex: c.chunkIndex,
      language: c.language,
      preview: c.content.slice(0, 240).replace(/\s+/g, ' ').trim(),
    }));

    // 8. Persist messages atomically
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
          sources,
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
      sources,
      chatId: chat.id,
    };
  }

  // ─── Weaviate retrieval ──────────────────────────────────
  private async searchBookChunks(
    bookId: number,
    queryVec: number[],
    language: RagLanguage | null,
  ): Promise<RetrievedChunk[]> {
    const hits = await this.weaviate.searchChunks({
      bookId,
      language,
      queryVec,
      limit: TOP_K,
    });
    return hits.map((h) => ({
      content: h.content,
      language: h.language,
      chunkIndex: h.chunkIndex,
    }));
  }

  // ═══════════════════════════════════════════════════════
  // ADMIN: re-embed a book
  // ═══════════════════════════════════════════════════════
  async reembedBook(bookId: number) {
    const book = await this.findBookOrFail(bookId);

    // Pick source PDFs per language. Falls back to legacy `fileUrl`.
    const langs: { lang: RagLanguage; url: string }[] = [];
    if (book.fileUrlUz) langs.push({ lang: 'uz', url: book.fileUrlUz });
    if (book.fileUrlRu) langs.push({ lang: 'ru', url: book.fileUrlRu });
    if (langs.length === 0 && book.fileUrl) {
      langs.push({ lang: 'uz', url: book.fileUrl });
    }
    if (langs.length === 0) {
      throw new BadRequestException(
        "Kitobning fileUrl / fileUrlUz / fileUrlRu maydonlari bo'sh",
      );
    }

    // Clean-restart: drop existing chunks for this book in Weaviate.
    try {
      await this.weaviate.deleteByBook(bookId);
    } catch (e: any) {
      this.logger.warn(
        `[RAG] Could not clear existing chunks for bookId=${bookId}: ${e?.message ?? e}`,
      );
    }

    const summary: Record<string, { chunks: number; tokens: number }> = {};

    for (const { lang, url } of langs) {
      this.logger.log(
        `[RAG] Embedding bookId=${bookId} lang=${lang} url=${url}`,
      );
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
      const PROGRESS_EVERY = 25;
      const startedAt = Date.now();
      let totalTokens = 0;
      let processed = 0;
      for (const c of chunks) {
        // eslint-disable-next-line no-await-in-loop
        const vec = await this.gemini.embed(c.text);
        // eslint-disable-next-line no-await-in-loop
        await this.weaviate.insertChunk({
          bookId,
          language: lang,
          chunkIndex: c.index,
          content: c.text,
          tokens: c.approxTokens,
          vector: vec,
        });
        processed += 1;
        if (processed % PROGRESS_EVERY === 0 || processed === chunks.length) {
          const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
          const pct = Math.round((processed / chunks.length) * 100);
          this.logger.log(
            `[RAG] bookId=${bookId} lang=${lang} — ${processed}/${chunks.length} (${pct}%) · ${elapsedSec}s`,
          );
        }
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
    const stats = await this.weaviate.statsByBook(bookId);
    const out: Record<string, { chunks: number; latest: Date | null }> = {};
    for (const [lang, info] of Object.entries(stats.languages)) {
      out[lang] = { chunks: info.chunks, latest: info.latest };
    }
    return { bookId, languages: out };
  }

  async deleteEmbeddings(bookId: number) {
    await this.findBookOrFail(bookId);
    const deleted = await this.weaviate.deleteByBook(bookId);
    return { bookId, deleted };
  }
}
