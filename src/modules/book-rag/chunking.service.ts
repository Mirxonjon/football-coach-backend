import { Injectable } from '@nestjs/common';

export interface Chunk {
  index: number;
  text: string;
  approxTokens: number;
}

/**
 * Token-aware text chunker. We approximate 1 token ≈ 4 characters
 * (English/Russian average). For UZ/RU mixed text this is good enough
 * for retrieval-level chunking.
 *
 * Default: ~500 tokens (≈2000 chars) per chunk, 50 token overlap.
 */
@Injectable()
export class ChunkingService {
  private readonly TARGET_TOKENS = 500;
  private readonly OVERLAP_TOKENS = 50;
  private readonly CHARS_PER_TOKEN = 4;

  chunk(text: string): Chunk[] {
    const clean = this.normalize(text);
    if (!clean) return [];

    const targetChars = this.TARGET_TOKENS * this.CHARS_PER_TOKEN;
    const overlapChars = this.OVERLAP_TOKENS * this.CHARS_PER_TOKEN;

    const chunks: Chunk[] = [];
    let pos = 0;
    let index = 0;
    while (pos < clean.length) {
      let end = Math.min(clean.length, pos + targetChars);
      // Prefer breaking at paragraph or sentence boundary near the end.
      if (end < clean.length) {
        const slice = clean.slice(pos, end);
        const lastBreak = Math.max(
          slice.lastIndexOf('\n\n'),
          slice.lastIndexOf('. '),
          slice.lastIndexOf('! '),
          slice.lastIndexOf('? '),
        );
        if (lastBreak > targetChars * 0.5) end = pos + lastBreak + 1;
      }
      const piece = clean.slice(pos, end).trim();
      if (piece.length > 0) {
        chunks.push({
          index: index++,
          text: piece,
          approxTokens: Math.ceil(piece.length / this.CHARS_PER_TOKEN),
        });
      }
      if (end >= clean.length) break;
      pos = Math.max(end - overlapChars, pos + 1);
    }
    return chunks;
  }

  private normalize(text: string): string {
    return text
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }
}
