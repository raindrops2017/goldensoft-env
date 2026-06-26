import { useState } from 'react';
import { Grid } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AddBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBatch: (count: number) => void;
}

export function AddBatchModal({
  isOpen,
  onClose,
  onAddBatch
}: AddBatchModalProps) {
  const [count, setCount] = useState(5);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (count <= 0) return;
    onAddBatch(count);
    setCount(5);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#15111d] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in duration-100">
        <div>
          <h3 className="text-base font-black tracking-wider uppercase dark:text-white flex items-center gap-2">
            <Grid className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Add Batch Tables
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Specify how many tables to add to this section.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-3 justify-center">
            {/* Decrement Button */}
            <button
              type="button"
              onClick={() => setCount((prev) => Math.max(1, prev - 1))}
              className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center font-bold text-xl hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 transition-all text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              -
            </button>

            {/* Number Input */}
            <input
              type="number"
              min="1"
              max="100"
              value={count}
              onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-24 h-16 text-center bg-slate-50 dark:bg-[#201b2f] border border-slate-200 dark:border-white/5 rounded-2xl text-lg font-black text-slate-800 dark:text-white focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-500"
            />

            {/* Increment Button */}
            <button
              type="button"
              onClick={() => setCount((prev) => Math.min(100, prev + 1))}
              className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer"
            >
              +
            </button>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onClose();
                setCount(5);
              }}
              className="flex-1 h-16 rounded-2xl text-sm font-bold border-slate-200 dark:border-white/10 dark:bg-[#1a1525] dark:text-white cursor-pointer active:scale-95"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-16 rounded-2xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-95"
            >
              Add Tables
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
