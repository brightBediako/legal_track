import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export type AuditAction = 'create' | 'update' | 'delete' | 'login_success' | 'login_failure';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: {
    action: AuditAction | string;
    entity: string;
    entityId?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: input.action,
          entity: input.entity,
          entityId: input.entityId,
          userId: input.userId,
          metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (err) {
      // Never break the primary operation because of audit failure.
      this.logger.warn(
        `Failed to write audit log (${input.action} ${input.entity}): ${
          err instanceof Error ? err.message : 'unknown error'
        }`,
      );
    }
  }

  logCreate(entity: string, entityId: string | undefined, userId?: string, metadata?: Record<string, unknown>) {
    return this.log({ action: 'create', entity, entityId, userId, metadata });
  }

  logUpdate(entity: string, entityId: string | undefined, userId?: string, metadata?: Record<string, unknown>) {
    return this.log({ action: 'update', entity, entityId, userId, metadata });
  }

  logDelete(entity: string, entityId: string | undefined, userId?: string, metadata?: Record<string, unknown>) {
    return this.log({ action: 'delete', entity, entityId, userId, metadata });
  }

  async list(query?: {
    action?: string;
    entity?: string;
    q?: string;
    limit?: number;
  }) {
    const action = query?.action?.trim();
    const entity = query?.entity?.trim();
    const q = query?.q?.trim();
    const take = Math.min(Math.max(query?.limit ?? 100, 1), 500);

    const where: Prisma.AuditLogWhereInput = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (q) {
      where.OR = [
        { action: { contains: q, mode: 'insensitive' } },
        { entity: { contains: q, mode: 'insensitive' } },
        { entityId: { contains: q, mode: 'insensitive' } },
        { userId: { contains: q, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });

    const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean))] as string[];
    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, role: true },
          })
        : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return rows.map((row) => ({
      ...row,
      user: row.userId ? userMap.get(row.userId) ?? null : null,
    }));
  }
}
