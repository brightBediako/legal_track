export const DOCUMENT_CATEGORIES = [
  { value: 'pleading', label: 'Pleading' },
  { value: 'evidence', label: 'Evidence' },
  { value: 'correspondence', label: 'Correspondence' },
  { value: 'contract', label: 'Contract' },
  { value: 'identity', label: 'Identity' },
  { value: 'other', label: 'Other' },
] as const;

export function documentCategoryLabel(category?: string | null): string {
  const found = DOCUMENT_CATEGORIES.find((c) => c.value === category);
  return found?.label ?? 'Other';
}
