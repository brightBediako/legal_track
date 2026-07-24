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
var AdminBootstrapService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminBootstrapService = void 0;
const common_1 = require("@nestjs/common");
const admin_bootstrap_1 = require("../../common/admin-bootstrap");
const prisma_service_1 = require("../../database/prisma.service");
let AdminBootstrapService = AdminBootstrapService_1 = class AdminBootstrapService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(AdminBootstrapService_1.name);
    }
    async onModuleInit() {
        try {
            const result = await (0, admin_bootstrap_1.ensureAdminFromEnv)(this.prisma);
            if (result.status === 'skipped') {
                this.logger.warn(`Admin bootstrap skipped: ${result.reason}`);
                return;
            }
            if (result.status === 'created') {
                this.logger.log(`Bootstrap admin created: ${result.email}`);
                return;
            }
            if (result.status === 'updated') {
                this.logger.log(`Bootstrap admin password reset from env: ${result.email}`);
                return;
            }
            this.logger.log(`Bootstrap admin already present: ${result.email}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`Admin bootstrap failed: ${message}`);
            if (process.env.NODE_ENV === 'production') {
                throw err;
            }
        }
    }
};
exports.AdminBootstrapService = AdminBootstrapService;
exports.AdminBootstrapService = AdminBootstrapService = AdminBootstrapService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminBootstrapService);
