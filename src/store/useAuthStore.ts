import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  email: string;
  groups: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isAdmin: false,
      setAuth: (user, token) => set({ 
        user, 
        token, 
        isAuthenticated: true, 
        isAdmin: user.groups.includes('Admins') || user.groups.includes('GlobalAdmin')
      }),
      logout: () => set({ user: null, token: null, isAuthenticated: false, isAdmin: false }),
    }),
    {
      name: 'admin-auth-storage',
    }
  )
);
