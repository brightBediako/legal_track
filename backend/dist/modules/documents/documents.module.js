"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsModule = void 0;
const common_1 = require("@nestjs/common");
const cloudinary_service_1 = require("../../documents/cloudinary.service");
const local_storage_service_1 = require("../../documents/local-storage.service");
const s3_service_1 = require("../../documents/s3.service");
const auth_module_1 = require("../auth/auth.module");
const documents_access_controller_1 = require("./documents-access.controller");
const documents_access_service_1 = require("./documents-access.service");
const documents_controller_1 = require("./documents.controller");
const documents_service_1 = require("./documents.service");
let DocumentsModule = class DocumentsModule {
};
exports.DocumentsModule = DocumentsModule;
exports.DocumentsModule = DocumentsModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule],
        controllers: [documents_controller_1.DocumentsController, documents_access_controller_1.DocumentsAccessController],
        providers: [
            documents_service_1.DocumentsService,
            documents_access_service_1.DocumentsAccessService,
            local_storage_service_1.LocalStorageService,
            cloudinary_service_1.CloudinaryService,
            s3_service_1.S3Service,
        ],
    })
], DocumentsModule);
