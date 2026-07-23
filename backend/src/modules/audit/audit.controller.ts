import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditService } from './audit.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  async list(
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.audit.list({
      action,
      entity,
      q,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });
  }
}
