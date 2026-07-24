import { create } from 'zustand';

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  clientId?: string | null;
  mustChangePassword?: boolean;
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setSession: (input: {
    accessToken: string;
    refreshToken?: string | null;
    user: AuthUser;
  }) => void;
  patchUser: (partial: Partial<AuthUser>) => void;
  clear: () => void;
  hydrateFromStorage: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,

  setSession: ({ accessToken, refreshToken, user }) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    set({
      accessToken,
      refreshToken: refreshToken ?? localStorage.getItem('refreshToken'),
      user,
    });
  },

  patchUser: (partial) => {
    const current = get().user;
    if (!current) return;
    const user = { ...current, ...partial };
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  clear: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({ accessToken: null, refreshToken: null, user: null });
  },

  hydrateFromStorage: () => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const userRaw = localStorage.getItem('user');
    const user = userRaw ? (JSON.parse(userRaw) as AuthUser) : null;
    set({
      accessToken,
      refreshToken,
      user: accessToken || refreshToken ? user : null,
    });
  },
}));
