import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClientsModule } from './modules/clients/clients.module';
import { CasesModule } from './modules/cases/cases.module';
import { DocumentsModule } from './modules/documents/documents.module';

@Module({
  controllers: [AppController],
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    CasesModule,
    DocumentsModule,
  ],
})
export class AppModule {}

