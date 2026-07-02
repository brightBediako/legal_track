import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();

    (this as any).$use(async (params: any, next: any) => {
      const action = params.action as string;
      const model = params.model as string | undefined;

      // Prevent recursion and avoid logging non-CRUD operations
      if (!model || model === 'AuditLog') {
        return next(params);
      }

      const shouldAudit = action === 'create' || action === 'update' || action === 'delete';
      if (!shouldAudit) {
        return next(params);
      }

      const result = await next(params);

      // Best-effort audit; never break the primary operation.
      try {
        const resultIdRaw =
          result && typeof result === 'object' && 'id' in (result as Record<string, unknown>)
            ? (result as Record<string, unknown>).id
            : undefined;

        const resultId =
          typeof resultIdRaw === 'string' || typeof resultIdRaw === 'number'
            ? String(resultIdRaw)
            : undefined;

        const entityId = resultId || (params.args?.where?.id ? String(params.args.where.id) : undefined);

        await (this as any).auditLog.create({
          data: {
            action,
            entity: model,
            entityId,
            metadata: {
              where: params.args?.where ?? null,
            },
          },
        });
      } catch {
        // swallow audit failures
      }

      return result;
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

