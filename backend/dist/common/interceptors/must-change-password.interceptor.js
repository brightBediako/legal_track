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
exports.MustChangePasswordInterceptor = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
function isPasswordChangeAllowed(method, path) {
    if (method === 'POST' && path.endsWith('/users/me/password'))
        return true;
    if (method === 'POST' && path.endsWith('/auth/logout'))
        return true;
    if (method === 'POST' && path.endsWith('/auth/refresh'))
        return true;
    return false;
}
let MustChangePasswordInterceptor = class MustChangePasswordInterceptor {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async intercept(context, next) {
        const req = context.switchToHttp().getRequest();
        const userId = req.user?.sub;
        if (!userId) {
            return next.handle();
        }
        const method = (req.method || 'GET').toUpperCase();
        const path = (req.originalUrl || req.url || '').split('?')[0];
        if (isPasswordChangeAllowed(method, path)) {
            return next.handle();
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { mustChangePassword: true },
        });
        if (user?.mustChangePassword) {
            throw new common_1.ForbiddenException('password change required before using the system; update your password at /account');
        }
        return next.handle();
    }
};
exports.MustChangePasswordInterceptor = MustChangePasswordInterceptor;
exports.MustChangePasswordInterceptor = MustChangePasswordInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MustChangePasswordInterceptor);
