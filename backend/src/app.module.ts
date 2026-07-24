import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { MustChangePasswordInterceptor } from './common/interceptors/must-change-password.interceptor';
import { throttleEnv } from './common/throttle.config';
import { PrismaModule } from './database/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { BootstrapModule } from './modules/bootstrap/bootstrap.module';
import { UsersModule } from './modules/users/users.module';
import { ClientsModule } from './modules/clients/clients.module';
import { CasesModule } from './modules/cases/cases.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SettingsModule } from './modules/settings/settings.module';

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
    BootstrapModule,
    AuditModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    CasesModule,
    DocumentsModule,
    DashboardModule,
    AppointmentsModule,
    SettingsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MustChangePasswordInterceptor,
    },
  ],
})
export class AppModule {}
