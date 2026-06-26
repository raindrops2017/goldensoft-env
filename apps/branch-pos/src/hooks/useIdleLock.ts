import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useLockStore } from '../store/useLockStore';

const IDLE_TIMEOUT_MS = 30_000; // 30 seconds

/**
 * Activates an idle timer ONLY for waiter-role users.
 * Cashiers and higher roles are completely exempt.
 *
 * Any user interaction (touch, click, scroll, keydown) resets the timer.
 * On timeout, the lock store is triggered → LockOverlay renders on top of the app.
 */
export function useIdleLock() {
  const user = useAuthStore((state) => state.user);
  const isLocked = useLockStore((state) => state.isLocked);
  const lock = useLockStore((state) => state.lock);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only activate for waiters — cashiers, managers, admins are exempt
    if (!user || !user.isWaiter) return;

    const resetTimer = () => {
      // Don't reset if already locked — screen is locked, no point running the timer
      if (useLockStore.getState().isLocked) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          lock(currentUser);
        }
      }, IDLE_TIMEOUT_MS);
    };

    const EVENTS = ['mousemove', 'mousedown', 'touchstart', 'touchmove', 'keydown', 'scroll', 'wheel'] as const;

    EVENTS.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));

    // Start the timer immediately on mount
    resetTimer();

    return () => {
      EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user, lock]);

  // When the screen gets unlocked, restart the idle timer immediately
  useEffect(() => {
    if (!user?.isWaiter || isLocked) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const currentUser = useAuthStore.getState().user;
      if (currentUser) lock(currentUser);
    }, IDLE_TIMEOUT_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isLocked, user, lock]);
}
