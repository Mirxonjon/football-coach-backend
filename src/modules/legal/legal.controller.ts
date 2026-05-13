import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { LegalDocumentType } from '@prisma/client';
import { Request } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { LegalService } from './legal.service';
import { CreateLegalDocumentDto } from '@/types/legal/create-legal-document.dto';
import { UpdateLegalDocumentDto } from '@/types/legal/update-legal-document.dto';
import { AcceptConsentDto } from '@/types/legal/accept-consent.dto';

@ApiTags('Legal')
@Controller()
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  // ─── Public — used by web footer & mobile consent screen ─────────

  @Public()
  @Get('legal/documents')
  @ApiOperation({
    summary:
      'List the active version of every legal document type (privacy, terms, offer, requisites). One row per type.',
  })
  listActive() {
    return this.legalService.listActive();
  }

  @Public()
  @Get('legal/documents/:type')
  @ApiOperation({
    summary:
      'Get the full content of the active document for a given type.',
  })
  getActiveByType(
    @Param('type', new ParseEnumPipe(LegalDocumentType))
    type: LegalDocumentType,
  ) {
    return this.legalService.getActiveByType(type);
  }

  // ─── User — consent flow (mobile app uses these) ─────────────────

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me/consents')
  @ApiOperation({ summary: 'Documents the current user has accepted' })
  myConsents(@Req() req: Request) {
    const userId = (req as any).user.sub as number;
    return this.legalService.listMyConsents(userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me/consents/pending')
  @ApiOperation({
    summary:
      'Documents the user still needs to accept. Empty array → fully consented. Mobile app shows the consent screen iff this is non-empty.',
  })
  pendingConsents(@Req() req: Request) {
    const userId = (req as any).user.sub as number;
    return this.legalService.listPendingConsents(userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('me/consents')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Accept one or more documents in a single call. Idempotent — re-accepting the same document is a no-op.',
  })
  acceptConsents(@Req() req: Request, @Body() dto: AcceptConsentDto) {
    const userId = (req as any).user.sub as number;
    return this.legalService.acceptConsents(userId, dto.documentIds, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ─── Admin CRUD ──────────────────────────────────────────────────

  @ApiBearerAuth()
  @Roles('ADMIN')
  @Get('admin/legal/documents')
  @ApiOperation({ summary: 'Full version history of every legal document' })
  @ApiQuery({ name: 'type', required: false, enum: LegalDocumentType })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listAll(
    @Query('type') type?: LegalDocumentType,
    @Query('isActive', new ParseBoolPipe({ optional: true })) isActive?: boolean,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.legalService.listAll({ type, isActive, page, limit });
  }

  @ApiBearerAuth()
  @Roles('ADMIN')
  @Post('admin/legal/documents')
  @ApiOperation({
    summary:
      'Publish a new version. If isActive=true (default), previous active version of this type is auto-deactivated and version is auto-incremented.',
  })
  create(@Body() dto: CreateLegalDocumentDto) {
    return this.legalService.createDocument(dto);
  }

  @ApiBearerAuth()
  @Roles('ADMIN')
  @Patch('admin/legal/documents/:id')
  @ApiOperation({ summary: 'Edit an existing document (does not bump version)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLegalDocumentDto,
  ) {
    return this.legalService.updateDocument(id, dto);
  }

  @ApiBearerAuth()
  @Roles('ADMIN')
  @Delete('admin/legal/documents/:id')
  @ApiOperation({ summary: 'Delete a document (must be inactive first)' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.legalService.deleteDocument(id);
  }
}
