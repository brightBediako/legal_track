import { Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File, @Body() body: UploadDocumentDto) {
    if (!file) {
      return { message: 'file is required' };
    }

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'blc-'));
    const tmpPath = path.join(tmpDir, file.originalname);
    await fs.writeFile(tmpPath, file.buffer);

    try {
      return await this.documentsService.uploadAndCreateRecord({
        filePath: tmpPath,
        originalName: file.originalname,
        provider: body.provider,
        caseId: body.caseId,
      });
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  }
}

