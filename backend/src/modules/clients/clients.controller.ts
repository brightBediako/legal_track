import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin, Role.lawyer, Role.clerk)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  async list() {
    return this.clientsService.list();
  }

  @Post()
  async create(@Body() body: CreateClientDto, @CurrentUser() user?: AuthUserPayload) {
    return this.clientsService.create(body, user?.sub);
  }
}
