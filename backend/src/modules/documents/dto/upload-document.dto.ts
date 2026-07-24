export type UploadDocumentDto = {
  provider?: 'local' | 'cloudinary' | 's3';
  caseId?: string;
  category?: string;
  /** Upload as a new version of this existing document id */
  replacesDocumentId?: string;
};
