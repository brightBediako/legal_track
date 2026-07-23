import { Controller, Get, Param, Res, StreamableFile, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';
import { CurrentUser, AuthUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DocumentsAccessService } from './documents-access.service';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin, Role.lawyer, Role.clerk, Role.client)
export class DocumentsAccessController {
  constructor(private readonly access: DocumentsAccessService) {}

  @Get(':id/access')
  async accessUrl(@Param('id') id: string, @CurrentUser() user?: AuthUserPayload) {
    return this.access.getSignedAccessUrl(id, { userId: user?.sub, role: user?.role });
  }

  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @CurrentUser() user?: AuthUserPayload,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const file = await this.access.getLocalDownload(id, {
      userId: user?.sub,
      role: user?.role,
    });
    res?.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.filename)}"`,
    });
    return new StreamableFile(createReadStream(file.absolutePath));
  }
}
