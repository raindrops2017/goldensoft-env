import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@goldensoft/core-schemas';

interface LockState {
  isLocked: boolean;
  /** The user who was active when the screen was locked */
  lockedUser: AuthUser | null;
  /** Lock the screen, capturing who was logged in */
  lock: (user: AuthUser) => void;
  /** Unlock the screen */
  unlock: () => void;
}

export const useLockStore = create<LockState>()(
  persist(
    (set) => ({
      isLocked: false,
      lockedUser: null,
      lock: (user) => set({ isLocked: true, lockedUser: user }),
      unlock: () => set({ isLocked: false, lockedUser: null }),
    }),
    {
      name: 'goldensoft:lock-store',
    }
  )
);
