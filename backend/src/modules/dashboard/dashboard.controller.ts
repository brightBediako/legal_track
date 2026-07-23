import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin, Role.lawyer, Role.clerk)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  async summary() {
    return this.dashboard.summary();
  }

  @Get('search')
  async search(@Query('q') q?: string) {
    return this.dashboard.search(q ?? '');
  }
}
