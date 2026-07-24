import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

const STAFF_ROLES: Role[] = ['admin', 'lawyer', 'clerk'];
const BCRYPT_ROUNDS = 10;
const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  clientId: true,
  mustChangePassword: true,
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
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: userPublicSelect,
    });
  }

  async listAssignable() {
    return this.prisma.user.findMany({
      where: { role: { in: ['admin', 'lawyer'] } },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: { id: true, name: true, email: true, phone: true, role: true },
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
    input: { name: string; email: string; phone: string; role: string },
    actorUserId?: string,
  ) {
    const name = this.normalizeName(input.name);
    const email = this.normalizeEmail(input.email);
    const phone = this.normalizePhone(input.phone);
    const role = this.parseStaffRole(input.role);

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('email is already registered');
    }

    const hash = await bcrypt.hash(phone, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hash,
        role,
        mustChangePassword: true,
      },
      select: userPublicSelect,
    });

    await this.audit.logCreate('User', user.id, actorUserId, {
      email: user.email,
      name: user.name,
      role: user.role,
      temporaryPassword: 'phone',
    });

    return {
      ...user,
      temporaryPassword: 'phone',
      message:
        'Staff account created. Login with email; temporary password is the phone number. Password change is required on first login.',
    };
  }

  async update(
    id: string,
    input: {
      name?: string;
      email?: string;
      phone?: string;
      role?: string;
      password?: string;
    },
    actorUserId?: string,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('user not found');

    if (existing.role === 'client') {
      throw new BadRequestException(
        'client portal accounts are managed via client registration; reset password from the account page or recreate the client',
      );
    }

    const data: Prisma.UserUpdateInput = {};

    if (input.name !== undefined) {
      data.name = this.normalizeName(input.name);
    }

    if (input.email !== undefined) {
      const email = this.normalizeEmail(input.email);
      if (email !== existing.email) {
        const clash = await this.prisma.user.findUnique({ where: { email } });
        if (clash) throw new BadRequestException('email is already registered');
      }
      data.email = email;
    }

    if (input.phone !== undefined) {
      data.phone = this.normalizePhone(input.phone);
    }

    if (input.role !== undefined) {
      const role = this.parseStaffRole(input.role);
      if (existing.role === 'admin' && role !== 'admin') {
        const adminCount = await this.prisma.user.count({ where: { role: 'admin' } });
        if (adminCount <= 1) {
          throw new BadRequestException('cannot demote the last admin');
        }
      }
      data.role = role;
    }

    if (input.password !== undefined) {
      if (!input.password || input.password.length < 8) {
        throw new BadRequestException('password must be at least 8 characters');
      }
      data.password = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
      data.mustChangePassword = false;
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
    if (newPassword === currentPassword) {
      throw new BadRequestException('newPassword must be different from the current password');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, password: true, mustChangePassword: true },
    });
    if (!user) throw new NotFoundException('user not found');

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) {
      throw new BadRequestException('current password is incorrect');
    }

    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hash, mustChangePassword: false },
    });

    await this.audit.logUpdate('User', user.id, userId, {
      email: user.email,
      fields: ['password', 'mustChangePassword'],
      selfService: true,
    });

    return { ok: true, mustChangePassword: false };
  }

  private normalizeEmail(email: string) {
    const value = email?.trim().toLowerCase();
    if (!value || !value.includes('@')) {
      throw new BadRequestException('a valid email is required');
    }
    return value;
  }

  private normalizeName(name?: string) {
    const value = name?.trim();
    if (!value) {
      throw new BadRequestException('name is required');
    }
    return value;
  }

  private normalizePhone(phone?: string) {
    const value = phone?.trim();
    if (!value) {
      throw new BadRequestException(
        'phone is required; it becomes the temporary password until first login',
      );
    }
    if (value.length < 8) {
      throw new BadRequestException(
        'phone must be at least 8 characters (used as the temporary password)',
      );
    }
    return value;
  }

  private parseStaffRole(role: string): Role {
    const value = role?.trim().toLowerCase();
    if (!value || !(STAFF_ROLES as string[]).includes(value)) {
      throw new BadRequestException(
        `role must be one of: ${STAFF_ROLES.join(', ')}. Client portal accounts are created when registering a client.`,
      );
    }
    return value as Role;
  }

  private parseRole(role: string): Role {
    const value = role?.trim().toLowerCase();
    const all: Role[] = ['admin', 'lawyer', 'clerk', 'client'];
    if (!value || !(all as string[]).includes(value)) {
      throw new BadRequestException(`role must be one of: ${all.join(', ')}`);
    }
    return value as Role;
  }
}
