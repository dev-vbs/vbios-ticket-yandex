import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  user_id: number;
  login: string;
  full_name?: string;
  gid: number;
}

interface AuthState {
  user: User | null;
  sessionId: string | null;
  setAuth: (user: User, sessionId: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
  getSessionId: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      sessionId: null,
      setAuth: (user, sessionId) => {
        set({ user, sessionId });
      },
      logout: () => {
        set({ user: null, sessionId: null });
      },
      isAuthenticated: () => !!get().sessionId,
      isAdmin: () => get().user?.gid === 1,
      getSessionId: () => get().sessionId,
    }),
    {
      name: 'shm-auth-storage',
      partialize: (state) => ({
        user: state.user,
        sessionId: state.sessionId,
      }),
    }
  )
);
