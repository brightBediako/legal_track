import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../documents/cloudinary.service';
import { LocalStorageService } from '../../documents/local-storage.service';
import { S3Service } from '../../documents/s3.service';

@Injectable()
export class DocumentsAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly localStorage: LocalStorageService,
    private readonly cloudinary: CloudinaryService,
    private readonly s3: S3Service,
  ) {}

  private apiBaseUrl() {
    return (
      process.env.PUBLIC_API_BASE_URL ||
      `http://localhost:${process.env.PORT ? Number(process.env.PORT) : 4000}`
    );
  }

  async getSignedAccessUrl(documentId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, provider: true, providerKey: true, url: true },
    });

    if (!doc) throw new NotFoundException('document not found');

    if (!doc.providerKey) {
      throw new BadRequestException('document providerKey is missing (re-upload required)');
    }

    if (doc.provider === 'local') {
      return {
        url: `${this.apiBaseUrl()}/documents/${doc.id}/download`,
        provider: 'local' as const,
        requiresAuth: true,
      };
    }

    if (doc.provider === 's3') {
      const url = await this.s3.getSignedDownloadUrl({ key: doc.providerKey, expiresInSeconds: 600 });
      return { url, provider: 's3' as const, expiresInSeconds: 600 };
    }

    if (doc.provider === 'cloudinary') {
      const expiresAt = Math.floor(Date.now() / 1000) + 600;
      const url = this.cloudinary.getSignedDownloadUrl({
        publicId: doc.providerKey,
        expiresAtUnixSeconds: expiresAt,
      });
      return { url, provider: 'cloudinary' as const, expiresInSeconds: 600 };
    }

    // Fallback: return stored URL if provider is unknown
    return { url: doc.url };
  }

  async getLocalDownload(documentId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, filename: true, provider: true, providerKey: true },
    });

    if (!doc) throw new NotFoundException('document not found');
    if (doc.provider !== 'local') {
      throw new BadRequestException('download endpoint is only for local documents');
    }
    if (!doc.providerKey) {
      throw new BadRequestException('document providerKey is missing (re-upload required)');
    }

    const absolutePath = await this.localStorage.getAbsolutePath(doc.providerKey);
    return { absolutePath, filename: doc.filename };
  }
}

