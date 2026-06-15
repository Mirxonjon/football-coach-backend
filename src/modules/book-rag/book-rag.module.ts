import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BookRagService } from './book-rag.service';
import { BookRagController } from './book-rag.controller';
import { BookRagAdminController } from './book-rag.admin.controller';
import { BookRagSystemController } from './book-rag.system.controller';
import { BookChunksController } from './book-chunks.controller';
import { GeminiService } from './gemini.service';
import { ChunkingService } from './chunking.service';
import { PdfExtractorService } from './pdf-extractor.service';
import { WeaviateService } from './weaviate.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    BookRagController,
    BookRagAdminController,
    BookRagSystemController,
    BookChunksController,
  ],
  providers: [
    BookRagService,
    GeminiService,
    ChunkingService,
    PdfExtractorService,
    // Weaviate ulanish — hozircha faqat health check/ping uchun ishlatiladi.
    // Chat flow keyinroq pgvector dan Weaviate ga ko'chiriladi.
    WeaviateService,
  ],
  exports: [BookRagService, WeaviateService],
})
export class BookRagModule {}
