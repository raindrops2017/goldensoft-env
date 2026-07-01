import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShoppingCart, Loader2, Tag } from "lucide-react";
import { Button } from "../ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  currentTableName: string;
  onSave: (newName: string) => Promise<void>;
  isSaving: boolean;
}

export function TableNameDialog({
  open,
  onClose,
  currentTableName,
  onSave,
  isSaving,
}: Props) {
  const [name, setName] = useState<string>(currentTableName);

  useEffect(() => {
    if (open) {
      setName(currentTableName || "");
    }
  }, [open, currentTableName]);

  const presetNotes = [
    "VIP",
    "Family",
    "Outdoor",
    "Window Table",
    "Couples",
    "Bar Area",
    "Smokers",
    "Non-Smokers",
    "Party Room",
    "Quick Lunch"
  ];

  const handlePresetClick = (preset: string) => {
    setName(preset);
  };

  const handleSaveClick = () => {
    onSave(name);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md max-w-[calc(100%-2rem)] bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 font-sans">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-slate-850 dark:text-white leading-tight flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-950/30">
              <ShoppingCart size={22} />
            </div>
            <div className="flex flex-col">
              <span className="tracking-tight select-none">Check Table Name / Note</span>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5 select-none">
                Assign a custom note or name to this check
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Input */}
        <div className="flex flex-col py-4 select-none">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter custom table name or check note..."
            maxLength={50}
            className="w-full h-16 rounded-2xl border-2 border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 font-bold px-4 text-lg focus:border-indigo-500 dark:focus:border-indigo-500 focus:outline-none transition-colors text-slate-850 dark:text-white"
          />

          {/* Quick Notes Selector */}
          <div className="mt-5 w-full">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5 justify-center">
              <Tag size={12} />
              Quick Presets
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {presetNotes.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className="h-12 px-4 rounded-xl font-bold bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-850 active:scale-95 transition-all text-sm select-none cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dialog Action Buttons */}
        <div className="flex gap-3 mt-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={onClose}
            className="flex-1 h-16 rounded-2xl text-sm font-extrabold cursor-pointer border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 active:scale-95"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSaving}
            onClick={handleSaveClick}
            className="flex-1 h-16 rounded-2xl text-sm font-extrabold bg-indigo-600 hover:bg-indigo-750 text-white cursor-pointer active:scale-95 shadow-lg shadow-indigo-900/10"
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
