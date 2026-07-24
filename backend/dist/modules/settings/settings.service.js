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
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const rbac_matrix_1 = require("../../common/rbac-matrix");
const prisma_service_1 = require("../../database/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const SETTINGS_ID = 'default';
let SettingsService = class SettingsService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async get() {
        return this.ensure();
    }
    rbacMatrix() {
        return { roles: rbac_matrix_1.RBAC_MATRIX };
    }
    async update(input, actorUserId) {
        await this.ensure();
        const data = {};
        if (input.firmName !== undefined) {
            const firmName = input.firmName.trim();
            if (!firmName)
                throw new common_1.BadRequestException('firmName is required');
            data.firmName = firmName;
        }
        if (input.supportEmail !== undefined) {
            const email = typeof input.supportEmail === 'string' ? input.supportEmail.trim() : input.supportEmail;
            data.supportEmail = email || null;
        }
        if (input.supportPhone !== undefined) {
            const phone = typeof input.supportPhone === 'string' ? input.supportPhone.trim() : input.supportPhone;
            data.supportPhone = phone || null;
        }
        if (input.timezone !== undefined) {
            const timezone = input.timezone.trim();
            if (!timezone)
                throw new common_1.BadRequestException('timezone is required');
            data.timezone = timezone;
        }
        if (Object.keys(data).length === 0) {
            throw new common_1.BadRequestException('no fields to update');
        }
        const updated = await this.prisma.systemSettings.update({
            where: { id: SETTINGS_ID },
            data,
        });
        await this.audit.logUpdate('SystemSettings', SETTINGS_ID, actorUserId, {
            fields: Object.keys(data),
        });
        return updated;
    }
    async ensure() {
        return this.prisma.systemSettings.upsert({
            where: { id: SETTINGS_ID },
            create: {
                id: SETTINGS_ID,
                firmName: 'LegalTrack',
                timezone: 'Africa/Accra',
            },
            update: {},
        });
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], SettingsService);
