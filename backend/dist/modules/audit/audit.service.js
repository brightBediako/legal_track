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
var AuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let AuditService = AuditService_1 = class AuditService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(AuditService_1.name);
    }
    async log(input) {
        try {
            await this.prisma.auditLog.create({
                data: {
                    action: input.action,
                    entity: input.entity,
                    entityId: input.entityId,
                    userId: input.userId,
                    metadata: (input.metadata ?? undefined),
                },
            });
        }
        catch (err) {
            this.logger.warn(`Failed to write audit log (${input.action} ${input.entity}): ${err instanceof Error ? err.message : 'unknown error'}`);
        }
    }
    logCreate(entity, entityId, userId, metadata) {
        return this.log({ action: 'create', entity, entityId, userId, metadata });
    }
    logUpdate(entity, entityId, userId, metadata) {
        return this.log({ action: 'update', entity, entityId, userId, metadata });
    }
    logDelete(entity, entityId, userId, metadata) {
        return this.log({ action: 'delete', entity, entityId, userId, metadata });
    }
    async list(query) {
        const action = query?.action?.trim();
        const entity = query?.entity?.trim();
        const q = query?.q?.trim();
        const take = Math.min(Math.max(query?.limit ?? 100, 1), 500);
        const where = {};
        if (action)
            where.action = action;
        if (entity)
            where.entity = entity;
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
        const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean))];
        const users = userIds.length > 0
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
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = AuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
