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
exports.DocumentsAccessService = void 0;
const common_1 = require("@nestjs/common");
const portal_scope_service_1 = require("../../common/portal-scope.service");
const prisma_service_1 = require("../../database/prisma.service");
const cloudinary_service_1 = require("../../documents/cloudinary.service");
const local_storage_service_1 = require("../../documents/local-storage.service");
const s3_service_1 = require("../../documents/s3.service");
let DocumentsAccessService = class DocumentsAccessService {
    constructor(prisma, localStorage, cloudinary, s3, portal) {
        this.prisma = prisma;
        this.localStorage = localStorage;
        this.cloudinary = cloudinary;
        this.s3 = s3;
        this.portal = portal;
    }
    apiBaseUrl() {
        return (process.env.PUBLIC_API_BASE_URL ||
            `http://localhost:${process.env.PORT ? Number(process.env.PORT) : 4000}`);
    }
    async getSignedAccessUrl(documentId, actor) {
        if (actor?.userId) {
            await this.portal.assertDocumentAccess({
                userId: actor.userId,
                role: actor.role,
                documentId,
            });
        }
        const doc = await this.prisma.document.findUnique({
            where: { id: documentId },
            select: { id: true, provider: true, providerKey: true, url: true },
        });
        if (!doc)
            throw new common_1.NotFoundException('document not found');
        if (!doc.providerKey) {
            throw new common_1.BadRequestException('document providerKey is missing (re-upload required)');
        }
        if (doc.provider === 'local') {
            return {
                url: `${this.apiBaseUrl()}/documents/${doc.id}/download`,
                provider: 'local',
                requiresAuth: true,
            };
        }
        if (doc.provider === 's3') {
            const url = await this.s3.getSignedDownloadUrl({ key: doc.providerKey, expiresInSeconds: 600 });
            return { url, provider: 's3', expiresInSeconds: 600 };
        }
        if (doc.provider === 'cloudinary') {
            const expiresAt = Math.floor(Date.now() / 1000) + 600;
            const url = this.cloudinary.getSignedDownloadUrl({
                publicId: doc.providerKey,
                expiresAtUnixSeconds: expiresAt,
            });
            return { url, provider: 'cloudinary', expiresInSeconds: 600 };
        }
        return { url: doc.url };
    }
    async getLocalDownload(documentId, actor) {
        if (actor?.userId) {
            await this.portal.assertDocumentAccess({
                userId: actor.userId,
                role: actor.role,
                documentId,
            });
        }
        const doc = await this.prisma.document.findUnique({
            where: { id: documentId },
            select: { id: true, filename: true, provider: true, providerKey: true },
        });
        if (!doc)
            throw new common_1.NotFoundException('document not found');
        if (doc.provider !== 'local') {
            throw new common_1.BadRequestException('download endpoint is only for local documents');
        }
        if (!doc.providerKey) {
            throw new common_1.BadRequestException('document providerKey is missing (re-upload required)');
        }
        const absolutePath = await this.localStorage.getAbsolutePath(doc.providerKey);
        return { absolutePath, filename: doc.filename };
    }
};
exports.DocumentsAccessService = DocumentsAccessService;
exports.DocumentsAccessService = DocumentsAccessService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        local_storage_service_1.LocalStorageService,
        cloudinary_service_1.CloudinaryService,
        s3_service_1.S3Service,
        portal_scope_service_1.PortalScopeService])
], DocumentsAccessService);
