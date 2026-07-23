import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    input: { title: string; description?: string; status: string; clientId?: string },
    actorUserId?: string,
  ) {
    const title = input.title?.trim();
    if (!title) {
      throw new BadRequestException('title is required');
    }

    const status = input.status?.trim();
    if (!status) {
      throw new BadRequestException('status is required');
    }

    const description = input.description?.trim() || undefined;
    const clientId = input.clientId?.trim() || undefined;

    const created = await this.prisma.case.create({
      data: {
        title,
        status,
        description,
        client: clientId ? { connect: { id: clientId } } : undefined,
      },
    });

    await this.audit.logCreate('Case', created.id, actorUserId, {
      title: created.title,
      status: created.status,
      clientId: created.clientId,
    });

    return created;
  }

  async list() {
    return this.prisma.case.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
