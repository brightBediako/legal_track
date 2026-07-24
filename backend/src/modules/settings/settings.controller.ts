import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles(Role.admin)
  async get() {
    return this.settingsService.get();
  }

  @Get('rbac')
  @Roles(Role.admin)
  rbac() {
    return this.settingsService.rbacMatrix();
  }

  @Patch()
  @Roles(Role.admin)
  async update(@Body() body: UpdateSettingsDto, @CurrentUser() user?: AuthUserPayload) {
    return this.settingsService.update(body, user?.sub);
  }
}
