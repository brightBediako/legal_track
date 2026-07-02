import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../documents/cloudinary.service';
import { S3Service } from '../../documents/s3.service';

@Injectable()
export class DocumentsAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly s3: S3Service,
  ) {}

  async getSignedAccessUrl(documentId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, provider: true, providerKey: true, url: true },
    });

    if (!doc) throw new NotFoundException('document not found');

    if (!doc.providerKey) {
      throw new BadRequestException('document providerKey is missing (re-upload required)');
    }

    if (doc.provider === 's3') {
      const url = await this.s3.getSignedDownloadUrl({ key: doc.providerKey, expiresInSeconds: 600 });
      return { url, expiresInSeconds: 600 };
    }

    if (doc.provider === 'cloudinary') {
      const expiresAt = Math.floor(Date.now() / 1000) + 600;
      const url = this.cloudinary.getSignedDownloadUrl({
        publicId: doc.providerKey,
        expiresAtUnixSeconds: expiresAt,
      });
      return { url, expiresInSeconds: 600 };
    }

    // Fallback: return stored URL if provider is unknown
    return { url: doc.url };
  }
}

