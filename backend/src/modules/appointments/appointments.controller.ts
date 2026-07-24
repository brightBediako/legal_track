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
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @Roles(Role.admin, Role.lawyer, Role.clerk, Role.client)
  async list(
    @Query('q') q?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentUser() user?: AuthUserPayload,
  ) {
    return this.appointmentsService.list(
      { q, type, status, from, to },
      { userId: user?.sub, role: user?.role },
    );
  }

  @Get(':id')
  @Roles(Role.admin, Role.lawyer, Role.clerk, Role.client)
  async getById(@Param('id') id: string, @CurrentUser() user?: AuthUserPayload) {
    return this.appointmentsService.getById(id, { userId: user?.sub, role: user?.role });
  }

  @Post()
  @Roles(Role.admin, Role.lawyer, Role.clerk)
  async create(@Body() body: CreateAppointmentDto, @CurrentUser() user?: AuthUserPayload) {
    return this.appointmentsService.create(body, user?.sub, user?.role);
  }

  @Patch(':id')
  @Roles(Role.admin, Role.lawyer, Role.clerk)
  async update(
    @Param('id') id: string,
    @Body() body: UpdateAppointmentDto,
    @CurrentUser() user?: AuthUserPayload,
  ) {
    return this.appointmentsService.update(id, body, user?.sub, user?.role);
  }
}
