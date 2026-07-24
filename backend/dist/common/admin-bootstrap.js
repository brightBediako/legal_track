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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureAdminFromEnv = ensureAdminFromEnv;
const bcrypt = __importStar(require("bcrypt"));
const BCRYPT_ROUNDS = 10;
async function ensureAdminFromEnv(prisma) {
    const emailRaw = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    const forceReset = String(process.env.ADMIN_FORCE_RESET || '').toLowerCase() === 'true';
    if (!emailRaw || !password) {
        return {
            status: 'skipped',
            reason: 'ADMIN_EMAIL / ADMIN_PASSWORD not set',
        };
    }
    if (!emailRaw.includes('@')) {
        throw new Error('ADMIN_EMAIL must be a valid email');
    }
    if (password.length < 8) {
        throw new Error('ADMIN_PASSWORD must be at least 8 characters');
    }
    const existing = await prisma.user.findUnique({
        where: { email: emailRaw },
        select: { id: true, role: true },
    });
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    if (!existing) {
        await prisma.user.create({
            data: {
                email: emailRaw,
                password: hash,
                role: 'admin',
                mustChangePassword: false,
            },
        });
        return { status: 'created', email: emailRaw };
    }
    if (existing.role !== 'admin') {
        throw new Error(`ADMIN_EMAIL ${emailRaw} already exists with role "${existing.role}"; refuse to overwrite`);
    }
    if (forceReset) {
        await prisma.user.update({
            where: { id: existing.id },
            data: { password: hash, mustChangePassword: false },
        });
        return { status: 'updated', email: emailRaw };
    }
    return { status: 'exists', email: emailRaw };
}
