import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type AuthUserPayload = {
  sub: string;
  email?: string;
  role?: string;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUserPayload | undefined => {
    const req = ctx.switchToHttp().getRequest<{ user?: AuthUserPayload }>();
    return req.user;
  },
);
