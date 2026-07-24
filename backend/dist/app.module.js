"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const app_controller_1 = require("./app.controller");
const must_change_password_interceptor_1 = require("./common/interceptors/must-change-password.interceptor");
const throttle_config_1 = require("./common/throttle.config");
const prisma_module_1 = require("./database/prisma.module");
const audit_module_1 = require("./modules/audit/audit.module");
const auth_module_1 = require("./modules/auth/auth.module");
const bootstrap_module_1 = require("./modules/bootstrap/bootstrap.module");
const users_module_1 = require("./modules/users/users.module");
const clients_module_1 = require("./modules/clients/clients.module");
const cases_module_1 = require("./modules/cases/cases.module");
const documents_module_1 = require("./modules/documents/documents.module");
const dashboard_module_1 = require("./modules/dashboard/dashboard.module");
const appointments_module_1 = require("./modules/appointments/appointments.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const settings_module_1 = require("./modules/settings/settings.module");
const throttle = (0, throttle_config_1.throttleEnv)();
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        controllers: [app_controller_1.AppController],
        imports: [
            throttler_1.ThrottlerModule.forRoot({
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
            prisma_module_1.PrismaModule,
            bootstrap_module_1.BootstrapModule,
            audit_module_1.AuditModule,
            notifications_module_1.NotificationsModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            clients_module_1.ClientsModule,
            cases_module_1.CasesModule,
            documents_module_1.DocumentsModule,
            dashboard_module_1.DashboardModule,
            appointments_module_1.AppointmentsModule,
            settings_module_1.SettingsModule,
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: must_change_password_interceptor_1.MustChangePasswordInterceptor,
            },
        ],
    })
], AppModule);
