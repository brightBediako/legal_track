export type UpdateAppointmentDto = {
  title?: string;
  type?: string;
  status?: string;
  description?: string | null;
  startsAt?: string;
  endsAt?: string | null;
  clientId?: string | null;
  caseId?: string | null;
};
