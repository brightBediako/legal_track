import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

@Injectable()
export class LocalStorageService {
  /** Always `backend/upload` relative to this service file. */
  private readonly uploadRoot = path.resolve(__dirname, '..', '..', 'upload');

  getUploadRoot() {
    return this.uploadRoot;
  }

  async ensureUploadDir() {
    await fs.mkdir(this.uploadRoot, { recursive: true });
  }

  async storeLocalFile(sourcePath: string, originalName: string) {
    await this.ensureUploadDir();

    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${Date.now()}-${safeName}`;
    const dest = path.join(this.uploadRoot, key);

    await fs.copyFile(sourcePath, dest);

    return {
      key,
      /** App-relative path stored in DB for reference */
      url: `/upload/${key}`,
      absolutePath: dest,
    };
  }

  resolveAbsolutePath(key: string) {
    const resolved = path.resolve(this.uploadRoot, key);
    const rootWithSep = this.uploadRoot.endsWith(path.sep)
      ? this.uploadRoot
      : `${this.uploadRoot}${path.sep}`;

    if (resolved !== this.uploadRoot && !resolved.startsWith(rootWithSep)) {
      throw new BadRequestException('invalid local file key');
    }

    return resolved;
  }

  async getAbsolutePath(key: string) {
    const absolutePath = this.resolveAbsolutePath(key);
    try {
      await fs.access(absolutePath);
    } catch {
      throw new NotFoundException('local file not found on disk');
    }
    return absolutePath;
  }
}
