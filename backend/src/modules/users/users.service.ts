import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

const ROLES: Role[] = ['admin', 'lawyer', 'clerk', 'client'];
const BCRYPT_ROUNDS = 10;
const userPublicSelect = {
  id: true,
  email: true,
  role: true,
  clientId: true,
  createdAt: true,
  updatedAt: true,
  client: { select: { id: true, name: true, email: true } },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query?: { q?: string; role?: string }) {
    const q = query?.q?.trim();
    const role = query?.role?.trim();
    const where: Prisma.UserWhereInput = {};

    if (role) {
      where.role = this.parseRole(role);
    }

    if (q) {
      where.email = { contains: q, mode: 'insensitive' };
    }

    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: userPublicSelect,
    });
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userPublicSelect,
    });
    if (!user) throw new NotFoundException('user not found');
    return user;
  }

  async create(
    input: { email: string; password: string; role: string; clientId?: string | null },
    actorUserId?: string,
  ) {
    const email = this.normalizeEmail(input.email);
    const password = input.password;
    const role = this.parseRole(input.role);

    if (!password || password.length < 8) {
      throw new BadRequestException('password must be at least 8 characters');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('email is already registered');
    }

    const clientId = await this.resolveClientLink(role, input.clientId);
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hash,
        role,
        client: clientId ? { connect: { id: clientId } } : undefined,
      },
      select: userPublicSelect,
    });

    await this.audit.logCreate('User', user.id, actorUserId, {
      email: user.email,
      role: user.role,
      clientId: user.clientId,
    });

    return user;
  }

  async update(
    id: string,
    input: {
      email?: string;
      role?: string;
      password?: string;
      clientId?: string | null;
    },
    actorUserId?: string,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('user not found');

    const data: Prisma.UserUpdateInput = {};
    let nextRole = existing.role;

    if (input.email !== undefined) {
      const email = this.normalizeEmail(input.email);
      if (email !== existing.email) {
        const clash = await this.prisma.user.findUnique({ where: { email } });
        if (clash) throw new BadRequestException('email is already registered');
      }
      data.email = email;
    }

    if (input.role !== undefined) {
      const role = this.parseRole(input.role);
      if (existing.role === 'admin' && role !== 'admin') {
        const adminCount = await this.prisma.user.count({ where: { role: 'admin' } });
        if (adminCount <= 1) {
          throw new BadRequestException('cannot demote the last admin');
        }
      }
      data.role = role;
      nextRole = role;
    }

    if (input.password !== undefined) {
      if (!input.password || input.password.length < 8) {
        throw new BadRequestException('password must be at least 8 characters');
      }
      data.password = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    }

    if (input.clientId !== undefined || input.role !== undefined) {
      const clientId = await this.resolveClientLink(
        nextRole,
        input.clientId !== undefined ? input.clientId : existing.clientId,
      );
      if (!clientId) {
        data.client = { disconnect: true };
      } else {
        data.client = { connect: { id: clientId } };
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('no fields to update');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: userPublicSelect,
    });

    await this.audit.logUpdate('User', user.id, actorUserId, {
      email: user.email,
      role: user.role,
      clientId: user.clientId,
      fields: Object.keys(data).map((k) => (k === 'password' ? 'password' : k)),
    });

    return user;
  }

  async changeOwnPassword(
    userId: string,
    input: { currentPassword: string; newPassword: string },
  ) {
    const currentPassword = input.currentPassword;
    const newPassword = input.newPassword;

    if (!currentPassword || !newPassword) {
      throw new BadRequestException('currentPassword and newPassword are required');
    }
    if (newPassword.length < 8) {
      throw new BadRequestException('newPassword must be at least 8 characters');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, password: true },
    });
    if (!user) throw new NotFoundException('user not found');

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) {
      throw new BadRequestException('current password is incorrect');
    }

    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    });

    await this.audit.logUpdate('User', user.id, userId, {
      email: user.email,
      fields: ['password'],
      selfService: true,
    });

    return { ok: true };
  }

  private normalizeEmail(email: string) {
    const value = email?.trim().toLowerCase();
    if (!value || !value.includes('@')) {
      throw new BadRequestException('a valid email is required');
    }
    return value;
  }

  private parseRole(role: string): Role {
    const value = role?.trim().toLowerCase();
    if (!value || !(ROLES as string[]).includes(value)) {
      throw new BadRequestException(`role must be one of: ${ROLES.join(', ')}`);
    }
    return value as Role;
  }

  private async resolveClientLink(role: Role, clientId?: string | null) {
    if (role !== 'client') {
      return null;
    }
    const id = typeof clientId === 'string' ? clientId.trim() : '';
    if (!id) {
      throw new BadRequestException('client role requires a linked client profile (clientId)');
    }
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new BadRequestException('client profile not found');
    return id;
  }
}
