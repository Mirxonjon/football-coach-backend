import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LegalDocumentType, Prisma } from '@prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateLegalDocumentDto } from '@/types/legal/create-legal-document.dto';
import { UpdateLegalDocumentDto } from '@/types/legal/update-legal-document.dto';

@Injectable()
export class LegalService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Public ────────────────────────────────────────────────────────

  /**
   * Active document for every type — used by the footer "Документы"
   * section and by the mobile consent screen.
   */
  async listActive() {
    return this.prisma.legalDocument.findMany({
      where: { isActive: true },
      orderBy: { type: 'asc' },
    });
  }

  /** Latest active document of a given type. */
  async getActiveByType(type: LegalDocumentType) {
    const doc = await this.prisma.legalDocument.findFirst({
      where: { type, isActive: true },
      orderBy: { version: 'desc' },
    });
    if (!doc) {
      throw new NotFoundException(`No active document for type ${type}`);
    }
    return doc;
  }

  // ─── Admin ─────────────────────────────────────────────────────────

  /**
   * Create a new version. If `isActive=true` (default), the previous
   * active document of this type is deactivated and the new row gets
   * version = previous.version + 1. This way the table keeps a full
   * history of every published version.
   */
  async createDocument(dto: CreateLegalDocumentDto) {
    const isActive = dto.isActive ?? true;

    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.legalDocument.findFirst({
        where: { type: dto.type },
        orderBy: { version: 'desc' },
      });
      const nextVersion = previous ? previous.version + 1 : 1;

      if (isActive && previous?.isActive) {
        await tx.legalDocument.update({
          where: { id: previous.id },
          data: { isActive: false },
        });
      }

      return tx.legalDocument.create({
        data: {
          type: dto.type,
          version: nextVersion,
          titleUz: dto.titleUz,
          titleRu: dto.titleRu,
          contentUz: dto.contentUz,
          contentRu: dto.contentRu,
          isActive,
        },
      });
    });
  }

  /**
   * Edit a draft (or fix typo in published doc) — does NOT bump version
   * or deactivate siblings. Use createDocument for a real new version.
   */
  async updateDocument(id: number, dto: UpdateLegalDocumentDto) {
    await this.ensureDocument(id);
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.legalDocument.findUniqueOrThrow({ where: { id } });

      // If admin is activating this row, deactivate every other active
      // doc of the same type to preserve the "one active per type" invariant.
      if (dto.isActive === true && !current.isActive) {
        await tx.legalDocument.updateMany({
          where: { type: current.type, isActive: true, NOT: { id } },
          data: { isActive: false },
        });
      }

      return tx.legalDocument.update({
        where: { id },
        data: {
          titleUz: dto.titleUz,
          titleRu: dto.titleRu,
          contentUz: dto.contentUz,
          contentRu: dto.contentRu,
          isActive: dto.isActive,
        },
      });
    });
  }

  async deleteDocument(id: number) {
    const doc = await this.ensureDocument(id);
    if (doc.isActive) {
      throw new ConflictException(
        'Cannot delete an active document. Deactivate it first or publish a new version.',
      );
    }
    await this.prisma.legalDocument.delete({ where: { id } });
    return { success: true };
  }

  /** Admin list — full history of every version, paginated. */
  async listAll(params: {
    type?: LegalDocumentType;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const where: Prisma.LegalDocumentWhereInput = {};
    if (params.type) where.type = params.type;
    if (typeof params.isActive === 'boolean') where.isActive = params.isActive;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.legalDocument.findMany({
        where,
        orderBy: [{ type: 'asc' }, { version: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.legalDocument.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  // ─── Consent ───────────────────────────────────────────────────────

  /** Documents the user has already accepted (with the doc payload). */
  async listMyConsents(userId: number) {
    return this.prisma.userConsent.findMany({
      where: { userId },
      orderBy: { acceptedAt: 'desc' },
      include: { document: true },
    });
  }

  /**
   * The "checklist" the mobile app shows on first launch / after a
   * new version is published. Returns every active document the user
   * has NOT yet accepted. Empty array → user is fully up-to-date.
   */
  async listPendingConsents(userId: number) {
    const activeDocs = await this.prisma.legalDocument.findMany({
      where: { isActive: true },
      orderBy: { type: 'asc' },
    });
    if (activeDocs.length === 0) return [];

    const accepted = await this.prisma.userConsent.findMany({
      where: { userId, documentId: { in: activeDocs.map((d) => d.id) } },
      select: { documentId: true },
    });
    const acceptedSet = new Set(accepted.map((c) => c.documentId));
    return activeDocs.filter((d) => !acceptedSet.has(d.id));
  }

  /** Accept one or more documents in a single call (idempotent). */
  async acceptConsents(
    userId: number,
    documentIds: number[],
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const docs = await this.prisma.legalDocument.findMany({
      where: { id: { in: documentIds } },
      select: { id: true, isActive: true },
    });
    if (docs.length !== documentIds.length) {
      throw new NotFoundException('One or more documents do not exist');
    }
    const inactive = docs.filter((d) => !d.isActive).map((d) => d.id);
    if (inactive.length > 0) {
      throw new ConflictException(
        `Cannot accept inactive document(s): ${inactive.join(', ')}`,
      );
    }

    // upsert per document — re-accepting is a no-op
    await this.prisma.$transaction(
      documentIds.map((documentId) =>
        this.prisma.userConsent.upsert({
          where: { userId_documentId: { userId, documentId } },
          update: {},
          create: {
            userId,
            documentId,
            ipAddress: meta.ipAddress?.slice(0, 45) ?? null,
            userAgent: meta.userAgent?.slice(0, 500) ?? null,
          },
        }),
      ),
    );

    return this.listMyConsents(userId);
  }

  // ─── Helpers ───────────────────────────────────────────────────────

  private async ensureDocument(id: number) {
    const doc = await this.prisma.legalDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Legal document not found');
    return doc;
  }
}
