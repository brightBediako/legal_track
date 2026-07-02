import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: { name: string; email?: string; phone?: string }) {
    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException('name is required');
    }

    const email = input.email?.trim() || undefined;
    const phone = input.phone?.trim() || undefined;

    return this.prisma.client.create({
      data: { name, email, phone },
    });
  }

  async list() {
    return this.prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}

