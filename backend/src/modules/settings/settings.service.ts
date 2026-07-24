import { BadRequestException, Injectable } from '@nestjs/common';
import { RBAC_MATRIX } from '../../common/rbac-matrix';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

const SETTINGS_ID = 'default';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async get() {
    return this.ensure();
  }

  rbacMatrix() {
    return { roles: RBAC_MATRIX };
  }

  async update(
    input: {
      firmName?: string;
      supportEmail?: string | null;
      supportPhone?: string | null;
      timezone?: string;
    },
    actorUserId?: string,
  ) {
    await this.ensure();
    const data: {
      firmName?: string;
      supportEmail?: string | null;
      supportPhone?: string | null;
      timezone?: string;
    } = {};

    if (input.firmName !== undefined) {
      const firmName = input.firmName.trim();
      if (!firmName) throw new BadRequestException('firmName is required');
      data.firmName = firmName;
    }
    if (input.supportEmail !== undefined) {
      const email =
        typeof input.supportEmail === 'string' ? input.supportEmail.trim() : input.supportEmail;
      data.supportEmail = email || null;
    }
    if (input.supportPhone !== undefined) {
      const phone =
        typeof input.supportPhone === 'string' ? input.supportPhone.trim() : input.supportPhone;
      data.supportPhone = phone || null;
    }
    if (input.timezone !== undefined) {
      const timezone = input.timezone.trim();
      if (!timezone) throw new BadRequestException('timezone is required');
      data.timezone = timezone;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('no fields to update');
    }

    const updated = await this.prisma.systemSettings.update({
      where: { id: SETTINGS_ID },
      data,
    });

    await this.audit.logUpdate('SystemSettings', SETTINGS_ID, actorUserId, {
      fields: Object.keys(data),
    });

    return updated;
  }

  private async ensure() {
    return this.prisma.systemSettings.upsert({
      where: { id: SETTINGS_ID },
      create: {
        id: SETTINGS_ID,
        firmName: 'LegalTrack',
        timezone: 'Africa/Accra',
      },
      update: {},
    });
  }
}
