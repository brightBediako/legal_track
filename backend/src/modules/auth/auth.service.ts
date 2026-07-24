import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
  ) {}

  async login(input: { email: string; password: string }) {
    const email = input.email?.trim().toLowerCase();
    const password = input.password;

    if (!email || !password) {
      throw new BadRequestException('email and password are required');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        clientId: true,
        mustChangePassword: true,
      },
    });

    if (!user) {
      await this.audit.log({
        action: 'login_failure',
        entity: 'User',
        metadata: { email, reason: 'unknown_user' },
      });
      throw new UnauthorizedException('invalid credentials');
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      await this.audit.log({
        action: 'login_failure',
        entity: 'User',
        entityId: user.id,
        userId: user.id,
        metadata: { email, reason: 'bad_password' },
      });
      throw new UnauthorizedException('invalid credentials');
    }

    const tokens = await this.issueTokenPair(user);

    await this.audit.log({
      action: 'login_success',
      entity: 'User',
      entityId: user.id,
      userId: user.id,
      metadata: {
        email: user.email,
        role: user.role,
        clientId: user.clientId,
        mustChangePassword: user.mustChangePassword,
      },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async refresh(input: { refreshToken?: string }) {
    const raw = input.refreshToken?.trim();
    if (!raw) throw new BadRequestException('refreshToken is required');

    const tokenHash = this.hashToken(raw);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            clientId: true,
            mustChangePassword: true,
          },
        },
      },
    });

    if (!stored || stored.revokedAt || stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokenPair(stored.user);

    return {
      ...tokens,
      user: {
        id: stored.user.id,
        email: stored.user.email,
        role: stored.user.role,
        clientId: stored.user.clientId,
        mustChangePassword: stored.user.mustChangePassword,
      },
    };
  }

  async logout(input: { refreshToken?: string }) {
    const raw = input.refreshToken?.trim();
    if (!raw) return { ok: true };

    const tokenHash = this.hashToken(raw);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { ok: true };
  }

  private async issueTokenPair(user: {
    id: string;
    email: string;
    role: string;
    clientId?: string | null;
  }) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      clientId: user.clientId ?? undefined,
      typ: 'access',
    });

    const refreshToken = randomBytes(48).toString('hex');
    const refreshDays = positiveInt(process.env.JWT_REFRESH_DAYS, 7);
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(raw: string) {
    return createHash('sha256').update(raw).digest('hex');
  }
}

function positiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}
