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
  private readonly embedModel = process.env.GEMINI_EMBED_MODEL ?? 'text-embedding-004';
  private readonly chatModel = process.env.GEMINI_CHAT_MODEL ?? 'gemini-flash-latest';

  private assertConfigured() {
    if (!this.apiKey) {
      throw new InternalServerErrorException('GEMINI_API_KEY is not set');
    }
  }

  /**
   * Single-string embedding.
   * Returns 768-dim vector (text-embedding-004).
   */
  async embed(text: string): Promise<number[]> {
    this.assertConfigured();
    const url = `${BASE}/models/${this.embedModel}:embedContent`;
    const body = { content: { parts: [{ text }] } };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const msg = await res.text();
      this.logger.error(`Gemini embed failed ${res.status}: ${msg.slice(0, 300)}`);
      throw new InternalServerErrorException('Gemini embed failed');
    }
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
    const body = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: { temperature, maxOutputTokens },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const msg = await res.text();
      this.logger.error(`Gemini chat failed ${res.status}: ${msg.slice(0, 300)}`);
      throw new InternalServerErrorException('Gemini chat failed');
    }
    const data = (await res.json()) as any;
    const text: string =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? '').join('') ?? '';
    const usage = data?.usageMetadata ?? {};
    return {
      text: (text || '').trim(),
      tokensIn: usage?.promptTokenCount,
      tokensOut: usage?.candidatesTokenCount,
    };
  }
}
