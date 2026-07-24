export type UpdateClientDto = {
  name?: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  isActive?: boolean;
};
