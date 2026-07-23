import { BadRequestException, Injectable } from '@nestjs/common';
import { PortalScopeService } from '../../common/portal-scope.service';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../documents/cloudinary.service';
import { LocalStorageService } from '../../documents/local-storage.service';
import { S3Service } from '../../documents/s3.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

type DocumentProvider = 'local' | 'cloudinary' | 's3';

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

  async list(actor?: { userId?: string; role?: string }) {
    const where =
      this.portal.isClientRole(actor?.role) && actor?.userId
        ? { case: { clientId: await this.portal.requireLinkedClientId(actor.userId) } }
        : {};

    return this.prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        provider: true,
        caseId: true,
        createdAt: true,
        case: {
          select: { id: true, title: true },
        },
      },
    });
  }

  async uploadAndCreateRecord(
    input: {
      filePath: string;
      originalName: string;
      provider?: DocumentProvider;
      caseId?: string;
    },
    actor?: { userId?: string; role?: string },
  ) {
    const provider: DocumentProvider = input.provider || 'local';
    const caseId = input.caseId?.trim() || undefined;
    const actorUserId = actor?.userId;

    if (provider !== 'local' && provider !== 'cloudinary' && provider !== 's3') {
      throw new BadRequestException('provider must be local, cloudinary, or s3');
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

    const doc = await this.prisma.document.create({
      data: {
        filename: input.originalName,
        url,
        provider,
        providerKey,
        case: caseId ? { connect: { id: caseId } } : undefined,
      },
    });

    await this.audit.logCreate('Document', doc.id, actorUserId, {
      filename: doc.filename,
      provider: doc.provider,
      caseId: doc.caseId,
    });

    await this.notifications.notifyStaff(
      {
        title: `Document uploaded: ${doc.filename}`,
        body: doc.caseId ? 'Linked to a case.' : 'No case linked.',
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
