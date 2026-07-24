import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { CurrentUser, AuthUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { throttleEnv } from '../../common/throttle.config';
import { assertAllowedDocumentFile } from '../../documents/allowed-file-types';
import { DocumentsService } from './documents.service';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';

const throttle = throttleEnv();

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @Roles(Role.admin, Role.lawyer, Role.clerk, Role.client)
  async list(
    @Query('caseId') caseId?: string,
    @Query('category') category?: string,
    @Query('latestOnly') latestOnly?: string,
    @CurrentUser() user?: AuthUserPayload,
  ) {
    return this.documentsService.list(
      { caseId, category, latestOnly },
      { userId: user?.sub, role: user?.role },
    );
  }

  @Get(':id/versions')
  @Roles(Role.admin, Role.lawyer, Role.clerk, Role.client)
  async versions(@Param('id') id: string, @CurrentUser() user?: AuthUserPayload) {
    return this.documentsService.listVersions(id, { userId: user?.sub, role: user?.role });
  }

  @Patch(':id')
  @Roles(Role.admin, Role.lawyer, Role.clerk)
  async update(
    @Param('id') id: string,
    @Body() body: UpdateDocumentDto,
    @CurrentUser() user?: AuthUserPayload,
  ) {
    return this.documentsService.updateCategory(id, body, {
      userId: user?.sub,
      role: user?.role,
    });
  }

  @Post('upload')
  @Roles(Role.admin, Role.lawyer, Role.clerk, Role.client)
  @Throttle({ default: { limit: throttle.uploadLimit, ttl: throttle.ttl } })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadDocumentDto,
    @CurrentUser() user?: AuthUserPayload,
  ) {
    if (!file) {
      return { message: 'file is required' };
    }

    assertAllowedDocumentFile(file.originalname, file.mimetype);

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
          category: body.category,
          replacesDocumentId: body.replacesDocumentId,
        },
        { userId: user?.sub, role: user?.role },
      );
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  }
}
