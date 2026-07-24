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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentsService = void 0;
const common_1 = require("@nestjs/common");
const portal_scope_service_1 = require("../../common/portal-scope.service");
const prisma_service_1 = require("../../database/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const notifications_service_1 = require("../notifications/notifications.service");
const TYPES = ['consultation', 'court', 'meeting'];
const STATUSES = ['scheduled', 'completed', 'cancelled'];
const includeRelations = {
    client: { select: { id: true, name: true, email: true, phone: true } },
    case: { select: { id: true, title: true, status: true } },
    createdBy: { select: { id: true, email: true, role: true } },
};
let AppointmentsService = class AppointmentsService {
    constructor(prisma, audit, notifications, portal) {
        this.prisma = prisma;
        this.audit = audit;
        this.notifications = notifications;
        this.portal = portal;
    }
    async create(input, actorUserId, actorRole) {
        const title = input.title?.trim();
        if (!title)
            throw new common_1.BadRequestException('title is required');
        const type = this.parseType(input.type);
        const status = this.parseStatus(input.status ?? 'scheduled');
        const description = input.description?.trim() || undefined;
        const startsAt = this.parseDate(input.startsAt, 'startsAt');
        const endsAt = input.endsAt ? this.parseDate(input.endsAt, 'endsAt') : undefined;
        if (endsAt && endsAt < startsAt) {
            throw new common_1.BadRequestException('endsAt must be after startsAt');
        }
        const clientId = input.clientId?.trim() || undefined;
        const caseId = input.caseId?.trim() || undefined;
        await this.assertClientAndCase(clientId, caseId);
        if (this.portal.isLawyerRole(actorRole) && actorUserId) {
            if (caseId) {
                await this.portal.assertCaseAccess({
                    userId: actorUserId,
                    role: actorRole,
                    caseId,
                });
            }
            else if (clientId) {
                const allowed = await this.prisma.case.findFirst({
                    where: { clientId, assigneeId: actorUserId },
                    select: { id: true },
                });
                if (!allowed) {
                    throw new common_1.BadRequestException('lawyers can only schedule for clients on their assigned cases');
                }
            }
            else {
                throw new common_1.BadRequestException('lawyers must link an assigned case (or its client) when scheduling');
            }
        }
        const created = await this.prisma.appointment.create({
            data: {
                title,
                type,
                status,
                description,
                startsAt,
                endsAt,
                client: clientId ? { connect: { id: clientId } } : undefined,
                case: caseId ? { connect: { id: caseId } } : undefined,
                createdBy: actorUserId ? { connect: { id: actorUserId } } : undefined,
            },
            include: includeRelations,
        });
        await this.audit.logCreate('Appointment', created.id, actorUserId, {
            title: created.title,
            type: created.type,
            status: created.status,
            startsAt: created.startsAt.toISOString(),
        });
        await this.notifications.notifyStaff({
            title: `Appointment scheduled: ${created.title}`,
            body: `${created.type} · ${created.startsAt.toLocaleString()}`,
            type: 'appointment',
            entity: 'Appointment',
            entityId: created.id,
            href: `/appointments/${created.id}`,
        }, { excludeUserId: actorUserId });
        return created;
    }
    async list(query, actor) {
        const q = query?.q?.trim();
        const type = query?.type?.trim();
        const status = query?.status?.trim();
        const where = {};
        if (type)
            where.type = this.parseType(type);
        if (status)
            where.status = this.parseStatus(status);
        if (q) {
            where.OR = [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
                { client: { name: { contains: q, mode: 'insensitive' } } },
                { case: { title: { contains: q, mode: 'insensitive' } } },
            ];
        }
        if (query?.from || query?.to) {
            where.startsAt = {};
            if (query.from)
                where.startsAt.gte = this.parseDate(query.from, 'from');
            if (query.to)
                where.startsAt.lte = this.parseDate(query.to, 'to');
        }
        const scoped = await this.portal.appointmentWhereForActor(actor);
        if (scoped)
            Object.assign(where, scoped);
        return this.prisma.appointment.findMany({
            where,
            orderBy: { startsAt: 'asc' },
            include: includeRelations,
        });
    }
    async getById(id, actor) {
        if (actor?.userId) {
            await this.portal.assertAppointmentAccess({
                userId: actor.userId,
                role: actor.role,
                appointmentId: id,
            });
        }
        const item = await this.prisma.appointment.findUnique({
            where: { id },
            include: includeRelations,
        });
        if (!item)
            throw new common_1.NotFoundException('appointment not found');
        return item;
    }
    async update(id, input, actorUserId, actorRole) {
        if (actorUserId) {
            await this.portal.assertAppointmentAccess({
                userId: actorUserId,
                role: actorRole,
                appointmentId: id,
            });
        }
        const existing = await this.prisma.appointment.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('appointment not found');
        const data = {};
        if (input.title !== undefined) {
            const title = input.title.trim();
            if (!title)
                throw new common_1.BadRequestException('title is required');
            data.title = title;
        }
        if (input.type !== undefined)
            data.type = this.parseType(input.type);
        if (input.status !== undefined)
            data.status = this.parseStatus(input.status);
        if (input.description !== undefined) {
            const description = typeof input.description === 'string' ? input.description.trim() : input.description;
            data.description = description || null;
        }
        if (input.startsAt !== undefined)
            data.startsAt = this.parseDate(input.startsAt, 'startsAt');
        if (input.endsAt !== undefined) {
            data.endsAt = input.endsAt ? this.parseDate(input.endsAt, 'endsAt') : null;
        }
        let nextClientId = existing.clientId;
        let nextCaseId = existing.caseId;
        if (input.clientId !== undefined) {
            const clientId = typeof input.clientId === 'string' ? input.clientId.trim() : input.clientId;
            if (!clientId) {
                data.client = { disconnect: true };
                nextClientId = null;
            }
            else {
                data.client = { connect: { id: clientId } };
                nextClientId = clientId;
            }
        }
        if (input.caseId !== undefined) {
            const caseId = typeof input.caseId === 'string' ? input.caseId.trim() : input.caseId;
            if (!caseId) {
                data.case = { disconnect: true };
                nextCaseId = null;
            }
            else {
                data.case = { connect: { id: caseId } };
                nextCaseId = caseId;
            }
        }
        await this.assertClientAndCase(nextClientId ?? undefined, nextCaseId ?? undefined);
        if (Object.keys(data).length === 0) {
            throw new common_1.BadRequestException('no fields to update');
        }
        const startsAt = data.startsAt instanceof Date ? data.startsAt : existing.startsAt;
        const endsAt = data.endsAt === null
            ? null
            : data.endsAt instanceof Date
                ? data.endsAt
                : existing.endsAt;
        if (endsAt && endsAt < startsAt) {
            throw new common_1.BadRequestException('endsAt must be after startsAt');
        }
        const updated = await this.prisma.appointment.update({
            where: { id },
            data,
            include: includeRelations,
        });
        await this.audit.logUpdate('Appointment', updated.id, actorUserId, {
            title: updated.title,
            status: updated.status,
            fields: Object.keys(data),
        });
        await this.notifications.notifyStaff({
            title: `Appointment updated: ${updated.title}`,
            body: `Status: ${updated.status}.`,
            type: 'appointment',
            entity: 'Appointment',
            entityId: updated.id,
            href: `/appointments/${updated.id}`,
        }, { excludeUserId: actorUserId });
        return updated;
    }
    async assertClientAndCase(clientId, caseId) {
        if (clientId) {
            const client = await this.prisma.client.findUnique({ where: { id: clientId } });
            if (!client)
                throw new common_1.BadRequestException('client not found');
        }
        if (caseId) {
            const linkedCase = await this.prisma.case.findUnique({ where: { id: caseId } });
            if (!linkedCase)
                throw new common_1.BadRequestException('case not found');
        }
    }
    parseType(type) {
        const value = type?.trim().toLowerCase();
        if (!value || !TYPES.includes(value)) {
            throw new common_1.BadRequestException(`type must be one of: ${TYPES.join(', ')}`);
        }
        return value;
    }
    parseStatus(status) {
        const value = status?.trim().toLowerCase();
        if (!value || !STATUSES.includes(value)) {
            throw new common_1.BadRequestException(`status must be one of: ${STATUSES.join(', ')}`);
        }
        return value;
    }
    parseDate(value, field) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            throw new common_1.BadRequestException(`${field} must be a valid date`);
        }
        return date;
    }
};
exports.AppointmentsService = AppointmentsService;
exports.AppointmentsService = AppointmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        notifications_service_1.NotificationsService,
        portal_scope_service_1.PortalScopeService])
], AppointmentsService);
