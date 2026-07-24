export const DOCUMENT_CATEGORIES = [
  'pleading',
  'evidence',
  'correspondence',
  'contract',
  'identity',
  'other',
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export function parseDocumentCategory(raw?: string | null): DocumentCategory {
  const value = (raw ?? 'other').trim().toLowerCase();
  if ((DOCUMENT_CATEGORIES as readonly string[]).includes(value)) {
    return value as DocumentCategory;
  }
  return 'other';
}

export function documentCategoryLabel(category: string): string {
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
