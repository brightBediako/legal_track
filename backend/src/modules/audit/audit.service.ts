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
}
