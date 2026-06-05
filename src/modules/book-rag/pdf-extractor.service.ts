import { Injectable, Logger, BadRequestException } from '@nestjs/common';
// pdf-parse: PDF buffer → plain text
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (data: Buffer) => Promise<{ text: string; numpages: number }> = require('pdf-parse');

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

    try {
      const parsed = await pdfParse(buf);
      return { text: parsed.text ?? '', numPages: parsed.numpages ?? 0 };
    } catch (e: any) {
      this.logger.error(`pdf-parse failed: ${e?.message}`);
      throw new BadRequestException('Could not parse PDF file');
    }
  }
}
