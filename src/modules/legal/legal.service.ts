import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { LegalDocumentType, Language, Prisma } from '@prisma/client';
import { CreateLegalDocumentDto } from '@/types/legal/create-legal-document.dto';
import { UpdateLegalDocumentDto } from '@/types/legal/update-legal-document.dto';
import { FilterLegalDocumentDto } from '@/types/legal/filter-legal-document.dto';
import { CreateLegalTranslationDto } from '@/types/legal/create-legal-translation.dto';
import { UpdateLegalTranslationDto } from '@/types/legal/update-legal-translation.dto';

@Injectable()
export class LegalService {
  constructor(private prisma: PrismaService) {}

  async createDocument(dto: CreateLegalDocumentDto) {
    const created = await this.prisma.legalDocument.create({
      data: {
        type: dto.type,
        version: dto.version,
        isActive: dto.isActive ?? true,
        translations: dto.translations?.length
          ? {
              create: dto.translations.map((t) => ({
                language: t.language,
                title: t.title,
                content: t.content,
              })),
            }
          : undefined,
      },
      include: { translations: true },
    });
    return created;
  }

  async updateDocument(id: number, dto: UpdateLegalDocumentDto) {
    await this.ensureDocument(id);
    const updated = await this.prisma.legalDocument.update({
      where: { id },
      data: {
        type: dto.type,
        version: dto.version,
        isActive: dto.isActive,
      },
      include: { translations: true },
    });
    return updated;
  }

  async deleteDocument(id: number) {
    await this.ensureDocument(id);
    await this.prisma.legalDocument.delete({ where: { id } });
    return { success: true };
  }

  async listDocuments(filter: FilterLegalDocumentDto) {
    const {
      type,
      isActive,
      version,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filter;

    const sortable = new Set(['createdAt', 'version', 'id']);
    const orderField = sortable.has(sortBy) ? sortBy : 'createdAt';
    const orderDir: Prisma.SortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Prisma.LegalDocumentWhereInput = {};
    if (type) where.type = type;
    if (typeof isActive === 'boolean') where.isActive = isActive;
    if (version) where.version = { contains: version, mode: 'insensitive' };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.legalDocument.findMany({
        where,
        include: { translations: true },
        orderBy: { [orderField]: orderDir },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.legalDocument.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async createTranslation(documentId: number, dto: CreateLegalTranslationDto) {
    await this.ensureDocument(documentId);
    const created = await this.prisma.legalTranslation.create({
      data: {
        documentId,
        language: dto.language,
        title: dto.title,
        content: dto.content,
      },
    });
    return created;
  }

  async updateTranslation(id: number, dto: UpdateLegalTranslationDto) {
    await this.ensureTranslation(id);
    const updated = await this.prisma.legalTranslation.update({
      where: { id },
      data: {
        language: dto.language,
        title: dto.title,
        content: dto.content,
      },
    });
    return updated;
  }

  async deleteTranslation(id: number) {
    await this.ensureTranslation(id);
    await this.prisma.legalTranslation.delete({ where: { id } });
    return { success: true };
  }

  async publicGet(type: LegalDocumentType, lang: Language) {
    const doc = await this.prisma.legalDocument.findFirst({
      where: { type, isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        translations: {
          where: { language: lang },
          select: { language: true, title: true, content: true },
        },
      },
    });
    if (!doc || !doc.translations?.length) {
      throw new NotFoundException('Document not found for requested language');
    }
    const t = doc.translations[0];
    return {
      type: doc.type,
      version: doc.version,
      language: t.language,
      title: t.title,
      content: t.content,
    };
  }

  private async ensureDocument(id: number) {
    const exists = await this.prisma.legalDocument.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Legal document not found');
  }

  private async ensureTranslation(id: number) {
    const exists = await this.prisma.legalTranslation.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Legal translation not found');
  }
}
