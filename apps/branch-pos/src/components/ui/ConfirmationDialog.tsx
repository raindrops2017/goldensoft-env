import type { ReactNode } from 'react';
import { Button } from './button';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#15111d] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in duration-100">
        <div>
          <h3 className="text-lg font-black tracking-wider text-slate-900 dark:text-white uppercase">
            {title}
          </h3>
          <div className="text-sm text-slate-500 dark:text-gray-400 mt-2 leading-relaxed">
            {description}
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-12 rounded-xl text-sm font-bold border-slate-200 dark:border-white/10 dark:bg-[#1a1525] dark:text-white cursor-pointer active:scale-95"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`h-12 rounded-xl text-sm font-bold text-white cursor-pointer active:scale-95 ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
