export type UpdateCaseDto = {
  title?: string;
  description?: string | null;
  status?: string;
  notes?: string | null;
  courtDate?: string | null;
  clientId?: string | null;
};
