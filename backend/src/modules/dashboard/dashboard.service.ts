import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PortalScopeService } from '../../common/portal-scope.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly portal: PortalScopeService,
  ) {}

  async summary(actor?: { userId?: string; role?: string }) {
    if (this.portal.isClientRole(actor?.role) && actor?.userId) {
      return this.clientSummary(actor.userId);
    }
    if (this.portal.isLawyerRole(actor?.role) && actor?.userId) {
      return this.lawyerSummary(actor.userId);
    }
    return this.staffSummary();
  }

  async search(q: string, actor?: { userId?: string; role?: string }) {
    const term = q?.trim();
    if (!term) {
      return { clients: [], cases: [] };
    }

    if (this.portal.isClientRole(actor?.role) && actor?.userId) {
      const clientId = await this.portal.requireLinkedClientId(actor.userId);
      const cases = await this.prisma.case.findMany({
        where: {
          clientId,
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
            { notes: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 8,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          courtDate: true,
          client: { select: { id: true, name: true } },
        },
      });
      return { clients: [], cases };
    }

    const caseScope = await this.portal.caseWhereForActor(actor);
    const clientSearchOr = [
      { name: { contains: term, mode: 'insensitive' as const } },
      { email: { contains: term, mode: 'insensitive' as const } },
      { phone: { contains: term, mode: 'insensitive' as const } },
    ];
    const clientWhere: Prisma.ClientWhereInput =
      this.portal.isLawyerRole(actor?.role) && actor?.userId
        ? {
            cases: { some: { assigneeId: actor.userId } },
            OR: clientSearchOr,
          }
        : { OR: clientSearchOr };

    const [clients, cases] = await Promise.all([
      this.prisma.client.findMany({
        where: clientWhere,
        take: 8,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
        },
      }),
      this.prisma.case.findMany({
        where: {
          ...(caseScope ?? {}),
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
            { notes: { contains: term, mode: 'insensitive' } },
            { client: { name: { contains: term, mode: 'insensitive' } } },
          ],
        },
        take: 8,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          courtDate: true,
          client: { select: { id: true, name: true } },
        },
      }),
    ]);

    return { clients, cases };
  }

  private async staffSummary() {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      clientsActive,
      clientsInactive,
      casesOpen,
      casesPending,
      casesClosed,
      casesTotal,
      documentsTotal,
      recentDocuments,
      upcomingCourtDates,
      recentCases,
    ] = await Promise.all([
      this.prisma.client.count({ where: { isActive: true } }),
      this.prisma.client.count({ where: { isActive: false } }),
      this.prisma.case.count({ where: { status: 'open' } }),
      this.prisma.case.count({ where: { status: 'pending' } }),
      this.prisma.case.count({ where: { status: 'closed' } }),
      this.prisma.case.count(),
      this.prisma.document.count(),
      this.prisma.document.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          filename: true,
          provider: true,
          createdAt: true,
          case: { select: { id: true, title: true } },
        },
      }),
      this.prisma.case.findMany({
        where: {
          courtDate: { gte: now, lte: in30Days },
          status: { not: 'closed' },
        },
        orderBy: { courtDate: 'asc' },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          courtDate: true,
          client: { select: { id: true, name: true } },
        },
      }),
      this.prisma.case.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
          client: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      scope: 'staff' as const,
      metrics: {
        clientsActive,
        clientsInactive,
        casesOpen,
        casesPending,
        casesClosed,
        casesTotal,
        documentsTotal,
      },
      recentDocuments,
      upcomingCourtDates,
      recentCases,
    };
  }

  private async lawyerSummary(userId: string) {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const assigned = { assigneeId: userId };

    const [
      clientsActive,
      casesOpen,
      casesPending,
      casesClosed,
      casesTotal,
      documentsTotal,
      recentDocuments,
      upcomingCourtDates,
      recentCases,
      upcomingAppointments,
    ] = await Promise.all([
      this.prisma.client.count({
        where: { isActive: true, cases: { some: assigned } },
      }),
      this.prisma.case.count({ where: { ...assigned, status: 'open' } }),
      this.prisma.case.count({ where: { ...assigned, status: 'pending' } }),
      this.prisma.case.count({ where: { ...assigned, status: 'closed' } }),
      this.prisma.case.count({ where: assigned }),
      this.prisma.document.count({ where: { case: assigned } }),
      this.prisma.document.findMany({
        where: { case: assigned },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          filename: true,
          provider: true,
          createdAt: true,
          case: { select: { id: true, title: true } },
        },
      }),
      this.prisma.case.findMany({
        where: {
          ...assigned,
          courtDate: { gte: now, lte: in30Days },
          status: { not: 'closed' },
        },
        orderBy: { courtDate: 'asc' },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          courtDate: true,
          client: { select: { id: true, name: true } },
        },
      }),
      this.prisma.case.findMany({
        where: assigned,
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
          client: { select: { id: true, name: true } },
        },
      }),
      this.prisma.appointment.findMany({
        where: {
          status: 'scheduled',
          startsAt: { gte: now },
          OR: [
            { case: assigned },
            { client: { cases: { some: assigned } } },
          ],
        },
        orderBy: { startsAt: 'asc' },
        take: 5,
        select: {
          id: true,
          title: true,
          type: true,
          startsAt: true,
          status: true,
        },
      }),
    ]);

    return {
      scope: 'lawyer' as const,
      metrics: {
        clientsActive,
        clientsInactive: 0,
        casesOpen,
        casesPending,
        casesClosed,
        casesTotal,
        documentsTotal,
      },
      recentDocuments,
      upcomingCourtDates,
      recentCases,
      upcomingAppointments,
    };
  }

  private async clientSummary(userId: string) {
    const clientId = await this.portal.requireLinkedClientId(userId);
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      casesOpen,
      casesPending,
      casesClosed,
      casesTotal,
      documentsTotal,
      recentDocuments,
      upcomingCourtDates,
      recentCases,
      upcomingAppointments,
    ] = await Promise.all([
      this.prisma.case.count({ where: { clientId, status: 'open' } }),
      this.prisma.case.count({ where: { clientId, status: 'pending' } }),
      this.prisma.case.count({ where: { clientId, status: 'closed' } }),
      this.prisma.case.count({ where: { clientId } }),
      this.prisma.document.count({ where: { case: { clientId } } }),
      this.prisma.document.findMany({
        where: { case: { clientId } },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          filename: true,
          provider: true,
          createdAt: true,
          case: { select: { id: true, title: true } },
        },
      }),
      this.prisma.case.findMany({
        where: {
          clientId,
          courtDate: { gte: now, lte: in30Days },
          status: { not: 'closed' },
        },
        orderBy: { courtDate: 'asc' },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          courtDate: true,
          client: { select: { id: true, name: true } },
        },
      }),
      this.prisma.case.findMany({
        where: { clientId },
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
          client: { select: { id: true, name: true } },
        },
      }),
      this.prisma.appointment.findMany({
        where: {
          clientId,
          status: 'scheduled',
          startsAt: { gte: now },
        },
        orderBy: { startsAt: 'asc' },
        take: 5,
        select: {
          id: true,
          title: true,
          type: true,
          startsAt: true,
          status: true,
        },
      }),
    ]);

    return {
      scope: 'client' as const,
      metrics: {
        clientsActive: 0,
        clientsInactive: 0,
        casesOpen,
        casesPending,
        casesClosed,
        casesTotal,
        documentsTotal,
      },
      recentDocuments,
      upcomingCourtDates,
      recentCases,
      upcomingAppointments,
    };
  }
}
