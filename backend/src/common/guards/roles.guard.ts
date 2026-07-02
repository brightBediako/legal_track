import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';

type RequestWithUser = {
  user?: { role?: string };
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const role = req.user?.role;

    if (!role) {
      throw new ForbiddenException('missing role');
    }

    if (!requiredRoles.includes(role as Role)) {
      throw new ForbiddenException('insufficient role');
    }

    return true;
  }
}

