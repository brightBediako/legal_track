export type CreateAppointmentDto = {
  title: string;
  type: string;
  status?: string;
  description?: string;
  startsAt: string;
  endsAt?: string;
  clientId?: string;
  caseId?: string;
};
