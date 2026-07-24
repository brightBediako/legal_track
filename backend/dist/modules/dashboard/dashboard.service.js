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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const portal_scope_service_1 = require("../../common/portal-scope.service");
const prisma_service_1 = require("../../database/prisma.service");
let DashboardService = class DashboardService {
    constructor(prisma, portal) {
        this.prisma = prisma;
        this.portal = portal;
    }
    async summary(actor) {
        if (this.portal.isClientRole(actor?.role) && actor?.userId) {
            return this.clientSummary(actor.userId);
        }
        if (this.portal.isLawyerRole(actor?.role) && actor?.userId) {
            return this.lawyerSummary(actor.userId);
        }
        return this.staffSummary();
    }
    async search(q, actor) {
        const term = q?.trim();
        if (!term) {
            return { clients: [], cases: [] };
        }
        if (this.portal.isClientRole(actor?.role) && actor?.userId) {
            const clientId = await this.portal.requireLinkedClientId(actor.userId);
            const cases = await this.prisma.case.findMany({
                where: {
                    clientId,
                    OR: [
                        { title: { contains: term, mode: 'insensitive' } },
                        { description: { contains: term, mode: 'insensitive' } },
                        { notes: { contains: term, mode: 'insensitive' } },
                    ],
                },
                take: 8,
                orderBy: { updatedAt: 'desc' },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    courtDate: true,
                    client: { select: { id: true, name: true } },
                },
            });
            return { clients: [], cases };
        }
        const caseScope = await this.portal.caseWhereForActor(actor);
        const clientSearchOr = [
            { name: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
            { phone: { contains: term, mode: 'insensitive' } },
        ];
        const clientWhere = this.portal.isLawyerRole(actor?.role) && actor?.userId
            ? {
                cases: { some: { assigneeId: actor.userId } },
                OR: clientSearchOr,
            }
            : { OR: clientSearchOr };
        const [clients, cases] = await Promise.all([
            this.prisma.client.findMany({
                where: clientWhere,
                take: 8,
                orderBy: { name: 'asc' },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    isActive: true,
                },
            }),
            this.prisma.case.findMany({
                where: {
                    ...(caseScope ?? {}),
                    OR: [
                        { title: { contains: term, mode: 'insensitive' } },
                        { description: { contains: term, mode: 'insensitive' } },
                        { notes: { contains: term, mode: 'insensitive' } },
                        { client: { name: { contains: term, mode: 'insensitive' } } },
                    ],
                },
                take: 8,
                orderBy: { updatedAt: 'desc' },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    courtDate: true,
                    client: { select: { id: true, name: true } },
                },
            }),
        ]);
        return { clients, cases };
    }
    async staffSummary() {
        const now = new Date();
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const [clientsActive, clientsInactive, casesOpen, casesPending, casesClosed, casesTotal, documentsTotal, recentDocuments, upcomingCourtDates, recentCases,] = await Promise.all([
            this.prisma.client.count({ where: { isActive: true } }),
            this.prisma.client.count({ where: { isActive: false } }),
            this.prisma.case.count({ where: { status: 'open' } }),
            this.prisma.case.count({ where: { status: 'pending' } }),
            this.prisma.case.count({ where: { status: 'closed' } }),
            this.prisma.case.count(),
            this.prisma.document.count(),
            this.prisma.document.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    filename: true,
                    provider: true,
                    createdAt: true,
                    case: { select: { id: true, title: true } },
                },
            }),
            this.prisma.case.findMany({
                where: {
                    courtDate: { gte: now, lte: in30Days },
                    status: { not: 'closed' },
                },
                orderBy: { courtDate: 'asc' },
                take: 5,
                select: {
                    id: true,
                    title: true,
                    status: true,
                    courtDate: true,
                    client: { select: { id: true, name: true } },
                },
            }),
            this.prisma.case.findMany({
                take: 5,
                orderBy: { updatedAt: 'desc' },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    updatedAt: true,
                    client: { select: { id: true, name: true } },
                },
            }),
        ]);
        return {
            scope: 'staff',
            metrics: {
                clientsActive,
                clientsInactive,
                casesOpen,
                casesPending,
                casesClosed,
                casesTotal,
                documentsTotal,
            },
            recentDocuments,
            upcomingCourtDates,
            recentCases,
        };
    }
    async lawyerSummary(userId) {
        const now = new Date();
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const assigned = { assigneeId: userId };
        const [clientsActive, casesOpen, casesPending, casesClosed, casesTotal, documentsTotal, recentDocuments, upcomingCourtDates, recentCases, upcomingAppointments,] = await Promise.all([
            this.prisma.client.count({
                where: { isActive: true, cases: { some: assigned } },
            }),
            this.prisma.case.count({ where: { ...assigned, status: 'open' } }),
            this.prisma.case.count({ where: { ...assigned, status: 'pending' } }),
            this.prisma.case.count({ where: { ...assigned, status: 'closed' } }),
            this.prisma.case.count({ where: assigned }),
            this.prisma.document.count({ where: { case: assigned } }),
            this.prisma.document.findMany({
                where: { case: assigned },
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    filename: true,
                    provider: true,
                    createdAt: true,
                    case: { select: { id: true, title: true } },
                },
            }),
            this.prisma.case.findMany({
                where: {
                    ...assigned,
                    courtDate: { gte: now, lte: in30Days },
                    status: { not: 'closed' },
                },
                orderBy: { courtDate: 'asc' },
                take: 5,
                select: {
                    id: true,
                    title: true,
                    status: true,
                    courtDate: true,
                    client: { select: { id: true, name: true } },
                },
            }),
            this.prisma.case.findMany({
                where: assigned,
                take: 5,
                orderBy: { updatedAt: 'desc' },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    updatedAt: true,
                    client: { select: { id: true, name: true } },
                },
            }),
            this.prisma.appointment.findMany({
                where: {
                    status: 'scheduled',
                    startsAt: { gte: now },
                    OR: [
                        { case: assigned },
                        { client: { cases: { some: assigned } } },
                    ],
                },
                orderBy: { startsAt: 'asc' },
                take: 5,
                select: {
                    id: true,
                    title: true,
                    type: true,
                    startsAt: true,
                    status: true,
                },
            }),
        ]);
        return {
            scope: 'lawyer',
            metrics: {
                clientsActive,
                clientsInactive: 0,
                casesOpen,
                casesPending,
                casesClosed,
                casesTotal,
                documentsTotal,
            },
            recentDocuments,
            upcomingCourtDates,
            recentCases,
            upcomingAppointments,
        };
    }
    async clientSummary(userId) {
        const clientId = await this.portal.requireLinkedClientId(userId);
        const now = new Date();
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const [casesOpen, casesPending, casesClosed, casesTotal, documentsTotal, recentDocuments, upcomingCourtDates, recentCases, upcomingAppointments,] = await Promise.all([
            this.prisma.case.count({ where: { clientId, status: 'open' } }),
            this.prisma.case.count({ where: { clientId, status: 'pending' } }),
            this.prisma.case.count({ where: { clientId, status: 'closed' } }),
            this.prisma.case.count({ where: { clientId } }),
            this.prisma.document.count({ where: { case: { clientId } } }),
            this.prisma.document.findMany({
                where: { case: { clientId } },
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    filename: true,
                    provider: true,
                    createdAt: true,
                    case: { select: { id: true, title: true } },
                },
            }),
            this.prisma.case.findMany({
                where: {
                    clientId,
                    courtDate: { gte: now, lte: in30Days },
                    status: { not: 'closed' },
                },
                orderBy: { courtDate: 'asc' },
                take: 5,
                select: {
                    id: true,
                    title: true,
                    status: true,
                    courtDate: true,
                    client: { select: { id: true, name: true } },
                },
            }),
            this.prisma.case.findMany({
                where: { clientId },
                take: 5,
                orderBy: { updatedAt: 'desc' },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    updatedAt: true,
                    client: { select: { id: true, name: true } },
                },
            }),
            this.prisma.appointment.findMany({
                where: {
                    clientId,
                    status: 'scheduled',
                    startsAt: { gte: now },
                },
                orderBy: { startsAt: 'asc' },
                take: 5,
                select: {
                    id: true,
                    title: true,
                    type: true,
                    startsAt: true,
                    status: true,
                },
            }),
        ]);
        return {
            scope: 'client',
            metrics: {
                clientsActive: 0,
                clientsInactive: 0,
                casesOpen,
                casesPending,
                casesClosed,
                casesTotal,
                documentsTotal,
            },
            recentDocuments,
            upcomingCourtDates,
            recentCases,
            upcomingAppointments,
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        portal_scope_service_1.PortalScopeService])
], DashboardService);
