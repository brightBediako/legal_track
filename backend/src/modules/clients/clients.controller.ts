import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, AuthUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @Roles(Role.admin, Role.lawyer, Role.clerk)
  async list(@Query('q') q?: string) {
    return this.clientsService.list({ q });
  }

  @Get(':id')
  @Roles(Role.admin, Role.lawyer, Role.clerk)
  async getById(@Param('id') id: string) {
    return this.clientsService.getById(id);
  }

  @Post()
  @Roles(Role.admin, Role.lawyer, Role.clerk)
  async create(@Body() body: CreateClientDto, @CurrentUser() user?: AuthUserPayload) {
    return this.clientsService.create(body, user?.sub);
  }

  @Patch(':id')
  @Roles(Role.admin, Role.lawyer, Role.clerk)
  async update(
    @Param('id') id: string,
    @Body() body: UpdateClientDto,
    @CurrentUser() user?: AuthUserPayload,
  ) {
    return this.clientsService.update(id, body, user?.sub);
  }

  @Delete(':id')
  @Roles(Role.admin)
  async remove(@Param('id') id: string, @CurrentUser() user?: AuthUserPayload) {
    return this.clientsService.remove(id, user?.sub);
  }
}
