import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { CurrentUser, AuthUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @Roles(Role.admin, Role.lawyer, Role.clerk)
  async list() {
    return this.documentsService.list();
  }

  @Post('upload')
  @Roles(Role.admin, Role.lawyer, Role.clerk, Role.client)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadDocumentDto,
    @CurrentUser() user?: AuthUserPayload,
  ) {
    if (!file) {
      return { message: 'file is required' };
    }

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'legal-track-'));
    const tmpPath = path.join(tmpDir, file.originalname);
    await fs.writeFile(tmpPath, file.buffer);

    try {
      return await this.documentsService.uploadAndCreateRecord(
        {
          filePath: tmpPath,
          originalName: file.originalname,
          provider: body.provider,
          caseId: body.caseId,
        },
        user?.sub,
      );
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  }
}
