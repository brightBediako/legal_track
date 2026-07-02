import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

type JwtPayload = {
  sub: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<{ headers?: Record<string, string>; user?: JwtPayload }>();
    const authHeader =
      req.headers?.authorization ||
      (req.headers as unknown as Record<string, string>)?.Authorization;

    if (!authHeader) {
      throw new UnauthorizedException("missing authorization header");
    }

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedException("invalid authorization header");
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("invalid token");
    }
  }
}
