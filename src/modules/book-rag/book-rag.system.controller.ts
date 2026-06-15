import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WeaviateService } from './weaviate.service';

@ApiTags('Book RAG Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/book-rag')
export class BookRagSystemController {
  constructor(private readonly weaviate: WeaviateService) {}

  @Get('weaviate/ping')
  @Roles('ADMIN')
  @ApiOperation({
    summary:
      'Check that the backend can reach the Weaviate instance. Returns target, readiness, and meta (version, modules).',
  })
  weaviatePing() {
    return this.weaviate.ping();
  }
}
