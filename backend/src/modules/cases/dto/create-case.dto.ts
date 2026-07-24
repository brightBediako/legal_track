export type CreateCaseDto = {
  title: string;
  description?: string;
  status: string;
  clientId?: string;
  assigneeId?: string;
  notes?: string;
  courtDate?: string;
};

