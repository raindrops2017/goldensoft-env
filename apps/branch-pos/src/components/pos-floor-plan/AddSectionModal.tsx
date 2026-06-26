import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface AddSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export function AddSectionModal({
  isOpen,
  onClose,
  onCreate
}: AddSectionModalProps) {
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim());
    setName('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#15111d] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in duration-100">
        <div>
          <h3 className="text-base font-black tracking-wider uppercase dark:text-white">
            Create Layout Section
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Add seating segment (e.g. VIP Terrace, Indoor Bar)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Section Name..."
            className="w-full h-16 bg-slate-50 dark:bg-[#201b2f] border border-slate-200 dark:border-white/5 rounded-2xl px-4 text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-500"
          />

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onClose();
                setName('');
              }}
              className="flex-1 h-16 rounded-2xl text-sm font-bold border-slate-200 dark:border-white/10 dark:bg-[#1a1525] dark:text-white cursor-pointer active:scale-95"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 h-16 rounded-2xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-95"
            >
              Create
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
