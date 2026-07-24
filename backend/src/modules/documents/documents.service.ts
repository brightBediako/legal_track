import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PortalScopeService } from '../../common/portal-scope.service';
import { PrismaService } from '../../database/prisma.service';
import { parseDocumentCategory } from '../../documents/document-categories';
import { CloudinaryService } from '../../documents/cloudinary.service';
import { LocalStorageService } from '../../documents/local-storage.service';
import { S3Service } from '../../documents/s3.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

type DocumentProvider = 'local' | 'cloudinary' | 's3';

const documentListSelect = {
  id: true,
  filename: true,
  provider: true,
  caseId: true,
  category: true,
  version: true,
  isLatest: true,
  rootDocumentId: true,
  createdAt: true,
  case: {
    select: { id: true, title: true },
  },
} as const;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly localStorage: LocalStorageService,
    private readonly cloudinary: CloudinaryService,
    private readonly s3: S3Service,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly portal: PortalScopeService,
  ) {}

  async list(
    query?: { caseId?: string; category?: string; latestOnly?: string },
    actor?: { userId?: string; role?: string },
  ) {
    const where: Prisma.DocumentWhereInput = {};

    const scoped = await this.portal.documentWhereForActor(actor);
    if (scoped) Object.assign(where, scoped);

    const caseId = query?.caseId?.trim();
    if (caseId) {
      await this.portal.assertCaseAccess({
        userId: actor?.userId ?? '',
        role: actor?.role,
        caseId,
      });
      where.caseId = caseId;
    }

    if (query?.category?.trim()) {
      where.category = parseDocumentCategory(query.category);
    }

    const latestOnly = query?.latestOnly !== '0' && query?.latestOnly !== 'false';
    if (latestOnly) {
      where.isLatest = true;
    }

    return this.prisma.document.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      select: documentListSelect,
    });
  }

  async listVersions(documentId: string, actor?: { userId?: string; role?: string }) {
    await this.portal.assertDocumentAccess({
      userId: actor?.userId ?? '',
      role: actor?.role,
      documentId,
    });

    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, rootDocumentId: true },
    });
    if (!doc) throw new NotFoundException('document not found');

    const rootId = doc.rootDocumentId ?? doc.id;

    return this.prisma.document.findMany({
      where: {
        OR: [{ id: rootId }, { rootDocumentId: rootId }],
      },
      orderBy: { version: 'desc' },
      select: documentListSelect,
    });
  }

  async updateCategory(
    id: string,
    input: { category?: string },
    actor?: { userId?: string; role?: string },
  ) {
    await this.portal.assertDocumentAccess({
      userId: actor?.userId ?? '',
      role: actor?.role,
      documentId: id,
    });

    const existing = await this.prisma.document.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('document not found');

    if (input.category === undefined) {
      return this.prisma.document.findUnique({
        where: { id },
        select: documentListSelect,
      });
    }

    const category = parseDocumentCategory(input.category);
    const updated = await this.prisma.document.update({
      where: { id },
      data: { category },
      select: documentListSelect,
    });

    await this.audit.logUpdate('Document', id, actor?.userId, {
      category: { from: existing.category, to: category },
    });

    return updated;
  }

  async uploadAndCreateRecord(
    input: {
      filePath: string;
      originalName: string;
      provider?: DocumentProvider;
      caseId?: string;
      category?: string;
      replacesDocumentId?: string;
    },
    actor?: { userId?: string; role?: string },
  ) {
    const provider: DocumentProvider = input.provider || 'local';
    let caseId = input.caseId?.trim() || undefined;
    let category = parseDocumentCategory(input.category);
    const actorUserId = actor?.userId;
    const replacesDocumentId = input.replacesDocumentId?.trim() || undefined;

    if (provider !== 'local' && provider !== 'cloudinary' && provider !== 's3') {
      throw new BadRequestException('provider must be local, cloudinary, or s3');
    }

    let version = 1;
    let rootDocumentId: string | undefined;
    let previousLatestId: string | undefined;

    if (replacesDocumentId) {
      await this.portal.assertDocumentAccess({
        userId: actorUserId ?? '',
        role: actor?.role,
        documentId: replacesDocumentId,
      });

      const previous = await this.prisma.document.findUnique({
        where: { id: replacesDocumentId },
      });
      if (!previous) throw new NotFoundException('document to replace not found');

      const rootId = previous.rootDocumentId ?? previous.id;
      rootDocumentId = rootId;
      caseId = previous.caseId ?? caseId;
      if (input.category === undefined) {
        category = parseDocumentCategory(previous.category);
      }

      const aggregate = await this.prisma.document.aggregate({
        where: {
          OR: [{ id: rootId }, { rootDocumentId: rootId }],
        },
        _max: { version: true },
      });
      version = (aggregate._max.version ?? previous.version) + 1;

      const latest = await this.prisma.document.findFirst({
        where: {
          isLatest: true,
          OR: [{ id: rootId }, { rootDocumentId: rootId }],
        },
        select: { id: true },
      });
      previousLatestId = latest?.id;
    }

    if (this.portal.isClientRole(actor?.role)) {
      if (!actorUserId) throw new BadRequestException('unauthorized');
      if (!caseId) {
        throw new BadRequestException('clients must upload documents to one of their cases');
      }
      await this.portal.assertCaseAccess({
        userId: actorUserId,
        role: actor?.role,
        caseId,
      });
    } else if (this.portal.isLawyerRole(actor?.role)) {
      if (!actorUserId) throw new BadRequestException('unauthorized');
      if (!caseId) {
        throw new BadRequestException('lawyers must upload documents to an assigned case');
      }
      await this.portal.assertCaseAccess({
        userId: actorUserId,
        role: actor?.role,
        caseId,
      });
    } else if (caseId) {
      const matter = await this.prisma.case.findUnique({
        where: { id: caseId },
        select: { id: true },
      });
      if (!matter) throw new BadRequestException('case not found');
    }

    let url: string;
    let providerKey: string | undefined;

    if (provider === 'local') {
      const res = await this.localStorage.storeLocalFile(input.filePath, input.originalName);
      url = res.url;
      providerKey = res.key;
    } else if (provider === 'cloudinary') {
      const res = await this.cloudinary.uploadLocalFile(input.filePath, 'documents');
      url = res.secure_url || res.url;
      providerKey = res.public_id;
    } else {
      const key = `documents/${Date.now()}-${input.originalName}`;
      const res = await this.s3.uploadLocalFile(input.filePath, key);
      url = res.url;
      providerKey = res.key;
    }

    const doc = await this.prisma.$transaction(async (tx) => {
      if (previousLatestId) {
        await tx.document.update({
          where: { id: previousLatestId },
          data: { isLatest: false },
        });
      }

      return tx.document.create({
        data: {
          filename: input.originalName,
          url,
          provider,
          providerKey,
          category,
          version,
          isLatest: true,
          case: caseId ? { connect: { id: caseId } } : undefined,
          rootDocument: rootDocumentId ? { connect: { id: rootDocumentId } } : undefined,
        },
        select: documentListSelect,
      });
    });

    await this.audit.logCreate('Document', doc.id, actorUserId, {
      filename: doc.filename,
      provider: doc.provider,
      caseId: doc.caseId,
      category: doc.category,
      version: doc.version,
      replacesDocumentId,
    });

    await this.notifications.notifyStaff(
      {
        title: `Document uploaded: ${doc.filename}`,
        body: replacesDocumentId
          ? `New version v${doc.version} (${doc.category}).`
          : doc.caseId
            ? `Linked to a case (${doc.category}).`
            : `No case linked (${doc.category}).`,
        type: 'document',
        entity: 'Document',
        entityId: doc.id,
        href: doc.caseId ? `/cases/${doc.caseId}` : '/documents',
      },
      { excludeUserId: actorUserId },
    );

    return doc;
  }
}
