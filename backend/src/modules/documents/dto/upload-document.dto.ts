export type UploadDocumentDto = {
  provider?: 'local' | 'cloudinary' | 's3';
  caseId?: string;
};

