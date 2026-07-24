import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    input: { name: string; email?: string; phone?: string },
    actorUserId?: string,
  ) {
    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException('name is required');
    }

    const email = this.normalizeEmail(input.email);
    const phone = this.normalizePhone(input.phone);

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestException(
        'a user account already exists for this email; use a different email for the client portal',
      );
    }

    const passwordHash = await bcrypt.hash(phone, BCRYPT_ROUNDS);

    const client = await this.prisma.$transaction(async (tx) => {
      const created = await tx.client.create({
        data: { name, email, phone },
      });

      await tx.user.create({
        data: {
          email,
          password: passwordHash,
          role: 'client',
          mustChangePassword: true,
          client: { connect: { id: created.id } },
        },
      });

      return created;
    });

    await this.audit.logCreate('Client', client.id, actorUserId, {
      name: client.name,
      portalAccount: true,
      email,
    });

    return {
      ...client,
      portalAccount: {
        email,
        temporaryPassword: 'phone',
        mustChangePassword: true,
        message:
          'Portal login created. Client signs in with their email; temporary password is their phone number. They must change it on first login.',
      },
    };
  }

  async list(query?: { q?: string }) {
    const q = query?.q?.trim();
    const where: Prisma.ClientWhereInput = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};

    return this.prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        portalUser: {
          select: { id: true, email: true, mustChangePassword: true },
        },
      },
    });
  }

  async getById(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        portalUser: {
          select: {
            id: true,
            email: true,
            mustChangePassword: true,
            createdAt: true,
          },
        },
        cases: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            status: true,
            courtDate: true,
            createdAt: true,
            documents: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                filename: true,
                provider: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!client) throw new NotFoundException('client not found');
    return client;
  }

  async update(
    id: string,
    input: {
      name?: string;
      email?: string | null;
      phone?: string | null;
      isActive?: boolean;
    },
    actorUserId?: string,
  ) {
    const existing = await this.prisma.client.findUnique({
      where: { id },
      include: { portalUser: { select: { id: true, email: true } } },
    });
    if (!existing) throw new NotFoundException('client not found');

    const data: Prisma.ClientUpdateInput = {};

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new BadRequestException('name is required');
      data.name = name;
    }

    if (input.email !== undefined) {
      const email =
        typeof input.email === 'string' ? input.email.trim().toLowerCase() : input.email;
      if (!email) {
        throw new BadRequestException('email is required for portal clients');
      }
      if (!email.includes('@')) {
        throw new BadRequestException('a valid email is required');
      }
      if (existing.portalUser && email !== existing.portalUser.email) {
        const clash = await this.prisma.user.findUnique({ where: { email } });
        if (clash && clash.id !== existing.portalUser.id) {
          throw new BadRequestException('email is already registered to another user');
        }
        await this.prisma.user.update({
          where: { id: existing.portalUser.id },
          data: { email },
        });
      }
      data.email = email;
    }

    if (input.phone !== undefined) {
      const phone = typeof input.phone === 'string' ? input.phone.trim() : input.phone;
      if (!phone) {
        throw new BadRequestException('phone is required for portal clients');
      }
      data.phone = phone;
    }

    if (input.isActive !== undefined) {
      data.isActive = Boolean(input.isActive);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('no fields to update');
    }

    const client = await this.prisma.client.update({
      where: { id },
      data,
      include: {
        portalUser: {
          select: { id: true, email: true, mustChangePassword: true },
        },
      },
    });

    await this.audit.logUpdate('Client', client.id, actorUserId, {
      name: client.name,
      isActive: client.isActive,
      fields: Object.keys(data),
    });

    return client;
  }

  async remove(id: string, actorUserId?: string) {
    const existing = await this.prisma.client.findUnique({
      where: { id },
      include: {
        _count: { select: { cases: true } },
        portalUser: { select: { id: true } },
      },
    });
    if (!existing) throw new NotFoundException('client not found');

    if (existing._count.cases > 0) {
      throw new BadRequestException(
        'client has linked cases; reassign or delete those cases first',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (existing.portalUser) {
        await tx.user.delete({ where: { id: existing.portalUser!.id } });
      }
      await tx.client.delete({ where: { id } });
    });

    await this.audit.logDelete('Client', id, actorUserId, {
      name: existing.name,
    });

    return { ok: true, id };
  }

  private normalizeEmail(email?: string) {
    const value = email?.trim().toLowerCase();
    if (!value || !value.includes('@')) {
      throw new BadRequestException(
        'email is required; it becomes the client portal login username',
      );
    }
    return value;
  }

  private normalizePhone(phone?: string) {
    const value = phone?.trim();
    if (!value) {
      throw new BadRequestException(
        'phone is required; it becomes the temporary portal password until first login',
      );
    }
    if (value.length < 8) {
      throw new BadRequestException(
        'phone must be at least 8 characters (used as the temporary password)',
      );
    }
    return value;
  }
}
