import { BadRequestException, Injectable } from '@nestjs/common';
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

  async list() {
    return this.prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
