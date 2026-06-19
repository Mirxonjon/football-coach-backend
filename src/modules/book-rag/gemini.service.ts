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

  /**
   * Streaming chat completion via Gemini `streamGenerateContent?alt=sse`.
   * Yields incremental text deltas as they arrive. The final yielded value
   * carries the closing usage metadata (tokensIn/tokensOut) and finishReason.
   *
   * Consumer pattern:
   *   for await (const ev of gemini.chatStream({...})) {
   *     if (ev.type === 'delta') stream.write(ev.text);
   *     if (ev.type === 'end')   final = ev;
   *   }
   *
   * On a 4xx/5xx the first attempt is retried via fetchWithRetry. Errors
   * raised by the underlying stream after headers are sent surface as
   * thrown exceptions — callers should wrap iteration in try/catch and
   * emit an SSE `error` event to the client.
   */
  async *chatStream(params: {
    systemInstruction: string;
    history?: ChatTurn[];
    userMessage: string;
    temperature?: number;
    maxOutputTokens?: number;
  }): AsyncGenerator<
    | { type: 'delta'; text: string }
    | {
        type: 'end';
        finishReason: string;
        tokensIn?: number;
        tokensOut?: number;
      },
    void,
    void
  > {
    this.assertConfigured();
    const {
      systemInstruction,
      history = [],
      userMessage,
      temperature = 0.2,
      maxOutputTokens = 2048,
    } = params;

    const contents = [
      ...history.map((t) => ({
        role: t.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: t.content }],
      })),
      { role: 'user', parts: [{ text: userMessage }] },
    ];

    const url = `${BASE}/models/${this.chatModel}:streamGenerateContent?alt=sse`;
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
    if (!res.body) {
      throw new InternalServerErrorException(
        'Gemini stream returned no body',
      );
    }

    const reader = (res.body as any).getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let finishReason = '';
    let tokensIn: number | undefined;
    let tokensOut: number | undefined;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      // Gemini's SSE stream uses CRLF (\r\n) line endings, not LF.
      // Normalise here so the frame splitter on "\n\n" works.
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

      // SSE frames separated by blank line ("\n\n"). Each frame may have
      // multiple `data: ...` lines (per the spec we concatenate them with
      // a newline so multi-line JSON stays intact).
      let sepAt: number;
      while ((sepAt = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, sepAt);
        buffer = buffer.slice(sepAt + 2);
        const payload = frame
          .split('\n')
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5).trimStart())
          .join('\n');
        if (!payload || payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload);
          const cand = json?.candidates?.[0];
          const text: string =
            cand?.content?.parts
              ?.map((p: any) => p?.text ?? '')
              .join('') ?? '';
          if (text) yield { type: 'delta', text };
          if (cand?.finishReason) finishReason = cand.finishReason;
          if (json?.usageMetadata) {
            tokensIn = json.usageMetadata.promptTokenCount ?? tokensIn;
            tokensOut = json.usageMetadata.candidatesTokenCount ?? tokensOut;
          }
        } catch (e: any) {
          this.logger.warn(
            `Gemini stream frame parse failed: ${e?.message ?? e}`,
          );
        }
      }
    }

    yield { type: 'end', finishReason, tokensIn, tokensOut };
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
