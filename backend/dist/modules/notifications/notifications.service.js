"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(NotificationsService_1.name);
    }
    async listForUser(userId, query) {
        const take = Math.min(Math.max(query?.limit ?? 50, 1), 200);
        const where = { userId };
        if (query?.unreadOnly)
            where.readAt = null;
        return this.prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take,
        });
    }
    async unreadCount(userId) {
        const count = await this.prisma.notification.count({
            where: { userId, readAt: null },
        });
        return { count };
    }
    async markRead(userId, id) {
        const existing = await this.prisma.notification.findFirst({
            where: { id, userId },
        });
        if (!existing)
            throw new common_1.NotFoundException('notification not found');
        if (existing.readAt)
            return existing;
        return this.prisma.notification.update({
            where: { id },
            data: { readAt: new Date() },
        });
    }
    async markAllRead(userId) {
        const result = await this.prisma.notification.updateMany({
            where: { userId, readAt: null },
            data: { readAt: new Date() },
        });
        return { updated: result.count };
    }
    async notifyUser(input) {
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
        }
        catch (err) {
            this.logger.warn(`Failed to notify user ${input.userId}: ${err instanceof Error ? err.message : 'unknown'}`);
            return null;
        }
    }
    async notifyStaff(input, options) {
        try {
            const staffRoles = ['admin', 'lawyer', 'clerk'];
            const users = await this.prisma.user.findMany({
                where: {
                    role: { in: staffRoles },
                    ...(options?.excludeUserId ? { id: { not: options.excludeUserId } } : {}),
                },
                select: { id: true },
            });
            if (users.length === 0)
                return { created: 0 };
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
        }
        catch (err) {
            this.logger.warn(`Failed to notify staff: ${err instanceof Error ? err.message : 'unknown'}`);
            return { created: 0 };
        }
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
