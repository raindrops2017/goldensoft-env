import { useAuthStore } from '@/store/useAuthStore';
import { useLockStore } from '@/store/useLockStore';
import { Navigate, Outlet } from 'react-router-dom';
import { useIdleLock } from '@/hooks/useIdleLock';
import { LockOverlay } from '@/components/auth/LockOverlay';

// Protected Route Component
export const ProtectedRoute = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isLocked = useLockStore((state) => state.isLocked);

  // Activate idle lock timer (waiter-only, no-op for cashier/manager/admin)
  useIdleLock();

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Outlet />

      {/* Waiter auto-lock overlay — renders on top of everything when locked */}
      {isLocked && <LockOverlay />}
    </>
  );
};