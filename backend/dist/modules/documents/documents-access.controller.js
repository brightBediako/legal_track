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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsAccessController = void 0;
const common_1 = require("@nestjs/common");
const node_fs_1 = require("node:fs");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const role_enum_1 = require("../../common/enums/role.enum");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const documents_access_service_1 = require("./documents-access.service");
let DocumentsAccessController = class DocumentsAccessController {
    constructor(access) {
        this.access = access;
    }
    async accessUrl(id, user) {
        return this.access.getSignedAccessUrl(id, { userId: user?.sub, role: user?.role });
    }
    async download(id, user, res) {
        const file = await this.access.getLocalDownload(id, {
            userId: user?.sub,
            role: user?.role,
        });
        res?.set({
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(file.filename)}"`,
        });
        return new common_1.StreamableFile((0, node_fs_1.createReadStream)(file.absolutePath));
    }
};
exports.DocumentsAccessController = DocumentsAccessController;
__decorate([
    (0, common_1.Get)(':id/access'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DocumentsAccessController.prototype, "accessUrl", null);
__decorate([
    (0, common_1.Get)(':id/download'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentsAccessController.prototype, "download", null);
exports.DocumentsAccessController = DocumentsAccessController = __decorate([
    (0, common_1.Controller)('documents'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.admin, role_enum_1.Role.lawyer, role_enum_1.Role.clerk, role_enum_1.Role.client),
    __metadata("design:paramtypes", [documents_access_service_1.DocumentsAccessService])
], DocumentsAccessController);
