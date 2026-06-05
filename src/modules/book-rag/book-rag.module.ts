import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BookRagService } from './book-rag.service';
import { BookRagController } from './book-rag.controller';
import { BookRagAdminController } from './book-rag.admin.controller';
import { GeminiService } from './gemini.service';
import { ChunkingService } from './chunking.service';
import { PdfExtractorService } from './pdf-extractor.service';

@Module({
  imports: [PrismaModule],
  controllers: [BookRagController, BookRagAdminController],
  providers: [
    BookRagService,
    GeminiService,
    ChunkingService,
    PdfExtractorService,
  ],
  exports: [BookRagService],
})
export class BookRagModule {}
