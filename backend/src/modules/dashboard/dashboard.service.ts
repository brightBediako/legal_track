import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
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

  async search(q: string) {
    const term = q?.trim();
    if (!term) {
      return { clients: [], cases: [] };
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
}
