import { Module } from '@nestjs/common';
import { CloudinaryService } from '../../documents/cloudinary.service';
import { LocalStorageService } from '../../documents/local-storage.service';
import { S3Service } from '../../documents/s3.service';
import { AuthModule } from '../auth/auth.module';
import { DocumentsAccessController } from './documents-access.controller';
import { DocumentsAccessService } from './documents-access.service';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [AuthModule],
  controllers: [DocumentsController, DocumentsAccessController],
  providers: [
    DocumentsService,
    DocumentsAccessService,
    LocalStorageService,
    CloudinaryService,
    S3Service,
  ],
})
export class DocumentsModule {}
