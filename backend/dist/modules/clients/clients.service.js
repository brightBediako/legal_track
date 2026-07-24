"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientsService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../../database/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const BCRYPT_ROUNDS = 10;
let ClientsService = class ClientsService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async create(input, actorUserId) {
        const name = input.name?.trim();
        if (!name) {
            throw new common_1.BadRequestException('name is required');
        }
        const email = this.normalizeEmail(input.email);
        const phone = this.normalizePhone(input.phone);
        const existingUser = await this.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new common_1.BadRequestException('a user account already exists for this email; use a different email for the client portal');
        }
        const passwordHash = await bcrypt.hash(phone, BCRYPT_ROUNDS);
        const client = await this.prisma.$transaction(async (tx) => {
            const created = await tx.client.create({
                data: { name, email, phone },
            });
            await tx.user.create({
                data: {
                    email,
                    password: passwordHash,
                    role: 'client',
                    mustChangePassword: true,
                    client: { connect: { id: created.id } },
                },
            });
            return created;
        });
        await this.audit.logCreate('Client', client.id, actorUserId, {
            name: client.name,
            portalAccount: true,
            email,
        });
        return {
            ...client,
            portalAccount: {
                email,
                temporaryPassword: 'phone',
                mustChangePassword: true,
                message: 'Portal login created. Client signs in with their email; temporary password is their phone number. They must change it on first login.',
            },
        };
    }
    async list(query) {
        const q = query?.q?.trim();
        const where = q
            ? {
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { email: { contains: q, mode: 'insensitive' } },
                    { phone: { contains: q, mode: 'insensitive' } },
                ],
            }
            : {};
        return this.prisma.client.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                portalUser: {
                    select: { id: true, email: true, mustChangePassword: true },
                },
            },
        });
    }
    async getById(id) {
        const client = await this.prisma.client.findUnique({
            where: { id },
            include: {
                portalUser: {
                    select: {
                        id: true,
                        email: true,
                        mustChangePassword: true,
                        createdAt: true,
                    },
                },
                cases: {
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        courtDate: true,
                        createdAt: true,
                        documents: {
                            orderBy: { createdAt: 'desc' },
                            select: {
                                id: true,
                                filename: true,
                                provider: true,
                                createdAt: true,
                            },
                        },
                    },
                },
            },
        });
        if (!client)
            throw new common_1.NotFoundException('client not found');
        return client;
    }
    async update(id, input, actorUserId) {
        const existing = await this.prisma.client.findUnique({
            where: { id },
            include: { portalUser: { select: { id: true, email: true } } },
        });
        if (!existing)
            throw new common_1.NotFoundException('client not found');
        const data = {};
        if (input.name !== undefined) {
            const name = input.name.trim();
            if (!name)
                throw new common_1.BadRequestException('name is required');
            data.name = name;
        }
        if (input.email !== undefined) {
            const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : input.email;
            if (!email) {
                throw new common_1.BadRequestException('email is required for portal clients');
            }
            if (!email.includes('@')) {
                throw new common_1.BadRequestException('a valid email is required');
            }
            if (existing.portalUser && email !== existing.portalUser.email) {
                const clash = await this.prisma.user.findUnique({ where: { email } });
                if (clash && clash.id !== existing.portalUser.id) {
                    throw new common_1.BadRequestException('email is already registered to another user');
                }
                await this.prisma.user.update({
                    where: { id: existing.portalUser.id },
                    data: { email },
                });
            }
            data.email = email;
        }
        if (input.phone !== undefined) {
            const phone = typeof input.phone === 'string' ? input.phone.trim() : input.phone;
            if (!phone) {
                throw new common_1.BadRequestException('phone is required for portal clients');
            }
            data.phone = phone;
        }
        if (input.isActive !== undefined) {
            data.isActive = Boolean(input.isActive);
        }
        if (Object.keys(data).length === 0) {
            throw new common_1.BadRequestException('no fields to update');
        }
        const client = await this.prisma.client.update({
            where: { id },
            data,
            include: {
                portalUser: {
                    select: { id: true, email: true, mustChangePassword: true },
                },
            },
        });
        await this.audit.logUpdate('Client', client.id, actorUserId, {
            name: client.name,
            isActive: client.isActive,
            fields: Object.keys(data),
        });
        return client;
    }
    async remove(id, actorUserId) {
        const existing = await this.prisma.client.findUnique({
            where: { id },
            include: {
                _count: { select: { cases: true } },
                portalUser: { select: { id: true } },
            },
        });
        if (!existing)
            throw new common_1.NotFoundException('client not found');
        if (existing._count.cases > 0) {
            throw new common_1.BadRequestException('client has linked cases; reassign or delete those cases first');
        }
        await this.prisma.$transaction(async (tx) => {
            if (existing.portalUser) {
                await tx.user.delete({ where: { id: existing.portalUser.id } });
            }
            await tx.client.delete({ where: { id } });
        });
        await this.audit.logDelete('Client', id, actorUserId, {
            name: existing.name,
        });
        return { ok: true, id };
    }
    normalizeEmail(email) {
        const value = email?.trim().toLowerCase();
        if (!value || !value.includes('@')) {
            throw new common_1.BadRequestException('email is required; it becomes the client portal login username');
        }
        return value;
    }
    normalizePhone(phone) {
        const value = phone?.trim();
        if (!value) {
            throw new common_1.BadRequestException('phone is required; it becomes the temporary portal password until first login');
        }
        if (value.length < 8) {
            throw new common_1.BadRequestException('phone must be at least 8 characters (used as the temporary password)');
        }
        return value;
    }
};
exports.ClientsService = ClientsService;
exports.ClientsService = ClientsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], ClientsService);
