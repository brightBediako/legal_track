import { Controller, Get, Param, UseGuards } from '@nestjs/common';
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
  async accessUrl(@Param('id') id: string) {
    return this.access.getSignedAccessUrl(id);
  }
}
