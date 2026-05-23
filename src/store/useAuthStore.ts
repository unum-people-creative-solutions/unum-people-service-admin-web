import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  email: string;
  groups: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasHydrated: boolean;
  setAuth: (user: User, token: string, refreshToken?: string) => void;
  setToken: (token: string) => void;
  logout: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isAdmin: false,
      hasHydrated: false,
      setAuth: (user, token, refreshToken) => set({ 
        user, 
        token, 
        refreshToken: refreshToken || null,
        isAuthenticated: true, 
        isAdmin: user.groups.includes('Admins') || user.groups.includes('GlobalAdmin')
      }),
      setToken: (token) => set({ token }),
      logout: () => set({ user: null, token: null, refreshToken: null, isAuthenticated: false, isAdmin: false }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'admin-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
