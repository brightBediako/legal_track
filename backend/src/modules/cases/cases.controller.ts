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
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { CreateTimelineEventDto } from './dto/create-timeline-event.dto';
import { UpdateCaseDto } from './dto/update-case.dto';

@Controller('cases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  @Roles(Role.admin, Role.lawyer, Role.clerk, Role.client)
  async list(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('assigneeId') assigneeId?: string,
    @CurrentUser() user?: AuthUserPayload,
  ) {
    return this.casesService.list(
      { q, status, assigneeId },
      { userId: user?.sub, role: user?.role },
    );
  }

  @Get(':id')
  @Roles(Role.admin, Role.lawyer, Role.clerk, Role.client)
  async getById(@Param('id') id: string, @CurrentUser() user?: AuthUserPayload) {
    return this.casesService.getById(id, { userId: user?.sub, role: user?.role });
  }

  @Post()
  @Roles(Role.admin, Role.lawyer, Role.clerk)
  async create(@Body() body: CreateCaseDto, @CurrentUser() user?: AuthUserPayload) {
    return this.casesService.create(body, user?.sub, user?.role);
  }

  @Patch(':id')
  @Roles(Role.admin, Role.lawyer, Role.clerk)
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCaseDto,
    @CurrentUser() user?: AuthUserPayload,
  ) {
    return this.casesService.update(id, body, user?.sub, user?.role);
  }

  @Delete(':id')
  @Roles(Role.admin)
  async remove(@Param('id') id: string, @CurrentUser() user?: AuthUserPayload) {
    return this.casesService.remove(id, user?.sub);
  }

  @Post(':id/timeline')
  @Roles(Role.admin, Role.lawyer, Role.clerk)
  async addTimelineNote(
    @Param('id') id: string,
    @Body() body: CreateTimelineEventDto,
    @CurrentUser() user?: AuthUserPayload,
  ) {
    return this.casesService.addNote(id, body, { userId: user?.sub, role: user?.role });
  }
}
