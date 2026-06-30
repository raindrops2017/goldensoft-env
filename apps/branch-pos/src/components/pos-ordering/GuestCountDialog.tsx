import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Plus, Minus, Loader2 } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@goldensoft/core-schemas";
import { SupervisorOverrideDialog } from "./SupervisorOverrideDialog";
import { Button } from "../ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  currentGuestCount: number;
  onSave: (newCount: number, supervisorPin?: string, supervisorId?: string) => Promise<void>;
  isSaving: boolean;
}

export function GuestCountDialog({
  open,
  onClose,
  currentGuestCount,
  onSave,
  isSaving,
}: Props) {
  const [guestCount, setGuestCount] = useState<number>(currentGuestCount);
  const [supervisorOpen, setSupervisorOpen] = useState(false);
  const [supervisorError, setSupervisorError] = useState<string | null>(null);

  const { hasPermission } = usePermissions();
  const canDecrease = hasPermission(PERMISSIONS.CHECK_GUEST_DECREASE);

  useEffect(() => {
    if (open) {
      setGuestCount(currentGuestCount);
      setSupervisorOpen(false);
      setSupervisorError(null);
    }
  }, [open, currentGuestCount]);

  const handleIncrement = () => {
    setGuestCount((prev) => prev + 1);
  };

  const handleDecrement = () => {
    if (guestCount > 1) {
      setGuestCount((prev) => prev - 1);
    }
  };

  const handleQuickSelect = (count: number) => {
    setGuestCount(count);
  };

  const handleSaveClick = () => {
    // If guest count is decreased and user lacks permission, require supervisor PIN
    if (guestCount < currentGuestCount && !canDecrease) {
      setSupervisorError(null);
      setSupervisorOpen(true);
    } else {
      onSave(guestCount);
    }
  };

  const handleSupervisorSubmit = async (
    pin: string,
    supervisorId: string,
    _supervisorUsername: string
  ) => {
    setSupervisorOpen(false);
    try {
      await onSave(guestCount, pin, supervisorId);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || "Supervisor validation failed";
      setSupervisorError(errMsg);
      setSupervisorOpen(true);
    }
  };

  return (
    <>
      <Dialog open={open && !supervisorOpen} onOpenChange={(val) => !val && onClose()}>
        <DialogContent className="sm:max-w-md max-w-[calc(100%-2rem)] bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 font-sans">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white leading-tight flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-950/30">
                <Users size={22} />
              </div>
              <div className="flex flex-col">
                <span className="tracking-tight select-none">Guest Count</span>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5 select-none">
                  Adjust the number of guests for this check
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Main Adjuster */}
          <div className="flex flex-col items-center justify-center py-6 select-none">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 select-none">
              Guests
            </span>
            <div className="flex items-center gap-8 mb-6">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={guestCount <= 1}
                className="w-16 h-16 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <Minus size={28} />
              </button>

              <span className="text-6xl font-black text-brand-500 dark:text-brand-400 min-w-[80px] text-center select-none tabular-nums">
                {guestCount}
              </span>

              <button
                type="button"
                onClick={handleIncrement}
                className="w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
              >
                <Plus size={28} />
              </button>
            </div>

            {/* Quick Selection Grid */}
            <div className="w-full">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 text-center">
                Quick Select
              </p>
              <div className="grid grid-cols-5 gap-2 w-full">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const isSelected = guestCount === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleQuickSelect(num)}
                      className={`h-14 font-black rounded-2xl active:scale-95 transition-all text-sm cursor-pointer flex items-center justify-center select-none ${
                        isSelected
                          ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
                          : "bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800"
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
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
              className="flex-1 h-16 rounded-2xl text-sm font-extrabold bg-brand-500 hover:bg-brand-600 text-white cursor-pointer active:scale-95 shadow-lg shadow-brand-900/10"
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

      <SupervisorOverrideDialog
        open={supervisorOpen}
        onClose={() => setSupervisorOpen(false)}
        onSubmit={handleSupervisorSubmit}
        isLoading={isSaving}
        error={supervisorError}
        permissionRequired={PERMISSIONS.CHECK_GUEST_DECREASE}
      />
    </>
  );
}
