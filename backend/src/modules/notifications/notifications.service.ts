import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export type NotificationType = 'case_update' | 'appointment' | 'document' | 'internal';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, query?: { unreadOnly?: boolean; limit?: number }) {
    const take = Math.min(Math.max(query?.limit ?? 50, 1), 200);
    const where: Prisma.NotificationWhereInput = { userId };
    if (query?.unreadOnly) where.readAt = null;

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { count };
  }

  async markRead(userId: string, id: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new NotFoundException('notification not found');
    if (existing.readAt) return existing;

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  async notifyUser(input: {
    userId: string;
    title: string;
    body?: string;
    type: NotificationType;
    entity?: string;
    entityId?: string;
    href?: string;
  }) {
    try {
      return await this.prisma.notification.create({
        data: {
          userId: input.userId,
          title: input.title,
          body: input.body,
          type: input.type,
          entity: input.entity,
          entityId: input.entityId,
          href: input.href,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to notify user ${input.userId}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
      return null;
    }
  }

  /** Notify staff roles, optionally skipping the actor who triggered the event. */
  async notifyStaff(
    input: {
      title: string;
      body?: string;
      type: NotificationType;
      entity?: string;
      entityId?: string;
      href?: string;
    },
    options?: { excludeUserId?: string },
  ) {
    try {
      const staffRoles: Role[] = ['admin', 'lawyer', 'clerk'];
      const users = await this.prisma.user.findMany({
        where: {
          role: { in: staffRoles },
          ...(options?.excludeUserId ? { id: { not: options.excludeUserId } } : {}),
        },
        select: { id: true },
      });

      if (users.length === 0) return { created: 0 };

      await this.prisma.notification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          title: input.title,
          body: input.body,
          type: input.type,
          entity: input.entity,
          entityId: input.entityId,
          href: input.href,
        })),
      });

      return { created: users.length };
    } catch (err) {
      this.logger.warn(
        `Failed to notify staff: ${err instanceof Error ? err.message : 'unknown'}`,
      );
      return { created: 0 };
    }
  }
}
