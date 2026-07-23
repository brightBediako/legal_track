export type CreateUserDto = {
  email: string;
  password: string;
  role: string;
  clientId?: string | null;
};
