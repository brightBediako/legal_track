import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

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

    const email = input.email?.trim() || undefined;
    const phone = input.phone?.trim() || undefined;

    const client = await this.prisma.client.create({
      data: { name, email, phone },
    });

    await this.audit.logCreate('Client', client.id, actorUserId, {
      name: client.name,
    });

    return client;
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
    });
  }

  async getById(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
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
    const existing = await this.prisma.client.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('client not found');

    const data: Prisma.ClientUpdateInput = {};

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new BadRequestException('name is required');
      data.name = name;
    }

    if (input.email !== undefined) {
      const email = typeof input.email === 'string' ? input.email.trim() : input.email;
      data.email = email || null;
    }

    if (input.phone !== undefined) {
      const phone = typeof input.phone === 'string' ? input.phone.trim() : input.phone;
      data.phone = phone || null;
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
    });

    await this.audit.logUpdate('Client', client.id, actorUserId, {
      name: client.name,
      isActive: client.isActive,
      fields: Object.keys(data),
    });

    return client;
  }
}
