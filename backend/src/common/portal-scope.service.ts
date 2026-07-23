import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PortalScopeService {
  constructor(private readonly prisma: PrismaService) {}

  isClientRole(role?: string | null) {
    return role === 'client';
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

  async assertCaseAccess(input: {
    userId: string;
    role?: string;
    caseId: string;
  }) {
    if (!this.isClientRole(input.role)) return;
    const clientId = await this.requireLinkedClientId(input.userId);
    const item = await this.prisma.case.findFirst({
      where: { id: input.caseId, clientId },
      select: { id: true },
    });
    if (!item) throw new ForbiddenException('not allowed to access this case');
  }

  async assertDocumentAccess(input: {
    userId: string;
    role?: string;
    documentId: string;
  }) {
    if (!this.isClientRole(input.role)) return;
    const clientId = await this.requireLinkedClientId(input.userId);
    const doc = await this.prisma.document.findFirst({
      where: {
        id: input.documentId,
        case: { clientId },
      },
      select: { id: true },
    });
    if (!doc) throw new ForbiddenException('not allowed to access this document');
  }

  async assertAppointmentAccess(input: {
    userId: string;
    role?: string;
    appointmentId: string;
  }) {
    if (!this.isClientRole(input.role)) return;
    const clientId = await this.requireLinkedClientId(input.userId);
    const item = await this.prisma.appointment.findFirst({
      where: { id: input.appointmentId, clientId },
      select: { id: true },
    });
    if (!item) throw new ForbiddenException('not allowed to access this appointment');
  }
}
