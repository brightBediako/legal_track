import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'node:fs';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: process.env.AWS_ACCESS_KEY_ID
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        }
      : undefined,
  });

  async uploadLocalFile(localFilePath: string, key: string, bucket?: string) {
    const Bucket = bucket || process.env.AWS_S3_BUCKET;
    if (!Bucket) {
      throw new Error('AWS_S3_BUCKET is not configured');
    }

    const fileStream = fs.createReadStream(localFilePath);

    const command = new PutObjectCommand({
      Bucket,
      Key: key,
      Body: fileStream,
    });

    await this.client.send(command);

    return {
      bucket: Bucket,
      key,
      // Public URL pattern will depend on your bucket settings (private vs public).
      url: `https://${Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${encodeURIComponent(
        key,
      )}`,
    };
  }

  async getSignedDownloadUrl(input: { key: string; expiresInSeconds?: number; bucket?: string }) {
    const Bucket = input.bucket || process.env.AWS_S3_BUCKET;
    if (!Bucket) {
      throw new Error('AWS_S3_BUCKET is not configured');
    }

    const command = new GetObjectCommand({
      Bucket,
      Key: input.key,
    });

    return getSignedUrl(this.client, command, { expiresIn: input.expiresInSeconds ?? 600 });
  }
}

