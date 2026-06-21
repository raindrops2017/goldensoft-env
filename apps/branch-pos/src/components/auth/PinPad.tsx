import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PinLoginSchema, type PinLogin } from '@goldensoft/core-schemas';
import { Delete, X } from 'lucide-react';

interface PinPadProps {
  onSubmit: (data: PinLogin) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function PinPad({ onSubmit, isLoading, error }: PinPadProps) {
  const [pin, setPin] = useState('');
  
  const {
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PinLogin>({
    resolver: zodResolver(PinLoginSchema),
    defaultValues: { pin: '' },
  });

  // Sync internal state with react-hook-form
  const updatePin = (newPin: string) => {
    setPin(newPin);
    setValue('pin', newPin, { shouldValidate: true });
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 8) { // Reasonable max length
      updatePin(pin + num);
    }
  };

  const handleBackspace = () => {
    updatePin(pin.slice(0, -1));
  };

  const handleClear = () => {
    updatePin('');
  };

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(onSubmit)(e);
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', 'Back'];

  return (
    <div className="w-full max-w-2xl mx-auto text-slate-900 dark:text-slate-100 select-none touch-manipulation h-full flex flex-col justify-center transition-colors duration-300">
      <div className="mb-4 sm:mb-8 text-center shrink-0">
        <h2 className="text-4xl sm:text-5xl font-bold mb-2 sm:mb-4 tracking-tight text-slate-900 dark:text-white transition-colors duration-300">Enter PIN</h2>
      </div>

      <form onSubmit={submitForm} className="flex flex-col items-center w-full shrink-0">
        {/* PIN Display */}
        <div className="flex justify-center items-center gap-4 sm:gap-6 mb-4 sm:mb-8 h-12 sm:h-16 w-full">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-full transition-all duration-200 ${
                i < pin.length ? 'bg-amber-500 scale-110 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-slate-200 dark:bg-slate-800'
              }`}
            />
          ))}
          {pin.length > 4 && (
            <div className="w-8 h-8 rounded-full bg-amber-500 scale-110 shadow-[0_0_15px_rgba(245,158,11,0.5)] flex items-center justify-center text-sm font-bold text-slate-950">
              +{pin.length - 4}
            </div>
          )}
        </div>

        {/* Error Message */}
        <div className="h-6 sm:h-8 mb-4 sm:mb-6 text-center w-full">
          {(errors.pin?.message || error) && (
            <p className="text-red-500 font-semibold text-lg sm:text-xl">
              {errors.pin?.message || error}
            </p>
          )}
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6 w-full">
          {keys.map((key) => {
            if (key === 'Clear') {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={handleClear}
                  disabled={isLoading || pin.length === 0}
                  className="h-[8vh] min-h-[64px] max-h-[96px] flex items-center justify-center rounded-2xl bg-slate-200 dark:bg-slate-800 text-red-500 font-medium transition-all duration-75 active:scale-95 active:bg-slate-300 dark:active:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 disabled:active:scale-100 select-none touch-manipulation"
                >
                  <X size={48} />
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
                  className="h-[8vh] min-h-[64px] max-h-[96px] flex items-center justify-center rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-all duration-75 active:scale-95 active:bg-slate-300 dark:active:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 disabled:active:scale-100 select-none touch-manipulation"
                >
                  <Delete size={48} />
                </button>
              );
            }
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleKeyPress(key)}
                disabled={isLoading}
                className="h-[8vh] min-h-[64px] max-h-[96px] flex items-center justify-center rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-4xl sm:text-5xl font-semibold transition-all duration-75 active:scale-95 active:bg-slate-300 dark:active:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 disabled:active:scale-100 select-none touch-manipulation shadow-sm"
              >
                {key}
              </button>
            );
          })}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || pin.length < 4}
          className="w-full h-[8vh] min-h-[64px] max-h-[96px] rounded-2xl bg-amber-500 text-slate-950 text-3xl sm:text-4xl font-bold transition-all duration-75 active:scale-[0.98] active:bg-amber-600 disabled:opacity-50 disabled:active:scale-100 select-none touch-manipulation shadow-lg shadow-amber-500/20 flex items-center justify-center shrink-0"
        >
          {isLoading ? (
            <div className="w-10 h-10 border-4 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
          ) : (
            'Login'
          )}
        </button>
      </form>
    </div>
  );
}
