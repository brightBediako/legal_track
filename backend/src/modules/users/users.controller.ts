import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, AuthUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.admin)
  async list(@Query('q') q?: string, @Query('role') role?: string) {
    return this.usersService.list({ q, role });
  }

  @Post('me/password')
  @Roles(Role.admin, Role.lawyer, Role.clerk, Role.client)
  async changeOwnPassword(
    @Body() body: ChangePasswordDto,
    @CurrentUser() user?: AuthUserPayload,
  ) {
    if (!user?.sub) throw new UnauthorizedException();
    return this.usersService.changeOwnPassword(user.sub, body);
  }

  @Get(':id')
  @Roles(Role.admin)
  async getById(@Param('id') id: string) {
    return this.usersService.getById(id);
  }

  @Post()
  @Roles(Role.admin)
  async create(@Body() body: CreateUserDto, @CurrentUser() user?: AuthUserPayload) {
    return this.usersService.create(body, user?.sub);
  }

  @Patch(':id')
  @Roles(Role.admin)
  async update(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
    @CurrentUser() user?: AuthUserPayload,
  ) {
    return this.usersService.update(id, body, user?.sub);
  }
}
