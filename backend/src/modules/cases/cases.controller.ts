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
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';

@Controller('cases')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin, Role.lawyer, Role.clerk)
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  async list(@Query('q') q?: string, @Query('status') status?: string) {
    return this.casesService.list({ q, status });
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.casesService.getById(id);
  }

  @Post()
  async create(@Body() body: CreateCaseDto, @CurrentUser() user?: AuthUserPayload) {
    return this.casesService.create(body, user?.sub);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCaseDto,
    @CurrentUser() user?: AuthUserPayload,
  ) {
    return this.casesService.update(id, body, user?.sub);
  }
}
