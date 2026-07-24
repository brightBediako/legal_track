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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../../database/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const STAFF_ROLES = ['admin', 'lawyer', 'clerk'];
const BCRYPT_ROUNDS = 10;
const userPublicSelect = {
    id: true,
    email: true,
    role: true,
    clientId: true,
    mustChangePassword: true,
    createdAt: true,
    updatedAt: true,
    client: { select: { id: true, name: true, email: true } },
};
let UsersService = class UsersService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async list(query) {
        const q = query?.q?.trim();
        const role = query?.role?.trim();
        const where = {};
        if (role) {
            where.role = this.parseRole(role);
        }
        if (q) {
            where.email = { contains: q, mode: 'insensitive' };
        }
        return this.prisma.user.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            select: userPublicSelect,
        });
    }
    async listAssignable() {
        return this.prisma.user.findMany({
            where: { role: { in: ['admin', 'lawyer'] } },
            orderBy: { email: 'asc' },
            select: { id: true, email: true, role: true },
        });
    }
    async getById(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: userPublicSelect,
        });
        if (!user)
            throw new common_1.NotFoundException('user not found');
        return user;
    }
    async create(input, actorUserId) {
        const email = this.normalizeEmail(input.email);
        const password = input.password;
        const role = this.parseStaffRole(input.role);
        if (!password || password.length < 8) {
            throw new common_1.BadRequestException('password must be at least 8 characters');
        }
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new common_1.BadRequestException('email is already registered');
        }
        const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const user = await this.prisma.user.create({
            data: {
                email,
                password: hash,
                role,
                mustChangePassword: false,
            },
            select: userPublicSelect,
        });
        await this.audit.logCreate('User', user.id, actorUserId, {
            email: user.email,
            role: user.role,
        });
        return user;
    }
    async update(id, input, actorUserId) {
        const existing = await this.prisma.user.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('user not found');
        if (existing.role === 'client') {
            throw new common_1.BadRequestException('client portal accounts are managed via client registration; reset password from the account page or recreate the client');
        }
        const data = {};
        if (input.email !== undefined) {
            const email = this.normalizeEmail(input.email);
            if (email !== existing.email) {
                const clash = await this.prisma.user.findUnique({ where: { email } });
                if (clash)
                    throw new common_1.BadRequestException('email is already registered');
            }
            data.email = email;
        }
        if (input.role !== undefined) {
            const role = this.parseStaffRole(input.role);
            if (existing.role === 'admin' && role !== 'admin') {
                const adminCount = await this.prisma.user.count({ where: { role: 'admin' } });
                if (adminCount <= 1) {
                    throw new common_1.BadRequestException('cannot demote the last admin');
                }
            }
            data.role = role;
        }
        if (input.password !== undefined) {
            if (!input.password || input.password.length < 8) {
                throw new common_1.BadRequestException('password must be at least 8 characters');
            }
            data.password = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
            data.mustChangePassword = false;
        }
        if (Object.keys(data).length === 0) {
            throw new common_1.BadRequestException('no fields to update');
        }
        const user = await this.prisma.user.update({
            where: { id },
            data,
            select: userPublicSelect,
        });
        await this.audit.logUpdate('User', user.id, actorUserId, {
            email: user.email,
            role: user.role,
            fields: Object.keys(data).map((k) => (k === 'password' ? 'password' : k)),
        });
        return user;
    }
    async changeOwnPassword(userId, input) {
        const currentPassword = input.currentPassword;
        const newPassword = input.newPassword;
        if (!currentPassword || !newPassword) {
            throw new common_1.BadRequestException('currentPassword and newPassword are required');
        }
        if (newPassword.length < 8) {
            throw new common_1.BadRequestException('newPassword must be at least 8 characters');
        }
        if (newPassword === currentPassword) {
            throw new common_1.BadRequestException('newPassword must be different from the current password');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, password: true, mustChangePassword: true },
        });
        if (!user)
            throw new common_1.NotFoundException('user not found');
        const ok = await bcrypt.compare(currentPassword, user.password);
        if (!ok) {
            throw new common_1.BadRequestException('current password is incorrect');
        }
        const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hash, mustChangePassword: false },
        });
        await this.audit.logUpdate('User', user.id, userId, {
            email: user.email,
            fields: ['password', 'mustChangePassword'],
            selfService: true,
        });
        return { ok: true, mustChangePassword: false };
    }
    normalizeEmail(email) {
        const value = email?.trim().toLowerCase();
        if (!value || !value.includes('@')) {
            throw new common_1.BadRequestException('a valid email is required');
        }
        return value;
    }
    parseStaffRole(role) {
        const value = role?.trim().toLowerCase();
        if (!value || !STAFF_ROLES.includes(value)) {
            throw new common_1.BadRequestException(`role must be one of: ${STAFF_ROLES.join(', ')}. Client portal accounts are created when registering a client.`);
        }
        return value;
    }
    parseRole(role) {
        const value = role?.trim().toLowerCase();
        const all = ['admin', 'lawyer', 'clerk', 'client'];
        if (!value || !all.includes(value)) {
            throw new common_1.BadRequestException(`role must be one of: ${all.join(', ')}`);
        }
        return value;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], UsersService);
