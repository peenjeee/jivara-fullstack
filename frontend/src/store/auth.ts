import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthState } from '@/types/auth';

export type { User, AuthState };

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      hasHydrated: false,
      setAuth: (user, token, refreshToken) => 
        set({ user, token, refreshToken, isAuthenticated: true }),
      updateUser: (user) =>
        set((state) => ({ user: state.user ? { ...state.user, ...user } : state.user })),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      updateToken: (token) => 
        set({ token }),
      logout: () => 
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false }),
    }),
    {
      name: 'jivara-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
