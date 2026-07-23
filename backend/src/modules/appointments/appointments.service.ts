import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PortalScopeService } from '../../common/portal-scope.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

const TYPES = ['consultation', 'court', 'meeting'] as const;
const STATUSES = ['scheduled', 'completed', 'cancelled'] as const;

const includeRelations = {
  client: { select: { id: true, name: true, email: true, phone: true } },
  case: { select: { id: true, title: true, status: true } },
  createdBy: { select: { id: true, email: true, role: true } },
} as const;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly portal: PortalScopeService,
  ) {}

  async create(
    input: {
      title: string;
      type: string;
      status?: string;
      description?: string;
      startsAt: string;
      endsAt?: string;
      clientId?: string;
      caseId?: string;
    },
    actorUserId?: string,
  ) {
    const title = input.title?.trim();
    if (!title) throw new BadRequestException('title is required');

    const type = this.parseType(input.type);
    const status = this.parseStatus(input.status ?? 'scheduled');
    const description = input.description?.trim() || undefined;
    const startsAt = this.parseDate(input.startsAt, 'startsAt');
    const endsAt = input.endsAt ? this.parseDate(input.endsAt, 'endsAt') : undefined;
    if (endsAt && endsAt < startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    const clientId = input.clientId?.trim() || undefined;
    const caseId = input.caseId?.trim() || undefined;
    await this.assertClientAndCase(clientId, caseId);

    const created = await this.prisma.appointment.create({
      data: {
        title,
        type,
        status,
        description,
        startsAt,
        endsAt,
        client: clientId ? { connect: { id: clientId } } : undefined,
        case: caseId ? { connect: { id: caseId } } : undefined,
        createdBy: actorUserId ? { connect: { id: actorUserId } } : undefined,
      },
      include: includeRelations,
    });

    await this.audit.logCreate('Appointment', created.id, actorUserId, {
      title: created.title,
      type: created.type,
      status: created.status,
      startsAt: created.startsAt.toISOString(),
    });

    await this.notifications.notifyStaff(
      {
        title: `Appointment scheduled: ${created.title}`,
        body: `${created.type} · ${created.startsAt.toLocaleString()}`,
        type: 'appointment',
        entity: 'Appointment',
        entityId: created.id,
        href: `/appointments/${created.id}`,
      },
      { excludeUserId: actorUserId },
    );

    return created;
  }

  async list(
    query?: { q?: string; type?: string; status?: string; from?: string; to?: string },
    actor?: { userId?: string; role?: string },
  ) {
    const q = query?.q?.trim();
    const type = query?.type?.trim();
    const status = query?.status?.trim();
    const where: Prisma.AppointmentWhereInput = {};

    if (type) where.type = this.parseType(type);
    if (status) where.status = this.parseStatus(status);
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { client: { name: { contains: q, mode: 'insensitive' } } },
        { case: { title: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (query?.from || query?.to) {
      where.startsAt = {};
      if (query.from) where.startsAt.gte = this.parseDate(query.from, 'from');
      if (query.to) where.startsAt.lte = this.parseDate(query.to, 'to');
    }

    if (this.portal.isClientRole(actor?.role) && actor?.userId) {
      where.clientId = await this.portal.requireLinkedClientId(actor.userId);
    }

    return this.prisma.appointment.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      include: includeRelations,
    });
  }

  async getById(id: string, actor?: { userId?: string; role?: string }) {
    if (actor?.userId) {
      await this.portal.assertAppointmentAccess({
        userId: actor.userId,
        role: actor.role,
        appointmentId: id,
      });
    }

    const item = await this.prisma.appointment.findUnique({
      where: { id },
      include: includeRelations,
    });
    if (!item) throw new NotFoundException('appointment not found');
    return item;
  }

  async update(
    id: string,
    input: {
      title?: string;
      type?: string;
      status?: string;
      description?: string | null;
      startsAt?: string;
      endsAt?: string | null;
      clientId?: string | null;
      caseId?: string | null;
    },
    actorUserId?: string,
  ) {
    const existing = await this.prisma.appointment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('appointment not found');

    const data: Prisma.AppointmentUpdateInput = {};

    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) throw new BadRequestException('title is required');
      data.title = title;
    }
    if (input.type !== undefined) data.type = this.parseType(input.type);
    if (input.status !== undefined) data.status = this.parseStatus(input.status);
    if (input.description !== undefined) {
      const description =
        typeof input.description === 'string' ? input.description.trim() : input.description;
      data.description = description || null;
    }
    if (input.startsAt !== undefined) data.startsAt = this.parseDate(input.startsAt, 'startsAt');
    if (input.endsAt !== undefined) {
      data.endsAt = input.endsAt ? this.parseDate(input.endsAt, 'endsAt') : null;
    }

    let nextClientId = existing.clientId;
    let nextCaseId = existing.caseId;

    if (input.clientId !== undefined) {
      const clientId =
        typeof input.clientId === 'string' ? input.clientId.trim() : input.clientId;
      if (!clientId) {
        data.client = { disconnect: true };
        nextClientId = null;
      } else {
        data.client = { connect: { id: clientId } };
        nextClientId = clientId;
      }
    }

    if (input.caseId !== undefined) {
      const caseId = typeof input.caseId === 'string' ? input.caseId.trim() : input.caseId;
      if (!caseId) {
        data.case = { disconnect: true };
        nextCaseId = null;
      } else {
        data.case = { connect: { id: caseId } };
        nextCaseId = caseId;
      }
    }

    await this.assertClientAndCase(nextClientId ?? undefined, nextCaseId ?? undefined);

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('no fields to update');
    }

    const startsAt =
      data.startsAt instanceof Date ? data.startsAt : existing.startsAt;
    const endsAt =
      data.endsAt === null
        ? null
        : data.endsAt instanceof Date
          ? data.endsAt
          : existing.endsAt;
    if (endsAt && endsAt < startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data,
      include: includeRelations,
    });

    await this.audit.logUpdate('Appointment', updated.id, actorUserId, {
      title: updated.title,
      status: updated.status,
      fields: Object.keys(data),
    });

    await this.notifications.notifyStaff(
      {
        title: `Appointment updated: ${updated.title}`,
        body: `Status: ${updated.status}.`,
        type: 'appointment',
        entity: 'Appointment',
        entityId: updated.id,
        href: `/appointments/${updated.id}`,
      },
      { excludeUserId: actorUserId },
    );

    return updated;
  }

  private async assertClientAndCase(clientId?: string, caseId?: string) {
    if (clientId) {
      const client = await this.prisma.client.findUnique({ where: { id: clientId } });
      if (!client) throw new BadRequestException('client not found');
    }
    if (caseId) {
      const linkedCase = await this.prisma.case.findUnique({ where: { id: caseId } });
      if (!linkedCase) throw new BadRequestException('case not found');
    }
  }

  private parseType(type: string) {
    const value = type?.trim().toLowerCase();
    if (!value || !(TYPES as readonly string[]).includes(value)) {
      throw new BadRequestException(`type must be one of: ${TYPES.join(', ')}`);
    }
    return value;
  }

  private parseStatus(status: string) {
    const value = status?.trim().toLowerCase();
    if (!value || !(STATUSES as readonly string[]).includes(value)) {
      throw new BadRequestException(`status must be one of: ${STATUSES.join(', ')}`);
    }
    return value;
  }

  private parseDate(value: string, field: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }
    return date;
  }
}
