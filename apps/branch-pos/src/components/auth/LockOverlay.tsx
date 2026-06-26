import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { type UserPinLogin, type LoginResponse, type ActiveUser } from '@goldensoft/core-schemas';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useLockStore } from '../../store/useLockStore';
import { useLanSocket } from '../../hooks/useLanSocket';
import { EmployeeGrid } from './EmployeeGrid';
import { PinPad } from './PinPad';
import { Lock } from 'lucide-react';

type LockStep = 'clock' | 'select-user' | 'enter-pin';

function useClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function LockOverlay() {
  const navigate = useNavigate();
  const lockedUser = useLockStore((state) => state.lockedUser);
  const unlock = useLockStore((state) => state.unlock);
  const setAuth = useAuthStore((state) => state.setAuth);

  const { locks: tableLocks, releaseLock } = useLanSocket();

  const [step, setStep] = useState<LockStep>('clock');
  const [selectedUser, setSelectedUser] = useState<ActiveUser | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const now = useClock();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async (credentials: UserPinLogin) => {
      const response = await api.post<LoginResponse>('/auth/login', credentials);
      if (!response.data.success) {
        throw new Error(response.data.error || 'Login failed');
      }
      return response.data.data;
    },
    onSuccess: (data) => {
      if (!data.user) {
        setLoginError('User data not received from server');
        return;
      }
      const isNewUser = data.user.id !== lockedUser?.id;
      setAuth(data.accessToken, data.user);
      unlock();

      if (isNewUser) {
        // Different user unlocked the device
        // Invalidate queries so that belongsToCurrentUser is recalculated with the new token
        queryClient.invalidateQueries({ queryKey: ['tableSections'] });
        queryClient.invalidateQueries({ queryKey: ['openChecks'] });
        
        // Release all table locks held by the old user
        if (lockedUser) {
          Object.entries(tableLocks).forEach(([tableId, lock]) => {
            if (lock.lockedBy.userId === lockedUser.id) {
              releaseLock(tableId);
            }
          });
        }
        navigate('/dine-in', { replace: true });
      }
      // Same user → stay on current route (app was just overlaid, state intact)
    },
    onError: (error: any) => {
      setLoginError(error.response?.data?.error || error.message || 'An unexpected error occurred');
    },
  });

  // Activate the login UI on any interaction when in clock mode
  const handleOverlayInteraction = useCallback(() => {
    if (step === 'clock') {
      setStep('select-user');
    }
  }, [step]);

  const handleUserSelect = (user: ActiveUser) => {
    setSelectedUser(user);
    setLoginError(null);
    setStep('enter-pin');
  };

  const handlePinSubmit = (pin: string) => {
    if (!selectedUser) return;
    setLoginError(null);
    loginMutation.mutate({ userId: selectedUser.id, pin });
  };

  const handleBack = () => {
    setStep('select-user');
    setSelectedUser(null);
    setLoginError(null);
    loginMutation.reset();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center
                 bg-slate-950/95 backdrop-blur-xl
                 transition-all duration-300"
      onPointerDown={step === 'clock' ? handleOverlayInteraction : undefined}
    >
      {/* ── CLOCK STATE ── */}
      {step === 'clock' && (
        <div className="flex flex-col items-center gap-6 select-none animate-in fade-in duration-500 cursor-pointer w-full"
             onClick={handleOverlayInteraction}>
          {/* Lock icon */}
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-slate-800/80 ring-1 ring-slate-700">
            <Lock size={36} className="text-amber-400" />
          </div>

          {/* Time */}
          <div className="text-8xl font-thin text-white tracking-tight tabular-nums">
            {formatTime(now)}
          </div>

          {/* Date */}
          <div className="text-2xl text-slate-400 font-light">
            {formatDate(now)}
          </div>

          {/* Tap to unlock hint */}
          <p className="text-slate-500 text-sm font-medium mt-4 animate-pulse">
            Tap anywhere to unlock
          </p>
        </div>
      )}

      {/* ── EMPLOYEE SELECT STATE ── */}
      {step === 'select-user' && (
        <div className="w-full max-w-5xl px-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/20 ring-1 ring-amber-500/40 mx-auto mb-4">
              <Lock size={24} className="text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Screen Locked</h2>
            {lockedUser && (
              <p className="text-slate-400 text-sm mt-1">
                Locked by <span className="text-slate-200 font-semibold">{lockedUser.username}</span>
              </p>
            )}
          </div>
          <EmployeeGrid selectedUser={selectedUser} onSelect={handleUserSelect} />
        </div>
      )}

      {/* ── PIN ENTRY STATE ── */}
      {step === 'enter-pin' && selectedUser && (
        <div className="w-full max-w-lg px-6 animate-in fade-in slide-in-from-right-4 duration-200">
          <PinPad
            selectedUser={selectedUser}
            onSubmit={handlePinSubmit}
            onBack={handleBack}
            isLoading={loginMutation.isPending}
            error={loginError}
          />
        </div>
      )}
    </div>
  );
}
