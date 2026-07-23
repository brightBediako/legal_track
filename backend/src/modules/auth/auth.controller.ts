import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { throttleEnv } from '../../common/throttle.config';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';

const throttle = throttleEnv();

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: throttle.authLimit, ttl: throttle.ttl } })
  async login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }
}

