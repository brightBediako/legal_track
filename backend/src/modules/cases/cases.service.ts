import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PortalScopeService } from '../../common/portal-scope.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

const CASE_STATUSES = ['open', 'pending', 'closed'] as const;

@Injectable()
export class CasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly portal: PortalScopeService,
  ) {}

  async create(
    input: {
      title: string;
      description?: string;
      status: string;
      clientId?: string;
      notes?: string;
      courtDate?: string;
    },
    actorUserId?: string,
  ) {
    const title = input.title?.trim();
    if (!title) {
      throw new BadRequestException('title is required');
    }

    const status = this.normalizeStatus(input.status);
    const description = input.description?.trim() || undefined;
    const clientId = input.clientId?.trim() || undefined;
    const notes = input.notes?.trim() || undefined;
    const courtDate = this.parseCourtDate(input.courtDate);

    if (clientId) {
      const client = await this.prisma.client.findUnique({ where: { id: clientId } });
      if (!client) throw new BadRequestException('client not found');
    }

    const created = await this.prisma.case.create({
      data: {
        title,
        status,
        description,
        notes,
        courtDate,
        client: clientId ? { connect: { id: clientId } } : undefined,
      },
    });

    await this.audit.logCreate('Case', created.id, actorUserId, {
      title: created.title,
      status: created.status,
      clientId: created.clientId,
    });

    await this.notifications.notifyStaff(
      {
        title: `New case: ${created.title}`,
        body: `Status set to ${created.status}.`,
        type: 'case_update',
        entity: 'Case',
        entityId: created.id,
        href: `/cases/${created.id}`,
      },
      { excludeUserId: actorUserId },
    );

    return created;
  }

  async list(
    query?: { q?: string; status?: string },
    actor?: { userId?: string; role?: string },
  ) {
    const q = query?.q?.trim();
    const status = query?.status?.trim();

    const where: Prisma.CaseWhereInput = {};
    if (status) {
      where.status = this.normalizeStatus(status);
    }
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
        { client: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (this.portal.isClientRole(actor?.role) && actor?.userId) {
      where.clientId = await this.portal.requireLinkedClientId(actor.userId);
    }

    return this.prisma.case.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async getById(id: string, actor?: { userId?: string; role?: string }) {
    if (actor?.userId) {
      await this.portal.assertCaseAccess({
        userId: actor.userId,
        role: actor.role,
        caseId: id,
      });
    }

    const item = await this.prisma.case.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, name: true, email: true, phone: true, isActive: true },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            filename: true,
            provider: true,
            createdAt: true,
          },
        },
      },
    });

    if (!item) throw new NotFoundException('case not found');
    return item;
  }

  async update(
    id: string,
    input: {
      title?: string;
      description?: string | null;
      status?: string;
      notes?: string | null;
      courtDate?: string | null;
      clientId?: string | null;
    },
    actorUserId?: string,
  ) {
    const existing = await this.prisma.case.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('case not found');

    const data: Prisma.CaseUpdateInput = {};

    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) throw new BadRequestException('title is required');
      data.title = title;
    }

    if (input.description !== undefined) {
      const description =
        typeof input.description === 'string' ? input.description.trim() : input.description;
      data.description = description || null;
    }

    if (input.status !== undefined) {
      data.status = this.normalizeStatus(input.status);
    }

    if (input.notes !== undefined) {
      const notes = typeof input.notes === 'string' ? input.notes.trim() : input.notes;
      data.notes = notes || null;
    }

    if (input.courtDate !== undefined) {
      data.courtDate = this.parseCourtDate(input.courtDate ?? undefined);
    }

    if (input.clientId !== undefined) {
      const clientId =
        typeof input.clientId === 'string' ? input.clientId.trim() : input.clientId;
      if (!clientId) {
        data.client = { disconnect: true };
      } else {
        const client = await this.prisma.client.findUnique({ where: { id: clientId } });
        if (!client) throw new BadRequestException('client not found');
        data.client = { connect: { id: clientId } };
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('no fields to update');
    }

    const updated = await this.prisma.case.update({
      where: { id },
      data,
      include: {
        client: {
          select: { id: true, name: true, email: true, phone: true, isActive: true },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            filename: true,
            provider: true,
            createdAt: true,
          },
        },
      },
    });

    await this.audit.logUpdate('Case', updated.id, actorUserId, {
      title: updated.title,
      status: updated.status,
      fields: Object.keys(data),
    });

    await this.notifications.notifyStaff(
      {
        title: `Case updated: ${updated.title}`,
        body: `Status: ${updated.status}.`,
        type: 'case_update',
        entity: 'Case',
        entityId: updated.id,
        href: `/cases/${updated.id}`,
      },
      { excludeUserId: actorUserId },
    );

    return updated;
  }

  private normalizeStatus(status: string) {
    const value = status?.trim().toLowerCase();
    if (!value) throw new BadRequestException('status is required');
    if (!(CASE_STATUSES as readonly string[]).includes(value)) {
      throw new BadRequestException(`status must be one of: ${CASE_STATUSES.join(', ')}`);
    }
    return value;
  }

  private parseCourtDate(value?: string | null) {
    if (value === undefined) return undefined;
    if (value === null || value.trim() === '') return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('courtDate must be a valid date');
    }
    return date;
  }
}
