import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Percent, Tag } from "lucide-react";

interface DiscountDialogProps {
  open: boolean;
  onClose: () => void;
  options: any;
  subtotal: number;
  currentDiscount: number;
  currentDiscountPercent: number;
  onApply: (discountValue: number, discountPercent: number) => void;
  onCancel: () => void;
}

type DiscountMode = "percent" | "value";

export default function DiscountDialog({
  open,
  onClose,
  options,
  subtotal,
  currentDiscount,
  currentDiscountPercent,
  onApply,
  onCancel,
}: DiscountDialogProps) {
  const [mode, setMode] = useState<DiscountMode>("percent");
  const [input, setInput] = useState<string>("0");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  const discValues = useMemo(
    () => [
      options?.discountPercent1 ?? 0,
      options?.discountPercent2 ?? 0,
      options?.discountPercent3 ?? 0,
      options?.discountPercent4 ?? 0,
      options?.discountPercent5 ?? 0,
    ],
    [options],
  );

  // Synchronize state when dialog opens
  useMemo(() => {
    if (open) {
      if (currentDiscountPercent > 0) {
        setMode("percent");
        setSelectedPreset(currentDiscountPercent);
        setInput("0");
      } else if (currentDiscount > 0) {
        setMode("value");
        setInput(currentDiscount.toString());
        setSelectedPreset(null);
      } else {
        setMode("percent");
        setInput("0");
        setSelectedPreset(null);
      }
    }
  }, [open, currentDiscount, currentDiscountPercent]);

  const parsed = Number(input || "0");

  const preview = useMemo(() => {
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    const value = Math.min(parsed, subtotal);
    const percent = subtotal > 0 ? (value / subtotal) * 100 : 0;
    return { value, percent };
  }, [parsed, subtotal]);

  const handlePresetClick = (p: number) => {
    setSelectedPreset(p);
    onApply(0, p); 
    onClose();
  };

  const maxDiscountAllowed = subtotal * 0.49;
  const isOverLimit = mode === "value" && parsed > maxDiscountAllowed;

  const handleApply = () => {
    if (!preview || isOverLimit) return;
    const value = Math.max(0, Math.min(preview.value, subtotal));
    onApply(value, 0); 
    onClose();
  };

  const handleRemove = () => {
    onApply(0, 0); 
    onClose();
  };

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setMode("percent");
      setInput("0");
      setSelectedPreset(null);
      onClose();
    }
  };

  const handleCancel = () => {
    setMode("percent");
    setInput("0");
    setSelectedPreset(null);
    onCancel();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-md max-w-[calc(100%-2rem)] bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 font-sans">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white leading-tight flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-100 dark:border-amber-950/30">
              <Percent size={22} />
            </div>
            <div className="flex flex-col">
              <span className="tracking-tight select-none">Discount</span>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5 select-none">
                Apply a percentage or value discount to this check
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 select-none">
          {/* Mode Selector */}
          <div className="flex justify-center">
            <div className="inline-flex w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setMode("percent")}
                className={`flex-1 h-14 rounded-xl font-bold transition-all text-sm cursor-pointer select-none active:scale-98 ${
                  mode === "percent"
                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/10"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                % Percentage
              </button>
              <button
                type="button"
                onClick={() => setMode("value")}
                className={`flex-1 h-14 rounded-xl font-bold transition-all text-sm cursor-pointer select-none active:scale-98 ${
                  mode === "value"
                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/10"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                EGP Value
              </button>
            </div>
          </div>

          {/* Mode contents */}
          {mode === "value" ? (
            <div className="space-y-2">
              <label
                htmlFor="discount-input"
                className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block"
              >
                Discount Value (EGP)
              </label>
              <div className="relative">
                <input
                  id="discount-input"
                  type="number"
                  min={0}
                  max={subtotal}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter discount amount..."
                  className="w-full h-16 rounded-2xl border-2 border-slate-250 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold px-4 text-lg focus:border-amber-500 dark:focus:border-amber-500 focus:outline-none transition-colors text-slate-900 dark:text-white"
                />
                {preview && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 dark:text-slate-500">
                    ≈ {preview.percent.toFixed(1)}%
                  </div>
                )}
              </div>
              {isOverLimit && (
                <p className="text-xs font-bold text-red-500 mt-1 animate-pulse select-none">
                  Discount value must not exceed 49% of subtotal (max: {maxDiscountAllowed.toFixed(2)} EGP) / قيمة الخصم يجب ألا تتجاوز ٤٩٪ من المجموع
                </p>
              )}
            </div>
          ) : (
            /* Preset buttons - only in percent mode */
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center flex items-center gap-1.5 justify-center">
                <Tag size={12} />
                Preset discounts
              </p>
              <div className="grid grid-cols-3 gap-2 w-full">
                {discValues
                  .filter((p) => p > 0)
                  .map((p, idx) => (
                    <button
                      key={`${p}-${idx}`}
                      type="button"
                      onClick={() => handlePresetClick(p)}
                      className={`h-14 font-black rounded-2xl active:scale-95 transition-all text-base cursor-pointer flex items-center justify-center select-none border ${
                        selectedPreset === p
                          ? "bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/20"
                          : "bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      {p}%
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full">
          <div className="flex flex-1 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleRemove}
              className="flex-1 h-16 rounded-2xl text-sm font-extrabold cursor-pointer border border-red-200 dark:border-red-950 text-red-650 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-95 transition-all duration-75 select-none"
            >
              Remove Discount
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1 h-16 rounded-2xl text-sm font-extrabold cursor-pointer border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 active:scale-95 transition-all duration-75 select-none"
            >
              Cancel
            </Button>
          </div>
          {mode === "value" && (
            <Button
              type="button"
              disabled={isOverLimit}
              onClick={handleApply}
              className="w-full sm:w-auto sm:min-w-[120px] h-16 rounded-2xl text-sm font-extrabold bg-amber-500 hover:bg-amber-600 text-white cursor-pointer active:scale-95 transition-all duration-75 select-none shadow-lg shadow-amber-900/10"
            >
              Apply
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


