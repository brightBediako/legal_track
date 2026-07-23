import { create } from 'zustand';

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  clientId?: string | null;
};

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  setSession: (input: { accessToken: string; user: AuthUser }) => void;
  clear: () => void;
  hydrateFromStorage: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,

  setSession: ({ accessToken, user }) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    set({ accessToken, user });
  },

  clear: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    set({ accessToken: null, user: null });
  },

  hydrateFromStorage: () => {
    const accessToken = localStorage.getItem('accessToken');
    const userRaw = localStorage.getItem('user');
    const user = userRaw ? (JSON.parse(userRaw) as AuthUser) : null;
    set({ accessToken, user: accessToken ? user : null });
  },
}));

