import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import weaviate, { ApiKey, Filters, WeaviateClient } from 'weaviate-client';

/**
 * Weaviate adapter for the Book RAG vector store.
 *
 * - Maintains a single shared WeaviateClient (lazy-connected, cached).
 * - Owns the `BookChunk` collection (creates it on first boot if missing).
 * - All Book-RAG vector ops (insert / search / delete / stats) live here so
 *   BookRagService stays free of vendor-specific code.
 *
 * Each chunk row:
 *   bookId      : INT     — Book.id (Postgres FK in spirit)
 *   language    : TEXT    — 'uz' | 'ru'
 *   chunkIndex  : INT     — order inside the book
 *   content     : TEXT    — raw chunk text
 *   tokens      : INT     — approximate token count
 *   vector      : 768-dim — provided by us (Gemini text-embedding-004)
 */
export const BOOK_CHUNK_COLLECTION = 'BookChunk';

export interface BookChunkSearchHit {
  content: string;
  language: string;
  chunkIndex: number;
  distance: number;
}

export interface BookChunkInsert {
  bookId: number;
  language: 'uz' | 'ru';
  chunkIndex: number;
  content: string;
  tokens: number;
  vector: number[];
}

export interface BookEmbeddingStats {
  languages: Record<string, { chunks: number; latest: Date | null }>;
  total: number;
}

export interface BookChunkRow {
  chunkIndex: number;
  language: string;
  text: string;
}

