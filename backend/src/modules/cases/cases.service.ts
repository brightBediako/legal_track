import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CasesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: { title: string; description?: string; status: string; clientId?: string }) {
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

    return this.prisma.case.create({
      data: {
        title,
        status,
        description,
        client: clientId ? { connect: { id: clientId } } : undefined,
      },
    });
  }

  async list() {
    return this.prisma.case.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}

