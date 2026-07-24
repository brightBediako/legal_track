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
exports.ALLOWED_DOCUMENT_ACCEPT = exports.ALLOWED_DOCUMENT_EXTENSIONS = void 0;
exports.getFileExtension = getFileExtension;
exports.assertAllowedDocumentFile = assertAllowedDocumentFile;
const common_1 = require("@nestjs/common");
const path = __importStar(require("node:path"));
exports.ALLOWED_DOCUMENT_EXTENSIONS = [
    'png',
    'jpeg',
    'jpg',
    'docx',
    'doc',
    'pdf',
    'mp3',
    'mp4',
];
const ALLOWED_SET = new Set(exports.ALLOWED_DOCUMENT_EXTENSIONS);
exports.ALLOWED_DOCUMENT_ACCEPT = '.png,.jpeg,.jpg,.docx,.doc,.pdf,.mp3,.mp4';
function getFileExtension(filename) {
    const ext = path.extname(filename || '').toLowerCase().replace(/^\./, '');
    return ext;
}
function assertAllowedDocumentFile(filename, mimetype) {
    const ext = getFileExtension(filename);
    if (!ext || !ALLOWED_SET.has(ext)) {
        throw new common_1.BadRequestException(`Unsupported file type. Allowed: ${exports.ALLOWED_DOCUMENT_EXTENSIONS.join(', ')}`);
    }
    if (mimetype && mimetype !== 'application/octet-stream') {
        const mimeOk = isAllowedMimeForExtension(ext, mimetype.toLowerCase());
        if (!mimeOk) {
            throw new common_1.BadRequestException(`File MIME type "${mimetype}" does not match extension .${ext}`);
        }
    }
    return ext;
}
function isAllowedMimeForExtension(ext, mime) {
    const map = {
        png: ['image/png'],
        jpeg: ['image/jpeg'],
        jpg: ['image/jpeg'],
        docx: [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/zip',
        ],
        doc: ['application/msword', 'application/x-msword'],
        pdf: ['application/pdf'],
        mp3: ['audio/mpeg', 'audio/mp3', 'audio/mpeg3'],
        mp4: ['video/mp4', 'audio/mp4', 'application/mp4'],
    };
    const allowed = map[ext];
    return !allowed || allowed.includes(mime);
}
