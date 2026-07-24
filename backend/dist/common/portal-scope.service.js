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
exports.PortalScopeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
let PortalScopeService = class PortalScopeService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    isClientRole(role) {
        return role === 'client';
    }
    isLawyerRole(role) {
        return role === 'lawyer';
    }
    isFirmWideStaff(role) {
        return role === 'admin' || role === 'clerk';
    }
    async getLinkedClientId(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { clientId: true, role: true },
        });
        if (!user || user.role !== 'client')
            return null;
        return user.clientId;
    }
    async requireLinkedClientId(userId) {
        const clientId = await this.getLinkedClientId(userId);
        if (!clientId) {
            throw new common_1.ForbiddenException('client account is not linked to a client profile; ask an admin to link it');
        }
        return clientId;
    }
    async caseWhereForActor(actor) {
        if (!actor?.userId || !actor.role)
            return undefined;
        if (this.isClientRole(actor.role)) {
            return { clientId: await this.requireLinkedClientId(actor.userId) };
        }
        if (this.isLawyerRole(actor.role)) {
            return { assigneeId: actor.userId };
        }
        return undefined;
    }
    async documentWhereForActor(actor) {
        if (!actor?.userId || !actor.role)
            return undefined;
        if (this.isClientRole(actor.role)) {
            return { case: { clientId: await this.requireLinkedClientId(actor.userId) } };
        }
        if (this.isLawyerRole(actor.role)) {
            return { case: { assigneeId: actor.userId } };
        }
        return undefined;
    }
    async appointmentWhereForActor(actor) {
        if (!actor?.userId || !actor.role)
            return undefined;
        if (this.isClientRole(actor.role)) {
            return { clientId: await this.requireLinkedClientId(actor.userId) };
        }
        if (this.isLawyerRole(actor.role)) {
            return {
                OR: [
                    { case: { assigneeId: actor.userId } },
                    { client: { cases: { some: { assigneeId: actor.userId } } } },
                ],
            };
        }
        return undefined;
    }
    async assertCaseAccess(input) {
        if (this.isFirmWideStaff(input.role) || !input.role)
            return;
        if (this.isClientRole(input.role)) {
            const clientId = await this.requireLinkedClientId(input.userId);
            const item = await this.prisma.case.findFirst({
                where: { id: input.caseId, clientId },
                select: { id: true },
            });
            if (!item)
                throw new common_1.ForbiddenException('not allowed to access this case');
            return;
        }
        if (this.isLawyerRole(input.role)) {
            const item = await this.prisma.case.findFirst({
                where: { id: input.caseId, assigneeId: input.userId },
                select: { id: true },
            });
            if (!item) {
                throw new common_1.ForbiddenException('not allowed to access this case (not assigned to you)');
            }
        }
    }
    async assertDocumentAccess(input) {
        if (this.isFirmWideStaff(input.role) || !input.role)
            return;
        if (this.isClientRole(input.role)) {
            const clientId = await this.requireLinkedClientId(input.userId);
            const doc = await this.prisma.document.findFirst({
                where: {
                    id: input.documentId,
                    case: { clientId },
                },
                select: { id: true },
            });
            if (!doc)
                throw new common_1.ForbiddenException('not allowed to access this document');
            return;
        }
        if (this.isLawyerRole(input.role)) {
            const doc = await this.prisma.document.findFirst({
                where: {
                    id: input.documentId,
                    case: { assigneeId: input.userId },
                },
                select: { id: true },
            });
            if (!doc) {
                throw new common_1.ForbiddenException('not allowed to access this document (case not assigned)');
            }
        }
    }
    async assertAppointmentAccess(input) {
        if (this.isFirmWideStaff(input.role) || !input.role)
            return;
        if (this.isClientRole(input.role)) {
            const clientId = await this.requireLinkedClientId(input.userId);
            const item = await this.prisma.appointment.findFirst({
                where: { id: input.appointmentId, clientId },
                select: { id: true },
            });
            if (!item)
                throw new common_1.ForbiddenException('not allowed to access this appointment');
            return;
        }
        if (this.isLawyerRole(input.role)) {
            const item = await this.prisma.appointment.findFirst({
                where: {
                    id: input.appointmentId,
                    OR: [
                        { case: { assigneeId: input.userId } },
                        { client: { cases: { some: { assigneeId: input.userId } } } },
                    ],
                },
                select: { id: true },
            });
            if (!item) {
                throw new common_1.ForbiddenException('not allowed to access this appointment');
            }
        }
    }
    async assertLawyerCanUseCase(input) {
        if (!this.isLawyerRole(input.role))
            return;
        await this.assertCaseAccess(input);
    }
};
exports.PortalScopeService = PortalScopeService;
exports.PortalScopeService = PortalScopeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PortalScopeService);
