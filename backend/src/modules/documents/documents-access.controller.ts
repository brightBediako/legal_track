import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DocumentsAccessService } from './documents-access.service';

@Controller('documents')
export class DocumentsAccessController {
  constructor(private readonly access: DocumentsAccessService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':id/access')
  async accessUrl(@Param('id') id: string) {
    return this.access.getSignedAccessUrl(id);
  }
}

