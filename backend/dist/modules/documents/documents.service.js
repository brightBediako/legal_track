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
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const portal_scope_service_1 = require("../../common/portal-scope.service");
const prisma_service_1 = require("../../database/prisma.service");
const document_categories_1 = require("../../documents/document-categories");
const cloudinary_service_1 = require("../../documents/cloudinary.service");
const local_storage_service_1 = require("../../documents/local-storage.service");
const s3_service_1 = require("../../documents/s3.service");
const audit_service_1 = require("../audit/audit.service");
const notifications_service_1 = require("../notifications/notifications.service");
const documentListSelect = {
    id: true,
    filename: true,
    provider: true,
    caseId: true,
    category: true,
    version: true,
    isLatest: true,
    rootDocumentId: true,
    createdAt: true,
    case: {
        select: { id: true, title: true },
    },
};
let DocumentsService = class DocumentsService {
    constructor(prisma, localStorage, cloudinary, s3, audit, notifications, portal) {
        this.prisma = prisma;
        this.localStorage = localStorage;
        this.cloudinary = cloudinary;
        this.s3 = s3;
        this.audit = audit;
        this.notifications = notifications;
        this.portal = portal;
    }
    async list(query, actor) {
        const where = {};
        const scoped = await this.portal.documentWhereForActor(actor);
        if (scoped)
            Object.assign(where, scoped);
        const caseId = query?.caseId?.trim();
        if (caseId) {
            await this.portal.assertCaseAccess({
                userId: actor?.userId ?? '',
                role: actor?.role,
                caseId,
            });
            where.caseId = caseId;
        }
        if (query?.category?.trim()) {
            where.category = (0, document_categories_1.parseDocumentCategory)(query.category);
        }
        const latestOnly = query?.latestOnly !== '0' && query?.latestOnly !== 'false';
        if (latestOnly) {
            where.isLatest = true;
        }
        return this.prisma.document.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }],
            select: documentListSelect,
        });
    }
    async listVersions(documentId, actor) {
        await this.portal.assertDocumentAccess({
            userId: actor?.userId ?? '',
            role: actor?.role,
            documentId,
        });
        const doc = await this.prisma.document.findUnique({
            where: { id: documentId },
            select: { id: true, rootDocumentId: true },
        });
        if (!doc)
            throw new common_1.NotFoundException('document not found');
        const rootId = doc.rootDocumentId ?? doc.id;
        return this.prisma.document.findMany({
            where: {
                OR: [{ id: rootId }, { rootDocumentId: rootId }],
            },
            orderBy: { version: 'desc' },
            select: documentListSelect,
        });
    }
    async updateCategory(id, input, actor) {
        await this.portal.assertDocumentAccess({
            userId: actor?.userId ?? '',
            role: actor?.role,
            documentId: id,
        });
        const existing = await this.prisma.document.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('document not found');
        if (input.category === undefined) {
            return this.prisma.document.findUnique({
                where: { id },
                select: documentListSelect,
            });
        }
        const category = (0, document_categories_1.parseDocumentCategory)(input.category);
        const updated = await this.prisma.document.update({
            where: { id },
            data: { category },
            select: documentListSelect,
        });
        await this.audit.logUpdate('Document', id, actor?.userId, {
            category: { from: existing.category, to: category },
        });
        return updated;
    }
    async uploadAndCreateRecord(input, actor) {
        const provider = input.provider || 'local';
        let caseId = input.caseId?.trim() || undefined;
        let category = (0, document_categories_1.parseDocumentCategory)(input.category);
        const actorUserId = actor?.userId;
        const replacesDocumentId = input.replacesDocumentId?.trim() || undefined;
        if (provider !== 'local' && provider !== 'cloudinary' && provider !== 's3') {
            throw new common_1.BadRequestException('provider must be local, cloudinary, or s3');
        }
        let version = 1;
        let rootDocumentId;
        let previousLatestId;
        if (replacesDocumentId) {
            await this.portal.assertDocumentAccess({
                userId: actorUserId ?? '',
                role: actor?.role,
                documentId: replacesDocumentId,
            });
            const previous = await this.prisma.document.findUnique({
                where: { id: replacesDocumentId },
            });
            if (!previous)
                throw new common_1.NotFoundException('document to replace not found');
            const rootId = previous.rootDocumentId ?? previous.id;
            rootDocumentId = rootId;
            caseId = previous.caseId ?? caseId;
            if (input.category === undefined) {
                category = (0, document_categories_1.parseDocumentCategory)(previous.category);
            }
            const aggregate = await this.prisma.document.aggregate({
                where: {
                    OR: [{ id: rootId }, { rootDocumentId: rootId }],
                },
                _max: { version: true },
            });
            version = (aggregate._max.version ?? previous.version) + 1;
            const latest = await this.prisma.document.findFirst({
                where: {
                    isLatest: true,
                    OR: [{ id: rootId }, { rootDocumentId: rootId }],
                },
                select: { id: true },
            });
            previousLatestId = latest?.id;
        }
        if (this.portal.isClientRole(actor?.role)) {
            if (!actorUserId)
                throw new common_1.BadRequestException('unauthorized');
            if (!caseId) {
                throw new common_1.BadRequestException('clients must upload documents to one of their cases');
            }
            await this.portal.assertCaseAccess({
                userId: actorUserId,
                role: actor?.role,
                caseId,
            });
        }
        else if (this.portal.isLawyerRole(actor?.role)) {
            if (!actorUserId)
                throw new common_1.BadRequestException('unauthorized');
            if (!caseId) {
                throw new common_1.BadRequestException('lawyers must upload documents to an assigned case');
            }
            await this.portal.assertCaseAccess({
                userId: actorUserId,
                role: actor?.role,
                caseId,
            });
        }
        else if (caseId) {
            const matter = await this.prisma.case.findUnique({
                where: { id: caseId },
                select: { id: true },
            });
            if (!matter)
                throw new common_1.BadRequestException('case not found');
        }
        let url;
        let providerKey;
        if (provider === 'local') {
            const res = await this.localStorage.storeLocalFile(input.filePath, input.originalName);
            url = res.url;
            providerKey = res.key;
        }
        else if (provider === 'cloudinary') {
            const res = await this.cloudinary.uploadLocalFile(input.filePath, 'documents');
            url = res.secure_url || res.url;
            providerKey = res.public_id;
        }
        else {
            const key = `documents/${Date.now()}-${input.originalName}`;
            const res = await this.s3.uploadLocalFile(input.filePath, key);
            url = res.url;
            providerKey = res.key;
        }
        const doc = await this.prisma.$transaction(async (tx) => {
            if (previousLatestId) {
                await tx.document.update({
                    where: { id: previousLatestId },
                    data: { isLatest: false },
                });
            }
            return tx.document.create({
                data: {
                    filename: input.originalName,
                    url,
                    provider,
                    providerKey,
                    category,
                    version,
                    isLatest: true,
                    case: caseId ? { connect: { id: caseId } } : undefined,
                    rootDocument: rootDocumentId ? { connect: { id: rootDocumentId } } : undefined,
                },
                select: documentListSelect,
            });
        });
        await this.audit.logCreate('Document', doc.id, actorUserId, {
            filename: doc.filename,
            provider: doc.provider,
            caseId: doc.caseId,
            category: doc.category,
            version: doc.version,
            replacesDocumentId,
        });
        await this.notifications.notifyStaff({
            title: `Document uploaded: ${doc.filename}`,
            body: replacesDocumentId
                ? `New version v${doc.version} (${doc.category}).`
                : doc.caseId
                    ? `Linked to a case (${doc.category}).`
                    : `No case linked (${doc.category}).`,
            type: 'document',
            entity: 'Document',
            entityId: doc.id,
            href: doc.caseId ? `/cases/${doc.caseId}` : '/documents',
        }, { excludeUserId: actorUserId });
        return doc;
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        local_storage_service_1.LocalStorageService,
        cloudinary_service_1.CloudinaryService,
        s3_service_1.S3Service,
        audit_service_1.AuditService,
        notifications_service_1.NotificationsService,
        portal_scope_service_1.PortalScopeService])
], DocumentsService);
