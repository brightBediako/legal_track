import {
  Body,
  Controller,
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
@Roles(Role.admin, Role.lawyer, Role.clerk)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  async list(@Query('q') q?: string) {
    return this.clientsService.list({ q });
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.clientsService.getById(id);
  }

  @Post()
  async create(@Body() body: CreateClientDto, @CurrentUser() user?: AuthUserPayload) {
    return this.clientsService.create(body, user?.sub);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateClientDto,
    @CurrentUser() user?: AuthUserPayload,
  ) {
    return this.clientsService.update(id, body, user?.sub);
  }
}
