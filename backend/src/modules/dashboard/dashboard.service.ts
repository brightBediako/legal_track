import { Injectable } from '@nestjs/common';
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

    const [clients, cases] = await Promise.all([
      this.prisma.client.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
            { phone: { contains: term, mode: 'insensitive' } },
          ],
        },
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
