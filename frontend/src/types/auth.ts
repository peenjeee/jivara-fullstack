export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: string;
  age: number;
  gender?: string | null;
  address?: string | null;
}

/**
 * Bentuk state autentikasi untuk Zustand store.
 */
export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setAuth: (user: User, token: string, refreshToken: string) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  updateToken: (token: string) => void;
  logout: () => void;
}
