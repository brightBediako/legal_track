"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOCUMENT_CATEGORIES = void 0;
exports.parseDocumentCategory = parseDocumentCategory;
exports.documentCategoryLabel = documentCategoryLabel;
exports.DOCUMENT_CATEGORIES = [
    'pleading',
    'evidence',
    'correspondence',
    'contract',
    'identity',
    'other',
];
function parseDocumentCategory(raw) {
    const value = (raw ?? 'other').trim().toLowerCase();
    if (exports.DOCUMENT_CATEGORIES.includes(value)) {
        return value;
    }
    return 'other';
}
function documentCategoryLabel(category) {
    switch (category) {
        case 'pleading':
            return 'Pleading';
        case 'evidence':
            return 'Evidence';
        case 'correspondence':
            return 'Correspondence';
        case 'contract':
            return 'Contract';
        case 'identity':
            return 'Identity';
        default:
            return 'Other';
    }
}
