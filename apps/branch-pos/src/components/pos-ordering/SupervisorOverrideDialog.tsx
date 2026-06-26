import { useState } from 'react';
import { X, Delete, Loader2, KeyRound } from 'lucide-react';
import { Button } from '../ui/button';

interface SupervisorOverrideDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void;
  isLoading: boolean;
  error: string | null;
  permissionRequired: string;
}

export function SupervisorOverrideDialog({
  open,
  onClose,
  onSubmit,
  isLoading,
  error,
  permissionRequired,
}: SupervisorOverrideDialogProps) {
  const [pin, setPin] = useState('');

  if (!open) return null;

  const handleNumClick = (num: string) => {
    if (pin.length < 8) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 4) {
        onSubmit(nextPin);
      }
    }
  };

  const handleClear = () => {
    setPin('');
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleManualSubmit = () => {
    if (pin.length >= 4) {
      onSubmit(pin);
    }
  };

  const getPermissionNames = (perm: string) => {
    switch (perm) {
      case 'check:reprint':
        return { ar: 'إعادة طباعة الفاتورة', en: 'Reprint Check' };
      case 'check.table:transfer':
        return { ar: 'نقل الطاولة', en: 'Table Transfer' };
      default:
        return { ar: 'طباعة الفاتورة', en: 'Print Check' };
    }
  };

  const { ar: arabicPermissionName, en: englishPermissionName } = getPermissionNames(permissionRequired);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl">
              <KeyRound size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white leading-tight">
                Supervisor Override
              </h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                تفويض المشرف مطلوب
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Message */}
        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl mb-6 text-center">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Required Permission / الصلاحية المطلوبة
          </p>
          <p className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
            {englishPermissionName} / {arabicPermissionName}
          </p>
        </div>

        {/* Display PIN status dots */}
        <div className="flex flex-col items-center justify-center mb-6">
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
          {error && (
            <p className="text-sm font-bold text-red-500 mt-3 text-center animate-shake animate-duration-300">
              {error}
            </p>
          )}
        </div>

        {/* PIN Pad Touch Keyboard */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              disabled={isLoading}
              onClick={() => handleNumClick(num.toString())}
              className="h-16 text-2xl font-black bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800/50 rounded-2xl active:scale-95 focus-visible:scale-95 transition-all text-slate-800 dark:text-slate-200 select-none cursor-pointer flex items-center justify-center shadow-sm"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            disabled={isLoading}
            onClick={handleClear}
            className="h-16 text-sm font-extrabold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl active:scale-95 transition-all text-slate-500 dark:text-slate-400 select-none cursor-pointer flex items-center justify-center"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleNumClick('0')}
            className="h-16 text-2xl font-black bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800/50 rounded-2xl active:scale-95 transition-all text-slate-800 dark:text-slate-200 select-none cursor-pointer flex items-center justify-center shadow-sm"
          >
            0
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleBackspace}
            className="h-16 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl active:scale-95 transition-all text-slate-500 dark:text-slate-400 select-none cursor-pointer"
          >
            <Delete size={24} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-14 rounded-2xl text-sm font-extrabold cursor-pointer border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isLoading || pin.length < 4}
            className="flex-1 h-14 rounded-2xl text-sm font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-lg shadow-indigo-900/20"
            onClick={handleManualSubmit}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              'Authorize / تفويض'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
