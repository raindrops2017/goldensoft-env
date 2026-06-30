import { useState, useEffect } from 'react';
import { X, Delete, Loader2, KeyRound, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { AvatarCard } from '../auth/AvatarCard';
import type { ActiveUser } from '@goldensoft/core-schemas';

interface SupervisorOverrideDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (pin: string, supervisorId: string, supervisorUsername: string) => void;
  isLoading: boolean;
  error: string | null;
  permissionRequired: string;
}

export function SupervisorOverrideDialog({
  open,
  onClose,
  onSubmit,
  isLoading,
  error: apiError,
  permissionRequired,
}: SupervisorOverrideDialogProps) {
  const [step, setStep] = useState<'select-user' | 'enter-pin'>('select-user');
  const [selectedUser, setSelectedUser] = useState<ActiveUser | null>(null);
  const [pin, setPin] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Reset state when opening/closing
  useEffect(() => {
    if (open) {
      setStep('select-user');
      setSelectedUser(null);
      setPin('');
      setLocalError(null);
    }
  }, [open]);

  // Query permitted supervisors for the specific action
  const { data: supervisors, isLoading: isLoadingSupervisors, error: fetchError } = useQuery({
    queryKey: ['auth', 'permitted-users', permissionRequired],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: ActiveUser[] }>(
        `/auth/permitted-users?permission=${permissionRequired}`
      );
      return response.data.data;
    },
    enabled: open && !!permissionRequired,
    staleTime: 10_000, // keep list fresh
  });

  if (!open) return null;

  const handleUserSelect = (user: ActiveUser) => {
    setSelectedUser(user);
    setLocalError(null);
    setStep('enter-pin');
  };

  const handleBack = () => {
    setStep('select-user');
    setSelectedUser(null);
    setPin('');
    setLocalError(null);
  };

  const handleNumClick = (num: string) => {
    if (pin.length < 8) {
      setPin(pin + num);
      setLocalError(null);
    }
  };

  const handleClear = () => {
    setPin('');
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleManualSubmit = () => {
    if (!selectedUser) return;
    if (pin.length < 4) {
      setLocalError('PIN must be at least 4 digits');
      return;
    }
    onSubmit(pin, selectedUser.id, selectedUser.username);
  };

  const getPermissionNames = (perm: string) => {
    switch (perm) {
      case 'check:reprint':
        return { ar: 'إعادة طباعة الفاتورة', en: 'Reprint Check' };
      case 'check.table:transfer':
        return { ar: 'نقل الطاولة', en: 'Table Transfer' };
      case 'check.waiter:transfer':
        return { ar: 'تحويل النادل', en: 'Transfer Waiter' };
      case 'check.guest:decrease':
        return { ar: 'تقليل عدد الزبائن', en: 'Decrease Guest Count' };
      case 'check.item:void':
      case 'check.item.printed:void':
        return { ar: 'إلغاء صنف', en: 'Void Item' };
      case 'check.item:comp':
      case 'check.printed.item:comp':
        return { ar: 'ضيافة صنف', en: 'Comp Item' };
      case 'discount:apply':
        return { ar: 'تطبيق الخصم', en: 'Apply Discount' };
      case 'check:void':
      case 'check.closed:void':
        return { ar: 'إلغاء الفاتورة', en: 'Void Check' };
      case 'check:seperate':
      case 'check.printed:seperate':
        return { ar: 'تقسيم الفاتورة', en: 'Split Check' };
      default:
        return { ar: 'صلاحية المشرف', en: 'Supervisor Authorization' };
    }
  };

  const { en: englishPermissionName } = getPermissionNames(permissionRequired);
  const activeError = apiError || localError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-start justify-between mb-4 shrink-0">
          <div className="flex items-center gap-3">
            {step === 'enter-pin' && (
              <button
                onClick={handleBack}
                className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl transition cursor-pointer active:scale-95"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="p-3 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl">
              <KeyRound size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white leading-tight">
                Supervisor Override
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Required Permission Banner */}
        <div className="hidden bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl mb-4 text-center shrink-0">
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Required Permission
          </p>
          <p className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
            {englishPermissionName}
          </p>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto min-h-0 mb-4 py-2">
          {step === 'select-user' ? (
            <div className="flex flex-col h-full justify-center">
              {isLoadingSupervisors ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                  <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                  <p className="text-slate-500 text-xs font-semibold">Loading authorized staff...</p>
                </div>
              ) : fetchError ? (
                <p className="text-red-500 text-sm font-bold text-center">Failed to load supervisors.</p>
              ) : !supervisors || supervisors.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-700 dark:text-slate-350 font-bold">No Supervisors Found</p>
                  <p className="text-slate-450 dark:text-slate-500 text-xs mt-1">No active users hold this permission.</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-3 text-center sm:text-left">
                    Select Supervisor
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 justify-items-center">
                    {supervisors.map((user) => (
                      <AvatarCard
                        key={user.id}
                        user={user}
                        isSelected={false}
                        onClick={handleUserSelect}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center animate-in fade-in slide-in-from-right-4 duration-150">
              
              {/* Selected User Header */}
              {selectedUser && (
                <div className="flex flex-col items-center mb-4 text-center">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-brand-500 bg-brand-500/10 mb-2">
                    <img
                      src={(selectedUser as any).profilePic || "/images/default-avatar.jpg"}
                      alt={selectedUser.username}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-base font-bold text-slate-800 dark:text-white leading-none">
                    {selectedUser.username}
                  </p>
                  <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">Enter Security PIN</p>
                </div>
              )}

              {/* PIN Status Dots */}
              <div className="flex flex-col items-center justify-center mb-4">
                <div className="flex items-center gap-3 h-8">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-full transition-all duration-100 ${
                        i < pin.length
                          ? 'bg-amber-500 scale-110 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                          : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    />
                  ))}
                  {pin.length > 4 && (
                    <span className="text-xs font-black text-amber-500 dark:text-amber-400 ml-2">
                      +{pin.length - 4}
                    </span>
                  )}
                </div>

                {/* Error Message */}
                {activeError && (
                  <p className="text-sm font-bold text-red-500 mt-2 text-center animate-shake">
                    {activeError}
                  </p>
                )}
              </div>

              {/* PIN Pad Touch Keyboard */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleNumClick(num.toString())}
                    className="h-16 text-2xl font-black bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-100 dark:border-slate-800/50 rounded-2xl active:scale-95 transition-all text-slate-800 dark:text-slate-200 select-none cursor-pointer flex items-center justify-center shadow-sm"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleClear}
                  className="h-16 text-sm font-extrabold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 rounded-2xl active:scale-95 transition-all text-slate-550 dark:text-slate-400 select-none cursor-pointer flex items-center justify-center"
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleNumClick('0')}
                  className="h-16 text-2xl font-black bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-100 dark:border-slate-800/50 rounded-2xl active:scale-95 transition-all text-slate-800 dark:text-slate-200 select-none cursor-pointer flex items-center justify-center shadow-sm"
                >
                  0
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleBackspace}
                  className="h-16 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 rounded-2xl active:scale-95 transition-all text-slate-550 dark:text-slate-400 select-none cursor-pointer"
                >
                  <Delete size={24} />
                </button>
              </div>

              {/* Action Buttons for PIN step */}
              <div className="flex gap-3 w-full max-w-sm shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-14 rounded-2xl text-sm font-extrabold cursor-pointer border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                  onClick={handleBack}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={isLoading || pin.length < 4}
                  className="flex-1 h-14 rounded-2xl text-sm font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-lg shadow-indigo-900/20 active:scale-95"
                  onClick={handleManualSubmit}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Authorize'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Global Cancel button at bottom of Step 1 */}
        {step === 'select-user' && (
          <div className="shrink-0 mt-2">
            <Button
              type="button"
              variant="outline"
              className="w-full h-14 rounded-2xl text-sm font-extrabold cursor-pointer border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
