import { Module } from '@nestjs/common';
import { CloudinaryService } from '../../documents/cloudinary.service';
import { S3Service } from '../../documents/s3.service';
import { DocumentsAccessController } from './documents-access.controller';
import { DocumentsAccessService } from './documents-access.service';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  controllers: [DocumentsController, DocumentsAccessController],
  providers: [
    DocumentsService,
    DocumentsAccessService,
    CloudinaryService,
    S3Service,
  ],
})
export class DocumentsModule {}

