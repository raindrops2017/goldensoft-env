import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Discount</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode + Input */}
          <div className="space-y-3">
            <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-1 text-xs dark:border-gray-700 dark:bg-gray-800">
              <button
                type="button"
                onClick={() => setMode("percent")}
                className={`px-3 py-1 rounded-full font-medium ${
                  mode === "percent"
                    ? "bg-amber-500 text-white"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                % Percentage
              </button>
              <button
                type="button"
                onClick={() => setMode("value")}
                className={`px-3 py-1 rounded-full font-medium ${
                  mode === "value"
                    ? "bg-amber-500 text-white"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                EGP Value
              </button>
            </div>

            {/* EGP Value mode: keep manual input + preview as-is */}
            {mode === "value" && (
              <div className="space-y-1.5">
                <label
                  htmlFor="discount-input"
                  className="text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  Discount
                </label>
                <Input
                  id="discount-input"
                  type="number"
                  min={0}
                  max={subtotal}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                {preview && (
                  <p className="text-xs text-gray-500">
                    = {preview.percent.toFixed(1)}%
                  </p>
                )}
                {isOverLimit && (
                  <p className="text-xs font-bold text-red-500 mt-1 animate-pulse">
                    Discount value must not exceed 49% of subtotal (max: {maxDiscountAllowed.toFixed(2)} EGP) / قيمة الخصم يجب ألا تتجاوز ٤٩٪ من المجموع
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Preset buttons - only in percent mode */}
          {mode === "percent" && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                Preset discounts
              </p>
              <div className="flex flex-wrap gap-2">
                {discValues
                  .filter((p) => p > 0)
                  .map((p, idx) => (
                    <button
                      key={`${p}-${idx}`}
                      type="button"
                      onClick={() => handlePresetClick(p)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold border transition
                        ${
                          selectedPreset === p
                            ? "bg-amber-500 text-white border-amber-600"
                            : "bg-white text-gray-800 border-gray-200 hover:bg-amber-50 hover:border-amber-200 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-amber-900/30 dark:hover:border-amber-800"
                        }`}
                    >
                      {p}%
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 flex flex-wrap gap-2 justify-between">
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleRemove}>
              Remove Discount
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
          {mode === "value" && (
            <div className="flex gap-2">
              <Button type="button" disabled={isOverLimit} onClick={handleApply}>
                Apply
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

