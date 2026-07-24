import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ensureAdminFromEnv } from '../../common/admin-bootstrap';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const result = await ensureAdminFromEnv(this.prisma);
      if (result.status === 'skipped') {
        this.logger.warn(`Admin bootstrap skipped: ${result.reason}`);
        return;
      }
      if (result.status === 'created') {
        this.logger.log(`Bootstrap admin created: ${result.email}`);
        return;
      }
      if (result.status === 'updated') {
        this.logger.log(`Bootstrap admin password reset from env: ${result.email}`);
        return;
      }
      this.logger.log(`Bootstrap admin already present: ${result.email}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Admin bootstrap failed: ${message}`);
      if (process.env.NODE_ENV === 'production') {
        throw err;
      }
    }
  }
}
