import { Global, Module } from '@nestjs/common';
import { PortalScopeService } from '../common/portal-scope.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService, PortalScopeService],
  exports: [PrismaService, PortalScopeService],
})
export class PrismaModule {}