@Injectable()
export class WeaviateService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WeaviateService.name);
  private client: WeaviateClient | null = null;
  private connecting: Promise<WeaviateClient> | null = null;
  private collectionEnsured = false;

  // ─── lifecycle ─────────────────────────────────────────────

  async onModuleInit() {
    try {
      const client = await this.getClient();
      const ready = await client.isReady();
      this.logger.log(
        ready
          ? `Connected to Weaviate at ${this.describeTarget()}`
          : `Reached Weaviate at ${this.describeTarget()} but isReady=false`,
      );
      // Best-effort: ensure the BookChunk collection exists.
      // If it fails we don't crash the app — it'll retry on first use.
      try {
        await this.ensureBookChunkCollection();
      } catch (e: any) {
        this.logger.warn(
          `Could not ensure '${BOOK_CHUNK_COLLECTION}' collection on boot: ${e?.message ?? e}`,
        );
      }
    } catch (e: any) {
      this.logger.warn(
        `Weaviate not reachable on boot (${this.describeTarget()}): ${e?.message ?? e}. ` +
          `Service will retry on demand.`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.close();
      } catch {
        /* ignore */
      }
      this.client = null;
    }
  }

  // ─── connection ────────────────────────────────────────────

  async getClient(): Promise<WeaviateClient> {
    if (this.client) return this.client;
    if (this.connecting) return this.connecting;

    this.connecting = this.connect()
      .then((c) => {
        this.client = c;
        return c;
      })
      .finally(() => {
        this.connecting = null;
      });
    return this.connecting;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const client = await this.getClient();
      return await client.isReady();
    } catch {
      return false;
    }
  }

  async ping() {
    const target = this.describeTarget();
    try {
      const client = await this.getClient();
      const isReady = await client.isReady();
      const meta = await client.getMeta();
      let hasCollection = false;
      try {
        hasCollection = await client.collections.exists(BOOK_CHUNK_COLLECTION);
      } catch {
        hasCollection = false;
      }
      return {
        ok: true,
        ready: isReady,
        target,
        version: meta?.version,
        hostname: meta?.hostname,
        modules: meta?.modules ? Object.keys(meta.modules) : [],
        bookChunkCollection: hasCollection,
      };
    } catch (e: any) {
      return {
        ok: false,
        ready: false,
        target,
        error: e?.message ?? String(e),
      };
    }
  }

  // ─── BookChunk collection management ───────────────────────

  /**
   * Create the BookChunk collection if it doesn't exist. Idempotent.
   * Vectorizer is `none` because we compute vectors with Gemini and
   * pass them in explicitly.
   */
  async ensureBookChunkCollection(): Promise<void> {
    if (this.collectionEnsured) return;
    const client = await this.getClient();
    const exists = await client.collections.exists(BOOK_CHUNK_COLLECTION);
    if (exists) {
      this.collectionEnsured = true;
      return;
    }
    await client.collections.create({
      name: BOOK_CHUNK_COLLECTION,
      // Self-provided vectors (we compute them via Gemini)
      vectorizers: (weaviate as any).configure?.vectorizer?.none?.() ?? 'none',
      properties: [
        { name: 'bookId', dataType: 'int' as any },
        { name: 'language', dataType: 'text' as any },
        { name: 'chunkIndex', dataType: 'int' as any },
        { name: 'content', dataType: 'text' as any },
        { name: 'tokens', dataType: 'int' as any },
      ],
    });
    this.collectionEnsured = true;
    this.logger.log(`Created collection '${BOOK_CHUNK_COLLECTION}'`);
  }

  // ─── CRUD on chunks ────────────────────────────────────────

  /** Single insert. Use insertMany for bulk. */
  async insertChunk(chunk: BookChunkInsert): Promise<void> {
    await this.ensureBookChunkCollection();
    const client = await this.getClient();
    const col = client.collections.get(BOOK_CHUNK_COLLECTION);
    await col.data.insert({
      properties: {
        bookId: chunk.bookId,
        language: chunk.language,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        tokens: chunk.tokens,
      },
      vectors: chunk.vector,
    } as any);
  }

  /** Bulk insert (sequential — Gemini rate limits dominate, not Weaviate). */
  async insertChunks(chunks: BookChunkInsert[]): Promise<void> {
    for (const c of chunks) {
      // eslint-disable-next-line no-await-in-loop
      await this.insertChunk(c);
    }
  }

  /**
   * Vector search restricted to one book (and optionally one language).
   * Returns up to `limit` hits, ordered by cosine distance (ascending).
   */
  async searchChunks(params: {
    bookId: number;
    language?: 'uz' | 'ru' | null;
    queryVec: number[];
    limit?: number;
  }): Promise<BookChunkSearchHit[]> {
    await this.ensureBookChunkCollection();
    const client = await this.getClient();
    const col = client.collections.get(BOOK_CHUNK_COLLECTION);

    const filters = this.buildBookFilter(col, params.bookId, params.language);

    const result = await col.query.nearVector(params.queryVec, {
      limit: params.limit ?? 6,
      filters,
      returnProperties: ['content', 'language', 'chunkIndex'] as any,
      returnMetadata: ['distance'] as any,
    });

    return (result?.objects ?? []).map((o: any) => ({
      content: String(o?.properties?.content ?? ''),
      language: String(o?.properties?.language ?? ''),
      chunkIndex: Number(o?.properties?.chunkIndex ?? 0),
      distance: Number(o?.metadata?.distance ?? 0),
    }));
  }

  /**
   * Delete every chunk that belongs to a given bookId.
   * Returns the count of objects matched (best-effort — drivers differ).
   */
  async deleteByBook(bookId: number): Promise<number> {
    await this.ensureBookChunkCollection();
    const client = await this.getClient();
    const col = client.collections.get(BOOK_CHUNK_COLLECTION);
    const filter = col.filter.byProperty('bookId').equal(bookId);
    const res: any = await col.data.deleteMany(filter as any);
    return Number(res?.matches ?? res?.successful ?? res?.failed ? res?.matches ?? 0 : 0);
  }

  /**
   * Per-language stats for a book. Counts and most recent createdAt
   * (using Weaviate's implicit creationTime metadata).
   */
  async statsByBook(bookId: number): Promise<BookEmbeddingStats> {
    await this.ensureBookChunkCollection();
    const client = await this.getClient();
    const col = client.collections.get(BOOK_CHUNK_COLLECTION);

    const filter = col.filter.byProperty('bookId').equal(bookId);
    const result = await col.query.fetchObjects({
      filters: filter,
      limit: 10000,
      returnProperties: ['language'] as any,
      returnMetadata: ['creationTime'] as any,
    });

    const languages: Record<string, { chunks: number; latest: Date | null }> = {};
    for (const obj of result?.objects ?? []) {
      const lang = String((obj as any)?.properties?.language ?? 'unknown');
      const created: any = (obj as any)?.metadata?.creationTime;
      const createdDate =
        created instanceof Date
          ? created
          : created
            ? new Date(created)
            : null;
      const slot = languages[lang] ?? { chunks: 0, latest: null };
      slot.chunks += 1;
      if (
        createdDate &&
        (!slot.latest || createdDate.getTime() > slot.latest.getTime())
      ) {
        slot.latest = createdDate;
      }
      languages[lang] = slot;
    }

    const total = Object.values(languages).reduce(
      (sum, l) => sum + l.chunks,
      0,
    );
    return { languages, total };
  }

  /**
   * Full ordered chunk list for one book — used by the in-app reader / NotebookLM
   * citation jump-to. Returns chunks sorted by `chunkIndex` ascending.
   * Caller passes a window (offset/limit); we always read the whole book from
   * Weaviate (446 rows is cheap) and slice in memory because Weaviate's v3
   * `fetchObjects` doesn't expose `sort` reliably across patch versions.
   */
  async getChunksByBook(params: {
    bookId: number;
    offset?: number;
    limit?: number;
  }): Promise<{ chunks: BookChunkRow[]; total: number }> {
    await this.ensureBookChunkCollection();
    const client = await this.getClient();
    const col = client.collections.get(BOOK_CHUNK_COLLECTION);

    const filter = col.filter.byProperty('bookId').equal(params.bookId);
    const result = await col.query.fetchObjects({
      filters: filter,
      limit: 10000,
      returnProperties: ['content', 'language', 'chunkIndex'] as any,
    });

    const all: BookChunkRow[] = (result?.objects ?? []).map((o: any) => ({
      chunkIndex: Number(o?.properties?.chunkIndex ?? 0),
      language: String(o?.properties?.language ?? ''),
      text: String(o?.properties?.content ?? ''),
    }));
    all.sort((a, b) => a.chunkIndex - b.chunkIndex);

    const total = all.length;
    const offset = Math.max(0, params.offset ?? 0);
    const limit = Math.max(1, Math.min(500, params.limit ?? total));
    const window = all.slice(offset, offset + limit);
    return { chunks: window, total };
  }

  // ─── internals ─────────────────────────────────────────────

  /**
   * Build a (bookId [AND language]) filter using weaviate-client v3's
   * `Filters.and(...)` static combinator. `Filters` is a named export
   * — not a property of the default `weaviate` import — so the import
   * statement explicitly names it.
   */
  private buildBookFilter(
    col: any,
    bookId: number,
    language?: 'uz' | 'ru' | null,
  ): any {
    const byBook = col.filter.byProperty('bookId').equal(bookId);
    if (!language) return byBook;
    const byLang = col.filter.byProperty('language').equal(language);
    return Filters.and(byBook, byLang);
  }

  private async connect(): Promise<WeaviateClient> {
    const httpHost = process.env.WEAVIATE_HOST || 'localhost';
    const httpPort = Number(process.env.WEAVIATE_HTTP_PORT || 8080);
    const grpcHost = process.env.WEAVIATE_HOST || 'localhost';
    const grpcPort = Number(process.env.WEAVIATE_GRPC_PORT || 50051);
    const secure = process.env.WEAVIATE_SCHEME === 'https';
    const apiKey = process.env.WEAVIATE_API_KEY;

    if (!apiKey) {
      throw new InternalServerErrorException(
        'WEAVIATE_API_KEY is not set in env',
      );
    }

    return weaviate.connectToCustom({
      httpHost,
      httpPort,
      httpSecure: secure,
      grpcHost,
      grpcPort,
      grpcSecure: secure,
      authCredentials: new ApiKey(apiKey),
    });
  }

  private describeTarget(): string {
    const scheme = process.env.WEAVIATE_SCHEME || 'http';
    const host = process.env.WEAVIATE_HOST || 'localhost';
    const httpPort = process.env.WEAVIATE_HTTP_PORT || '8080';
    const grpcPort = process.env.WEAVIATE_GRPC_PORT || '50051';
    return `${scheme}://${host}:${httpPort} (gRPC :${grpcPort})`;
  }
}
