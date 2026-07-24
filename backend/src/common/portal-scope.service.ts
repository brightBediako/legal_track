import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PortalScopeService {
  constructor(private readonly prisma: PrismaService) {}

  isClientRole(role?: string | null) {
    return role === 'client';
  }

  isLawyerRole(role?: string | null) {
    return role === 'lawyer';
  }

  /** Admin and clerk see firm-wide operational data. */
  isFirmWideStaff(role?: string | null) {
    return role === 'admin' || role === 'clerk';
  }

  async getLinkedClientId(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { clientId: true, role: true },
    });
    if (!user || user.role !== 'client') return null;
    return user.clientId;
  }

  async requireLinkedClientId(userId: string): Promise<string> {
    const clientId = await this.getLinkedClientId(userId);
    if (!clientId) {
      throw new ForbiddenException(
        'client account is not linked to a client profile; ask an admin to link it',
      );
    }
    return clientId;
  }

  /** Prisma filter for cases visible to this actor (undefined = no extra filter). */
  async caseWhereForActor(actor?: {
    userId?: string;
    role?: string;
  }): Promise<Prisma.CaseWhereInput | undefined> {
    if (!actor?.userId || !actor.role) return undefined;
    if (this.isClientRole(actor.role)) {
      return { clientId: await this.requireLinkedClientId(actor.userId) };
    }
    if (this.isLawyerRole(actor.role)) {
      return { assigneeId: actor.userId };
    }
    return undefined;
  }

  async documentWhereForActor(actor?: {
    userId?: string;
    role?: string;
  }): Promise<Prisma.DocumentWhereInput | undefined> {
    if (!actor?.userId || !actor.role) return undefined;
    if (this.isClientRole(actor.role)) {
      return { case: { clientId: await this.requireLinkedClientId(actor.userId) } };
    }
    if (this.isLawyerRole(actor.role)) {
      return { case: { assigneeId: actor.userId } };
    }
    return undefined;
  }

  async appointmentWhereForActor(actor?: {
    userId?: string;
    role?: string;
  }): Promise<Prisma.AppointmentWhereInput | undefined> {
    if (!actor?.userId || !actor.role) return undefined;
    if (this.isClientRole(actor.role)) {
      return { clientId: await this.requireLinkedClientId(actor.userId) };
    }
    if (this.isLawyerRole(actor.role)) {
      return {
        OR: [
          { case: { assigneeId: actor.userId } },
          { client: { cases: { some: { assigneeId: actor.userId } } } },
        ],
      };
    }
    return undefined;
  }

  async assertCaseAccess(input: {
    userId: string;
    role?: string;
    caseId: string;
  }) {
    if (this.isFirmWideStaff(input.role) || !input.role) return;

    if (this.isClientRole(input.role)) {
      const clientId = await this.requireLinkedClientId(input.userId);
      const item = await this.prisma.case.findFirst({
        where: { id: input.caseId, clientId },
        select: { id: true },
      });
      if (!item) throw new ForbiddenException('not allowed to access this case');
      return;
    }

    if (this.isLawyerRole(input.role)) {
      const item = await this.prisma.case.findFirst({
        where: { id: input.caseId, assigneeId: input.userId },
        select: { id: true },
      });
      if (!item) {
        throw new ForbiddenException('not allowed to access this case (not assigned to you)');
      }
    }
  }

  async assertDocumentAccess(input: {
    userId: string;
    role?: string;
    documentId: string;
  }) {
    if (this.isFirmWideStaff(input.role) || !input.role) return;

    if (this.isClientRole(input.role)) {
      const clientId = await this.requireLinkedClientId(input.userId);
      const doc = await this.prisma.document.findFirst({
        where: {
          id: input.documentId,
          case: { clientId },
        },
        select: { id: true },
      });
      if (!doc) throw new ForbiddenException('not allowed to access this document');
      return;
    }

    if (this.isLawyerRole(input.role)) {
      const doc = await this.prisma.document.findFirst({
        where: {
          id: input.documentId,
          case: { assigneeId: input.userId },
        },
        select: { id: true },
      });
      if (!doc) {
        throw new ForbiddenException('not allowed to access this document (case not assigned)');
      }
    }
  }

  async assertAppointmentAccess(input: {
    userId: string;
    role?: string;
    appointmentId: string;
  }) {
    if (this.isFirmWideStaff(input.role) || !input.role) return;

    if (this.isClientRole(input.role)) {
      const clientId = await this.requireLinkedClientId(input.userId);
      const item = await this.prisma.appointment.findFirst({
        where: { id: input.appointmentId, clientId },
        select: { id: true },
      });
      if (!item) throw new ForbiddenException('not allowed to access this appointment');
      return;
    }

    if (this.isLawyerRole(input.role)) {
      const item = await this.prisma.appointment.findFirst({
        where: {
          id: input.appointmentId,
          OR: [
            { case: { assigneeId: input.userId } },
            { client: { cases: { some: { assigneeId: input.userId } } } },
          ],
        },
        select: { id: true },
      });
      if (!item) {
        throw new ForbiddenException('not allowed to access this appointment');
      }
    }
  }

  /**
   * Lawyers may only attach appointments/docs to cases they own.
   * Firm-wide staff skip; clients use assertCaseAccess separately.
   */
  async assertLawyerCanUseCase(input: {
    userId: string;
    role?: string;
    caseId: string;
  }) {
    if (!this.isLawyerRole(input.role)) return;
    await this.assertCaseAccess(input);
  }
}
