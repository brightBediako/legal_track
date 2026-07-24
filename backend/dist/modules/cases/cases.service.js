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
exports.CasesService = void 0;
const common_1 = require("@nestjs/common");
const portal_scope_service_1 = require("../../common/portal-scope.service");
const prisma_service_1 = require("../../database/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const notifications_service_1 = require("../notifications/notifications.service");
const CASE_STATUSES = ['open', 'pending', 'closed'];
const ASSIGNABLE_ROLES = ['admin', 'lawyer'];
const assigneeSelect = { id: true, email: true, role: true };
const timelineSelect = {
    id: true,
    type: true,
    title: true,
    body: true,
    createdAt: true,
    createdBy: { select: { id: true, email: true, role: true } },
};
let CasesService = class CasesService {
    constructor(prisma, audit, notifications, portal) {
        this.prisma = prisma;
        this.audit = audit;
        this.notifications = notifications;
        this.portal = portal;
    }
    async create(input, actorUserId, actorRole) {
        const title = input.title?.trim();
        if (!title) {
            throw new common_1.BadRequestException('title is required');
        }
        const status = this.normalizeStatus(input.status);
        const description = input.description?.trim() || undefined;
        const clientId = input.clientId?.trim() || undefined;
        let assigneeId = await this.resolveAssigneeId(input.assigneeId);
        const notes = input.notes?.trim() || undefined;
        const courtDate = this.parseCourtDate(input.courtDate);
        if (actorRole === 'lawyer' && actorUserId) {
            if (assigneeId && assigneeId !== actorUserId) {
                throw new common_1.BadRequestException('lawyers can only assign cases to themselves');
            }
            assigneeId = actorUserId;
        }
        if (clientId) {
            const client = await this.prisma.client.findUnique({ where: { id: clientId } });
            if (!client)
                throw new common_1.BadRequestException('client not found');
        }
        const created = await this.prisma.case.create({
            data: {
                title,
                status,
                description,
                notes,
                courtDate,
                client: clientId ? { connect: { id: clientId } } : undefined,
                assignee: assigneeId ? { connect: { id: assigneeId } } : undefined,
            },
            include: {
                client: { select: { id: true, name: true } },
                assignee: { select: assigneeSelect },
            },
        });
        await this.addTimelineEvent({
            caseId: created.id,
            type: 'created',
            title: 'Case created',
            body: `Status: ${created.status}${assigneeId ? `; assigned.` : ''}`,
            createdById: actorUserId,
        });
        if (assigneeId) {
            await this.addTimelineEvent({
                caseId: created.id,
                type: 'assignment',
                title: 'Lawyer assigned',
                body: created.assignee?.email ?? assigneeId,
                createdById: actorUserId,
            });
        }
        await this.audit.logCreate('Case', created.id, actorUserId, {
            title: created.title,
            status: created.status,
            clientId: created.clientId,
            assigneeId: created.assigneeId,
        });
        await this.notifications.notifyStaff({
            title: `New case: ${created.title}`,
            body: `Status set to ${created.status}.`,
            type: 'case_update',
            entity: 'Case',
            entityId: created.id,
            href: `/cases/${created.id}`,
        }, { excludeUserId: actorUserId });
        return created;
    }
    async list(query, actor) {
        const q = query?.q?.trim();
        const status = query?.status?.trim();
        const assigneeId = query?.assigneeId?.trim();
        const where = {};
        if (status) {
            where.status = this.normalizeStatus(status);
        }
        if (assigneeId) {
            where.assigneeId = assigneeId;
        }
        if (q) {
            where.OR = [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
                { notes: { contains: q, mode: 'insensitive' } },
                { client: { name: { contains: q, mode: 'insensitive' } } },
                { assignee: { email: { contains: q, mode: 'insensitive' } } },
            ];
        }
        const scoped = await this.portal.caseWhereForActor(actor);
        if (scoped)
            Object.assign(where, scoped);
        return this.prisma.case.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                client: {
                    select: { id: true, name: true },
                },
                assignee: {
                    select: assigneeSelect,
                },
            },
        });
    }
    async getById(id, actor) {
        if (actor?.userId) {
            await this.portal.assertCaseAccess({
                userId: actor.userId,
                role: actor.role,
                caseId: id,
            });
        }
        const item = await this.prisma.case.findUnique({
            where: { id },
            include: {
                client: {
                    select: { id: true, name: true, email: true, phone: true, isActive: true },
                },
                assignee: { select: assigneeSelect },
                documents: {
                    where: { isLatest: true },
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        filename: true,
                        provider: true,
                        category: true,
                        version: true,
                        createdAt: true,
                    },
                },
                timelineEvents: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                    select: timelineSelect,
                },
            },
        });
        if (!item)
            throw new common_1.NotFoundException('case not found');
        return item;
    }
    async update(id, input, actorUserId, actorRole) {
        if (actorUserId) {
            await this.portal.assertCaseAccess({
                userId: actorUserId,
                role: actorRole,
                caseId: id,
            });
        }
        const existing = await this.prisma.case.findUnique({
            where: { id },
            include: { assignee: { select: assigneeSelect } },
        });
        if (!existing)
            throw new common_1.NotFoundException('case not found');
        const data = {};
        const timelineJobs = [];
        if (input.title !== undefined) {
            const title = input.title.trim();
            if (!title)
                throw new common_1.BadRequestException('title is required');
            data.title = title;
        }
        if (input.description !== undefined) {
            const description = typeof input.description === 'string' ? input.description.trim() : input.description;
            data.description = description || null;
        }
        if (input.status !== undefined) {
            const status = this.normalizeStatus(input.status);
            data.status = status;
            if (status !== existing.status) {
                timelineJobs.push({
                    type: 'status_change',
                    title: 'Status updated',
                    body: `${existing.status} → ${status}`,
                });
            }
        }
        if (input.notes !== undefined) {
            const notes = typeof input.notes === 'string' ? input.notes.trim() : input.notes;
            data.notes = notes || null;
        }
        if (input.courtDate !== undefined) {
            const courtDate = this.parseCourtDate(input.courtDate ?? undefined);
            data.courtDate = courtDate;
            const prev = existing.courtDate?.toISOString().slice(0, 10) ?? null;
            const next = courtDate instanceof Date ? courtDate.toISOString().slice(0, 10) : courtDate ?? null;
            if (prev !== next) {
                timelineJobs.push({
                    type: 'court_date',
                    title: 'Court date updated',
                    body: next ? `Set to ${next}` : 'Cleared',
                });
            }
        }
        if (input.clientId !== undefined) {
            const clientId = typeof input.clientId === 'string' ? input.clientId.trim() : input.clientId;
            if (!clientId) {
                data.client = { disconnect: true };
            }
            else {
                const client = await this.prisma.client.findUnique({ where: { id: clientId } });
                if (!client)
                    throw new common_1.BadRequestException('client not found');
                data.client = { connect: { id: clientId } };
            }
        }
        if (input.assigneeId !== undefined) {
            if (actorRole === 'lawyer') {
                const next = input.assigneeId === null
                    ? null
                    : await this.resolveAssigneeId(input.assigneeId || undefined);
                if (next !== actorUserId) {
                    throw new common_1.BadRequestException('lawyers cannot reassign cases to other users');
                }
            }
            const assigneeId = input.assigneeId === null
                ? null
                : await this.resolveAssigneeId(input.assigneeId || undefined);
            if (!assigneeId) {
                data.assignee = { disconnect: true };
                if (existing.assigneeId) {
                    timelineJobs.push({
                        type: 'assignment',
                        title: 'Assignee cleared',
                        body: existing.assignee?.email ?? existing.assigneeId,
                    });
                }
            }
            else {
                data.assignee = { connect: { id: assigneeId } };
                if (assigneeId !== existing.assigneeId) {
                    const nextUser = await this.prisma.user.findUnique({
                        where: { id: assigneeId },
                        select: assigneeSelect,
                    });
                    timelineJobs.push({
                        type: 'assignment',
                        title: 'Lawyer assigned',
                        body: nextUser?.email ?? assigneeId,
                    });
                }
            }
        }
        if (Object.keys(data).length === 0) {
            throw new common_1.BadRequestException('no fields to update');
        }
        const updated = await this.prisma.case.update({
            where: { id },
            data,
            include: {
                client: {
                    select: { id: true, name: true, email: true, phone: true, isActive: true },
                },
                assignee: { select: assigneeSelect },
                documents: {
                    where: { isLatest: true },
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        filename: true,
                        provider: true,
                        category: true,
                        version: true,
                        createdAt: true,
                    },
                },
                timelineEvents: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                    select: timelineSelect,
                },
            },
        });
        for (const job of timelineJobs) {
            await this.addTimelineEvent({
                caseId: updated.id,
                type: job.type,
                title: job.title,
                body: job.body,
                createdById: actorUserId,
            });
        }
        if (timelineJobs.length > 0) {
            updated.timelineEvents = await this.prisma.caseTimelineEvent.findMany({
                where: { caseId: updated.id },
                orderBy: { createdAt: 'desc' },
                take: 50,
                select: timelineSelect,
            });
        }
        await this.audit.logUpdate('Case', updated.id, actorUserId, {
            title: updated.title,
            status: updated.status,
            assigneeId: updated.assigneeId,
            fields: Object.keys(data),
        });
        await this.notifications.notifyStaff({
            title: `Case updated: ${updated.title}`,
            body: `Status: ${updated.status}.`,
            type: 'case_update',
            entity: 'Case',
            entityId: updated.id,
            href: `/cases/${updated.id}`,
        }, { excludeUserId: actorUserId });
        return updated;
    }
    async remove(id, actorUserId) {
        const existing = await this.prisma.case.findUnique({
            where: { id },
            select: { id: true, title: true },
        });
        if (!existing)
            throw new common_1.NotFoundException('case not found');
        await this.prisma.$transaction(async (tx) => {
            await tx.document.updateMany({ where: { caseId: id }, data: { caseId: null } });
            await tx.appointment.updateMany({ where: { caseId: id }, data: { caseId: null } });
            await tx.case.delete({ where: { id } });
        });
        await this.audit.logDelete('Case', id, actorUserId, {
            title: existing.title,
        });
        return { ok: true, id };
    }
    async addNote(caseId, input, actor) {
        if (actor?.userId) {
            await this.portal.assertCaseAccess({
                userId: actor.userId,
                role: actor.role,
                caseId,
            });
        }
        const existing = await this.prisma.case.findUnique({ where: { id: caseId } });
        if (!existing)
            throw new common_1.NotFoundException('case not found');
        const title = input.title?.trim();
        if (!title)
            throw new common_1.BadRequestException('title is required');
        const body = input.body?.trim() || undefined;
        return this.addTimelineEvent({
            caseId,
            type: 'note',
            title,
            body,
            createdById: actor?.userId,
        });
    }
    async addTimelineEvent(input) {
        return this.prisma.caseTimelineEvent.create({
            data: {
                caseId: input.caseId,
                type: input.type,
                title: input.title,
                body: input.body,
                createdById: input.createdById,
            },
            select: timelineSelect,
        });
    }
    async resolveAssigneeId(raw) {
        const id = typeof raw === 'string' ? raw.trim() : '';
        if (!id)
            return undefined;
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: { id: true, role: true },
        });
        if (!user)
            throw new common_1.BadRequestException('assignee not found');
        if (!ASSIGNABLE_ROLES.includes(user.role)) {
            throw new common_1.BadRequestException('assignee must be an admin or lawyer');
        }
        return user.id;
    }
    normalizeStatus(status) {
        const value = status?.trim().toLowerCase();
        if (!value)
            throw new common_1.BadRequestException('status is required');
        if (!CASE_STATUSES.includes(value)) {
            throw new common_1.BadRequestException(`status must be one of: ${CASE_STATUSES.join(', ')}`);
        }
        return value;
    }
    parseCourtDate(value) {
        if (value === undefined)
            return undefined;
        if (value === null || value.trim() === '')
            return null;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            throw new common_1.BadRequestException('courtDate must be a valid date');
        }
        return date;
    }
};
exports.CasesService = CasesService;
exports.CasesService = CasesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        notifications_service_1.NotificationsService,
        portal_scope_service_1.PortalScopeService])
], CasesService);
