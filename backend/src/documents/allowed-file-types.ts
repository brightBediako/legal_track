import { BadRequestException } from '@nestjs/common';
import * as path from 'node:path';

/** Allowed document upload extensions (lowercase, no leading dot). */
export const ALLOWED_DOCUMENT_EXTENSIONS = [
  'png',
  'jpeg',
  'jpg',
  'docx',
  'doc',
  'pdf',
  'mp3',
  'mp4',
] as const;

export type AllowedDocumentExtension = (typeof ALLOWED_DOCUMENT_EXTENSIONS)[number];

const ALLOWED_SET = new Set<string>(ALLOWED_DOCUMENT_EXTENSIONS);

export const ALLOWED_DOCUMENT_ACCEPT =
  '.png,.jpeg,.jpg,.docx,.doc,.pdf,.mp3,.mp4';

export function getFileExtension(filename: string): string {
  const ext = path.extname(filename || '').toLowerCase().replace(/^\./, '');
  return ext;
}

export function assertAllowedDocumentFile(filename: string, mimetype?: string) {
  const ext = getFileExtension(filename);
  if (!ext || !ALLOWED_SET.has(ext)) {
    throw new BadRequestException(
      `Unsupported file type. Allowed: ${ALLOWED_DOCUMENT_EXTENSIONS.join(', ')}`,
    );
  }

  // Soft MIME check when the browser/client supplies one (extension remains authoritative).
  if (mimetype && mimetype !== 'application/octet-stream') {
    const mimeOk = isAllowedMimeForExtension(ext, mimetype.toLowerCase());
    if (!mimeOk) {
      throw new BadRequestException(
        `File MIME type "${mimetype}" does not match extension .${ext}`,
      );
    }
  }

  return ext as AllowedDocumentExtension;
}

function isAllowedMimeForExtension(ext: string, mime: string): boolean {
  const map: Record<string, string[]> = {
    png: ['image/png'],
    jpeg: ['image/jpeg'],
    jpg: ['image/jpeg'],
    docx: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
    ],
    doc: ['application/msword', 'application/x-msword'],
    pdf: ['application/pdf'],
    mp3: ['audio/mpeg', 'audio/mp3', 'audio/mpeg3'],
    mp4: ['video/mp4', 'audio/mp4', 'application/mp4'],
  };

  const allowed = map[ext];
  return !allowed || allowed.includes(mime);
}
