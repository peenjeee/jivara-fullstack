import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthState } from '@/types/auth';

export type { User, AuthState };

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      hasHydrated: true,
      setAuth: (user, token) => 
        set({ user, token, isAuthenticated: true }),
      updateUser: (user) =>
        set((state) => ({ user: state.user ? { ...state.user, ...user } : state.user })),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      updateToken: (token) => 
        set({ token }),
      logout: () => 
        set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'jivara-auth-storage',
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as Partial<AuthState>;
        return {
          user: state.user ?? null,
          isAuthenticated: Boolean(state.isAuthenticated && state.user),
        };
      },
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
          return;
        }

        useAuthStore.setState({ hasHydrated: true });
      },
    }
  )
);
