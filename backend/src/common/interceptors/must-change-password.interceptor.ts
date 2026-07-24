import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../database/prisma.service';

type AuthedRequest = {
  method?: string;
  url?: string;
  originalUrl?: string;
  user?: { sub?: string };
};

function isPasswordChangeAllowed(method: string, path: string) {
  if (method === 'POST' && path.endsWith('/users/me/password')) return true;
  if (method === 'POST' && path.endsWith('/auth/logout')) return true;
  if (method === 'POST' && path.endsWith('/auth/refresh')) return true;
  return false;
}

@Injectable()
export class MustChangePasswordInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const userId = req.user?.sub;
    if (!userId) {
      return next.handle();
    }

    const method = (req.method || 'GET').toUpperCase();
    const path = (req.originalUrl || req.url || '').split('?')[0];
    if (isPasswordChangeAllowed(method, path)) {
      return next.handle();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mustChangePassword: true },
    });

    if (user?.mustChangePassword) {
      throw new ForbiddenException(
        'password change required before using the system; update your password at /account',
      );
    }

    return next.handle();
  }
}
