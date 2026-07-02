import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: process.env.CLOUDINARY_SECURE === 'true',
});

@Injectable()
export class CloudinaryService {
  async uploadLocalFile(filePath: string, folder?: string): Promise<UploadApiResponse> {
    const options: Record<string, unknown> = {};
    if (folder) {
      options.folder = folder;
    }
    return cloudinary.uploader.upload(filePath, options);
  }

  getSignedDownloadUrl(input: { publicId: string; expiresAtUnixSeconds: number }) {
    return cloudinary.utils.private_download_url(input.publicId, '', {
      expires_at: input.expiresAtUnixSeconds,
    });
  }
}

