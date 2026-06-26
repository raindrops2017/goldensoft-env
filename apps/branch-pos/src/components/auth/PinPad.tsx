import { useState } from 'react';
import { Delete, X, ChevronLeft } from 'lucide-react';
import type { ActiveUser } from '@goldensoft/core-schemas';

interface PinPadProps {
  /** The employee whose PIN is being entered */
  selectedUser?: ActiveUser | null;
  /** Called with the raw PIN string when the user submits */
  onSubmit: (pin: string) => void;
  /** Called when user taps "← Back" to go back to employee selection */
  onBack?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

const MIN_PIN_LENGTH = 4;
const MAX_PIN_LENGTH = 8;

function getInitials(username: string): string {
  const parts = username.trim().split(/[\s_-]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return username.substring(0, 2).toUpperCase();
}

export function PinPad({ selectedUser, onSubmit, onBack, isLoading, error }: PinPadProps) {
  const [pin, setPin] = useState('');

  const updatePin = (newPin: string) => {
    setPin(newPin);
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < MAX_PIN_LENGTH) {
      updatePin(pin + num);
    }
  };

  const handleBackspace = () => {
    updatePin(pin.slice(0, -1));
  };

  const handleClear = () => {
    updatePin('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length >= MIN_PIN_LENGTH) {
      onSubmit(pin);
    }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', 'Back'];
  const initials = selectedUser ? getInitials(selectedUser.username) : '';

  return (
    <div className="w-full max-w-sm mx-auto text-slate-900 dark:text-slate-100 select-none touch-manipulation h-full flex flex-col justify-center transition-colors duration-200">

      {/* Selected operator card banner */}
      {selectedUser && (
        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 p-3 rounded-xl mb-5 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 font-bold text-sm text-slate-650 dark:text-slate-350 flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="flex flex-col min-w-0 text-left">
              <span className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider leading-none">Signing in as</span>
              <span className="text-sm font-extrabold text-slate-850 dark:text-slate-100 truncate mt-1 leading-tight">
                {selectedUser.username}
              </span>
            </div>
          </div>
          
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="h-10 px-3 flex items-center justify-center gap-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-850 dark:hover:text-slate-200 transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              aria-label="Go back"
            >
              <ChevronLeft size={14} />
              <span className="text-xs font-bold">Not You?</span>
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col items-center w-full shrink-0">
        
        {/* PIN bullet dots */}
        <div className="flex justify-center items-center gap-4 mb-4 h-8 w-full shrink-0">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-75 ${
                i < pin.length
                  ? 'bg-brand-500 scale-125 shadow-md shadow-brand-500/30'
                  : 'bg-slate-200 dark:bg-slate-800 border border-slate-300/30 dark:border-slate-700/30'
              }`}
            />
          ))}
          {pin.length > 4 && (
            <div className="w-3.5 h-3.5 rounded-full bg-brand-500 scale-125 shadow-md shadow-brand-500/30" />
          )}
        </div>

        {/* Error message viewport */}
        <div className="h-6 mb-2 text-center w-full shrink-0 flex items-center justify-center">
          {error && (
            <p className="text-red-500 dark:text-red-400 font-bold text-xs">
              {error}
            </p>
          )}
        </div>

        {/* Keypad Grid (Oversized touch targets minimum 64px) */}
        <div className="grid grid-cols-3 gap-2 w-full shrink-0">
          {keys.map((key) => {
            if (key === 'Clear') {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={handleClear}
                  disabled={isLoading || pin.length === 0}
                  className="h-16 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 text-red-500 hover:bg-slate-200 dark:hover:bg-slate-850 disabled:opacity-20 disabled:active:scale-100 transition-all duration-75 active:scale-95 active:bg-red-500/10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
              );
            }
            if (key === 'Back') {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={handleBackspace}
                  disabled={isLoading || pin.length === 0}
                  className="h-16 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-850 disabled:opacity-20 disabled:active:scale-100 transition-all duration-75 active:scale-95 active:bg-slate-250 dark:active:bg-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                >
                  <Delete size={20} strokeWidth={2} />
                </button>
              );
            }
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleKeyPress(key)}
                disabled={isLoading}
                className="h-16 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-850 transition-all duration-75 active:scale-95 active:bg-brand-500/10 active:border-brand-500/40 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/50 shadow-sm"
              >
                {key}
              </button>
            );
          })}
        </div>

        {/* Submit Authorization Trigger */}
        <div className="w-full mt-4 shrink-0">
          <button
            type="submit"
            disabled={isLoading || pin.length < MIN_PIN_LENGTH}
            className="w-full h-16 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-base hover:shadow-lg disabled:opacity-25 disabled:cursor-not-allowed disabled:active:scale-100 transition-all duration-100 active:scale-[0.98] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-white dark:focus-ring-offset-slate-950 cursor-pointer"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

