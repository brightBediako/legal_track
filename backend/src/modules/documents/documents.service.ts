import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../documents/cloudinary.service';
import { S3Service } from '../../documents/s3.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly s3: S3Service,
    private readonly audit: AuditService,
  ) {}

  async list() {
    return this.prisma.document.findMany({
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
      provider?: 'cloudinary' | 's3';
      caseId?: string;
    },
    actorUserId?: string,
  ) {
    const provider = input.provider || 'cloudinary';
    const caseId = input.caseId?.trim() || undefined;

    if (provider !== 'cloudinary' && provider !== 's3') {
      throw new BadRequestException('provider must be cloudinary or s3');
    }

    let url: string;
    let providerKey: string | undefined;

    if (provider === 'cloudinary') {
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

    return doc;
  }
}
