import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LegalService } from './legal.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { CreateLegalDocumentDto } from '@/types/legal/create-legal-document.dto';
import { UpdateLegalDocumentDto } from '@/types/legal/update-legal-document.dto';
import { FilterLegalDocumentDto } from '@/types/legal/filter-legal-document.dto';
import { CreateLegalTranslationDto } from '@/types/legal/create-legal-translation.dto';
import { UpdateLegalTranslationDto } from '@/types/legal/update-legal-translation.dto';
import { Language, LegalDocumentType } from '@prisma/client';

@ApiTags('Legal')
@Controller('legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) { }

  // ADMIN — Documents
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create legal document (ADMIN)' })
  createDocument(@Body() dto: CreateLegalDocumentDto) {
    return this.legalService.createDocument(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update legal document (ADMIN)' })
  updateDocument(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLegalDocumentDto) {
    return this.legalService.updateDocument(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete legal document (ADMIN)' })
  deleteDocument(@Param('id', ParseIntPipe) id: number) {
    return this.legalService.deleteDocument(id);
  }

  @Get()
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN')
  // @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List legal documents (ADMIN)' })
  @ApiQuery({ name: 'type', required: false, enum: ['TERMS', 'PRIVACY'] })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'version', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  listDocuments(@Query() query: FilterLegalDocumentDto) {
    return this.legalService.listDocuments(query);
  }

  // ADMIN — Translations
  @Post(':id/translation')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create translation for a document (ADMIN)' })
  createTranslation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateLegalTranslationDto,
  ) {
    return this.legalService.createTranslation(id, dto);
  }

  @Patch('translation/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update translation (ADMIN)' })
  updateTranslation(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLegalTranslationDto) {
    return this.legalService.updateTranslation(id, dto);
  }

  @Delete('translation/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete translation (ADMIN)' })
  deleteTranslation(@Param('id', ParseIntPipe) id: number) {
    return this.legalService.deleteTranslation(id);
  }

  // PUBLIC
  @Public()
  @Get('public')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get public legal document by type and language' })
  @ApiQuery({ name: 'type', required: true, enum: ['TERMS', 'PRIVACY'] })
  @ApiQuery({ name: 'lang', required: true, enum: ['UZ', 'RU', 'EN'] })
  publicGet(@Query('type') type: LegalDocumentType, @Query('lang') lang: Language) {
    return this.legalService.publicGet(type, lang);
  }
}
