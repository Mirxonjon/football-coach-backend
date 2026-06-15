import { Injectable, Logger, BadRequestException } from '@nestjs/common';
// pdf-parse v2: class-based API — `new PDFParse({ data }).getText()`
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse') as {
  PDFParse: new (opts: { data: Buffer | Uint8Array }) => {
    getText(): Promise<{ text: string; pages?: unknown[]; total?: number }>;
    destroy?: () => Promise<void>;
  };
};

@Injectable()
export class PdfExtractorService {
  private readonly logger = new Logger(PdfExtractorService.name);

  /**
   * Download a PDF (or plain text file) from a public URL and return its
   * extracted text content. Both R2 public URLs and external URLs work.
   * If the file looks like .txt/.md, we return it as-is.
   */
  async extractText(fileUrl: string): Promise<{ text: string; numPages: number }> {
    if (!fileUrl) {
      throw new BadRequestException('fileUrl is required');
    }
    const res = await fetch(fileUrl);
    if (!res.ok) {
      throw new BadRequestException(
        `Failed to download file (${res.status}) from ${fileUrl}`,
      );
    }
    const arrayBuf = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuf);

    // Detect text file by extension/content-type
    const ct = res.headers.get('content-type') ?? '';
    const looksText =
      /\.(txt|md|markdown)(\?|$)/i.test(fileUrl) ||
      ct.startsWith('text/');
    if (looksText) {
      return { text: buf.toString('utf8'), numPages: 1 };
    }

    const parser = new PDFParse({ data: buf });
    try {
      const parsed = await parser.getText();
      const numPages =
        typeof parsed.total === 'number'
          ? parsed.total
          : Array.isArray(parsed.pages)
            ? parsed.pages.length
            : 0;
      return { text: parsed.text ?? '', numPages };
    } catch (e: any) {
      this.logger.error(`pdf-parse failed: ${e?.message}`);
      throw new BadRequestException('Could not parse PDF file');
    } finally {
      try {
        await parser.destroy?.();
      } catch {
        /* ignore */
      }
    }
  }
}
