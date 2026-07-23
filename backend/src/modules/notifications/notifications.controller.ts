import { Controller, Get, Param, Patch, Query, UnauthorizedException, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin, Role.lawyer, Role.clerk, Role.client)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(
    @CurrentUser() user?: AuthUserPayload,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    if (!user?.sub) throw new UnauthorizedException();
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.notifications.listForUser(user.sub, {
      unreadOnly: unreadOnly === '1' || unreadOnly === 'true',
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user?: AuthUserPayload) {
    if (!user?.sub) throw new UnauthorizedException();
    return this.notifications.unreadCount(user.sub);
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser() user?: AuthUserPayload) {
    if (!user?.sub) throw new UnauthorizedException();
    return this.notifications.markAllRead(user.sub);
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @CurrentUser() user?: AuthUserPayload) {
    if (!user?.sub) throw new UnauthorizedException();
    return this.notifications.markRead(user.sub, id);
  }
}
