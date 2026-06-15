import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  text: string;
  tokensIn?: number;
  tokensOut?: number;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey = process.env.GEMINI_API_KEY ?? '';
  private readonly embedModel = process.env.GEMINI_EMBED_MODEL ?? 'gemini-embedding-001';
  private readonly chatModel = process.env.GEMINI_CHAT_MODEL ?? 'gemini-flash-latest';
  private readonly embedDim = Number(process.env.GEMINI_EMBED_DIM ?? 768);
  private readonly throttleMs = Number(process.env.GEMINI_THROTTLE_MS ?? 0);
  private readonly maxRetries = Number(process.env.GEMINI_MAX_RETRIES ?? 5);
  private lastEmbedAt = 0;

  private assertConfigured() {
    if (!this.apiKey) {
      throw new InternalServerErrorException('GEMINI_API_KEY is not set');
    }
  }

  /**
   * Single-string embedding.
   * Returns a `GEMINI_EMBED_DIM`-dim vector (default 768) — matches the
   * Weaviate `BookChunk` collection. `gemini-embedding-001` supports 768 /
   * 1536 / 3072 via Matryoshka representation (`outputDimensionality`).
   *
   * Retries on 429 / 5xx with exponential backoff and respects the optional
   * `GEMINI_THROTTLE_MS` floor between successive calls.
   */
  async embed(text: string): Promise<number[]> {
    this.assertConfigured();
    await this.respectThrottle();
    const url = `${BASE}/models/${this.embedModel}:embedContent`;
    const body: Record<string, unknown> = {
      content: { parts: [{ text }] },
      outputDimensionality: this.embedDim,
      taskType: 'RETRIEVAL_DOCUMENT',
    };

    const res = await this.fetchWithRetry(url, body, 'embed');
    const data = (await res.json()) as { embedding?: { values: number[] } };
    const values = data?.embedding?.values;
    if (!Array.isArray(values) || values.length === 0) {
      throw new InternalServerErrorException('Gemini embed returned no vector');
    }
    return values;
  }

  /**
   * Embed multiple chunks. Falls back to sequential calls for compatibility
   * with the simple v1beta REST endpoint.
   */
  async embedMany(texts: string[]): Promise<number[][]> {
    const out: number[][] = [];
    for (const t of texts) {
      // eslint-disable-next-line no-await-in-loop
      out.push(await this.embed(t));
    }
    return out;
  }

  /**
   * Chat completion via Gemini generateContent.
   */
  async chat(params: {
    systemInstruction: string;
    history?: ChatTurn[];
    userMessage: string;
    temperature?: number;
    maxOutputTokens?: number;
  }): Promise<ChatResult> {
    this.assertConfigured();
    const { systemInstruction, history = [], userMessage, temperature = 0.2, maxOutputTokens = 800 } = params;

    const contents = [
      ...history.map((t) => ({
        role: t.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: t.content }],
      })),
      { role: 'user', parts: [{ text: userMessage }] },
    ];

    const url = `${BASE}/models/${this.chatModel}:generateContent`;
    // gemini-2.5-flash family enables "thinking" by default — those tokens
    // are counted against maxOutputTokens but never returned, which silently
    // truncates RAG answers. RAG doesn't need thinking; we disable it so
    // every token in the budget is spent on the visible reply.
    const body = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens,
        thinkingConfig: { thinkingBudget: 0 },
      },
    };

    const res = await this.fetchWithRetry(url, body, 'chat');
    const data = (await res.json()) as any;
    const candidate = data?.candidates?.[0];
    const text: string =
      candidate?.content?.parts?.map((p: any) => p?.text ?? '').join('') ?? '';
    const finishReason: string = candidate?.finishReason ?? '';
    const usage = data?.usageMetadata ?? {};
    if (finishReason && finishReason !== 'STOP') {
      this.logger.warn(
        `Gemini chat finishReason=${finishReason} tokensOut=${usage?.candidatesTokenCount ?? '?'} thoughts=${usage?.thoughtsTokenCount ?? 0} maxOutputTokens=${maxOutputTokens}`,
      );
    }
    if (process.env.GEMINI_LOG_RESPONSE === '1') {
      this.logger.debug(
        `Gemini chat raw response: ${JSON.stringify({
          finishReason,
          usage,
          textLength: text.length,
          textTail: text.slice(-200),
          parts: candidate?.content?.parts?.length ?? 0,
        })}`,
      );
    }
    return {
      text: (text || '').trim(),
      tokensIn: usage?.promptTokenCount,
      tokensOut: usage?.candidatesTokenCount,
    };
  }

  // ─── internals ─────────────────────────────────────────────

  private async respectThrottle() {
    if (this.throttleMs <= 0) return;
    const wait = this.throttleMs - (Date.now() - this.lastEmbedAt);
    if (wait > 0) await this.sleep(wait);
    this.lastEmbedAt = Date.now();
  }

  private sleep(ms: number) {
    return new Promise<void>((r) => setTimeout(r, ms));
  }

  private parseRetryDelayMs(payload: string): number | null {
    try {
      const parsed = JSON.parse(payload);
      const details: any[] = parsed?.error?.details ?? [];
      for (const d of details) {
        const t: string = String(d?.['@type'] ?? '');
        const v: string | undefined = d?.retryDelay;
        if (t.endsWith('RetryInfo') && typeof v === 'string') {
          const m = v.match(/^([\d.]+)s$/);
          if (m) return Math.round(Number(m[1]) * 1000);
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  private async fetchWithRetry(
    url: string,
    body: unknown,
    label: 'embed' | 'chat',
  ): Promise<Response> {
    let attempt = 0;
    while (true) {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
      });
      if (res.ok) return res;

      const text = await res.text();
      const retriable = res.status === 429 || res.status >= 500;
      if (!retriable || attempt >= this.maxRetries) {
        this.logger.error(
          `Gemini ${label} failed ${res.status} (attempt ${attempt + 1}): ${text.slice(0, 300)}`,
        );
        throw new InternalServerErrorException(`Gemini ${label} failed`);
      }

      const hinted = this.parseRetryDelayMs(text);
      const backoff = hinted ?? Math.min(60_000, 1_000 * Math.pow(2, attempt));
      const jitter = Math.floor(Math.random() * 250);
      const wait = backoff + jitter;
      this.logger.warn(
        `Gemini ${label} ${res.status} — retrying in ${wait}ms (attempt ${attempt + 1}/${this.maxRetries})`,
      );
      await this.sleep(wait);
      attempt += 1;
    }
  }
}
