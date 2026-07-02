import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { Roles } from './common/decorators/roles.decorator';
import { Role } from './common/enums/role.enum';
import { RolesGuard } from './common/guards/roles.guard';

@Controller()
export class AppController {
  @Get()
  health() {
    return { service: 'backend', status: 'ok' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('protected')
  protected(@Req() req: { user?: unknown }) {
    return { ok: true, user: req.user };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @Get('protected/admin')
  adminOnly() {
    return { ok: true };
  }
}

