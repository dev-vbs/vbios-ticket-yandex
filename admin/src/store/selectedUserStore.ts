import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  user_id: number;
  email?: string;
  name?: string;
  [key: string]: any;
}

interface SelectedUserState {
  selectedUser: User | null;
  setSelectedUser: (user: User | null) => void;
  clearSelectedUser: () => void;
}

export const useSelectedUserStore = create<SelectedUserState>()(
  persist(
    (set) => ({
      selectedUser: null,
      setSelectedUser: (user) => set({ selectedUser: user }),
      clearSelectedUser: () => set({ selectedUser: null }),
    }),
    {
      name: 'selected-user-storage',
    }
  )
);
