import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { throttleEnv } from './common/throttle.config';
import { PrismaModule } from './database/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClientsModule } from './modules/clients/clients.module';
import { CasesModule } from './modules/cases/cases.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

const throttle = throttleEnv();

@Module({
  controllers: [AppController],
  imports: [
    ThrottlerModule.forRoot({
      skipIf: () => throttle.disabled,
      errorMessage: 'Too many requests. Please try again later.',
      throttlers: [
        {
          name: 'default',
          ttl: throttle.ttl,
          limit: throttle.limit,
        },
      ],
    }),
    PrismaModule,
    AuditModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    CasesModule,
    DocumentsModule,
    DashboardModule,
    AppointmentsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
