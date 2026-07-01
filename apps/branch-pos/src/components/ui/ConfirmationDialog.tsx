import type { ReactNode } from 'react';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './dialog';
import { AlertTriangle, HelpCircle } from 'lucide-react';

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
  const iconBg = isDestructive 
    ? "bg-red-50 dark:bg-red-950/40 text-red-650 dark:text-red-400 border-red-100 dark:border-red-950/30" 
    : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border-indigo-100 dark:border-indigo-950/30";
  const Icon = isDestructive ? AlertTriangle : HelpCircle;

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md max-w-[calc(100%-2rem)] bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 font-sans">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-slate-850 dark:text-white leading-tight flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${iconBg}`}>
              <Icon size={22} />
            </div>
            <div className="flex flex-col">
              <span className="tracking-tight select-none">{title}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 select-none">
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {description}
          </DialogDescription>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 h-16 rounded-2xl text-sm font-extrabold cursor-pointer border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 active:scale-95 select-none"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 h-16 rounded-2xl text-sm font-extrabold text-white cursor-pointer active:scale-95 shadow-lg select-none ${
              isDestructive
                ? 'bg-red-650 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-750 shadow-red-900/10'
                : 'bg-indigo-650 hover:bg-indigo-750 dark:bg-indigo-600 dark:hover:bg-indigo-750 shadow-indigo-900/10'
            }`}
          >
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

