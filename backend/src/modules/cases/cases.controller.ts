import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.dto';

@Controller('cases')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin, Role.lawyer, Role.clerk)
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  async list() {
    return this.casesService.list();
  }

  @Post()
  async create(@Body() body: CreateCaseDto, @CurrentUser() user?: AuthUserPayload) {
    return this.casesService.create(body, user?.sub);
  }
}
