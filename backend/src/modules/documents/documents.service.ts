import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../documents/cloudinary.service';
import { S3Service } from '../../documents/s3.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly s3: S3Service,
  ) {}

  async uploadAndCreateRecord(input: {
    filePath: string;
    originalName: string;
    provider?: 'cloudinary' | 's3';
    caseId?: string;
  }) {
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

    return this.prisma.document.create({
      data: {
        filename: input.originalName,
        url,
        provider,
        providerKey,
        case: caseId ? { connect: { id: caseId } } : undefined,
      },
    });
  }
}

