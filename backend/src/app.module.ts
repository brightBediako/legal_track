import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './database/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClientsModule } from './modules/clients/clients.module';
import { CasesModule } from './modules/cases/cases.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  controllers: [AppController],
  imports: [
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    CasesModule,
    DocumentsModule,
    DashboardModule,
  ],
})
export class AppModule {}

