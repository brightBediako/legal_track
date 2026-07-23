import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin, Role.lawyer, Role.clerk, Role.client)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  async summary(@CurrentUser() user?: AuthUserPayload) {
    return this.dashboard.summary({ userId: user?.sub, role: user?.role });
  }

  @Get('search')
  async search(@Query('q') q?: string, @CurrentUser() user?: AuthUserPayload) {
    return this.dashboard.search(q ?? '', { userId: user?.sub, role: user?.role });
  }
}
