import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CartItem } from "@/pages/POS/Dinning/TableOrder";
import { useEffect, useState } from "react";

interface VoidItemDialogProps {
  open: boolean;
  item: CartItem | null;
  onConfirm: (
    itemCode: number,
    voidQty: number,
    reasonId: 1 | 2 | 3 | 4,
    reasonName: string,
  ) => void;
  onCancel: () => void;
}

const VOID_REASONS = [
  { id: 1 as const, name: "Wrong Entry" },
  { id: 2 as const, name: "Customer Complaint" },
  { id: 3 as const, name: "Out of Stock" },
  { id: 4 as const, name: "Bad Taste" },
];

export default function VoidItemDialog({
  open,
  item,
  onConfirm,
  onCancel,
}: VoidItemDialogProps) {
  if (!item) {
    return null;
  }

  const [reasonValue, setReasonValue] = useState<string>("");

  useEffect(() => {
    if (open) setReasonValue("");
  }, [open]);

  const maxQty = Math.max(1, item.qty);
  const isSingle = maxQty === 1;

  const handleConfirm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const raw = formData.get("voidQty");
    const parsed = raw != null ? Number(raw) : NaN;
    const qty = isSingle ? 1 : parsed;

    if (!Number.isFinite(qty) || qty <= 0 || qty > maxQty) {
      return;
    }

    const reasonId = reasonValue ? Number(reasonValue) : NaN;
    const matched = VOID_REASONS.find((r) => r.id === reasonId);
    if (!matched) return;

    onConfirm(item.item_code, qty, matched.id, matched.name);
  };

  return (
    <Dialog open={open} onOpenChange={(openState) => !openState && onCancel()}>
      <DialogContent>
        <form onSubmit={handleConfirm}>
          <DialogHeader>
            <DialogTitle>Void Item</DialogTitle>
            <DialogDescription>
              {item && (
                <>
                  {item.Item.item} — current qty{" "}
                  <span className="font-semibold">{item.qty}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Reason (required)
            </label>
            <Select value={reasonValue} onValueChange={setReasonValue}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {VOID_REASONS.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.id}- {r.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {!isSingle && (
            <div className="mt-4 space-y-2">
              <label
                htmlFor="voidQty"
                className="text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                Qty to Void
              </label>
              <Input
                id="voidQty"
                name="voidQty"
                type="number"
                min={1}
                max={maxQty}
                defaultValue={maxQty}
              />
              <p className="text-xs text-gray-500">
                Enter a value between 1 and {maxQty}.
              </p>
            </div>
          )}

          {isSingle && (
            <p className="mt-4 text-sm text-gray-700 dark:text-gray-200">
              Are you sure you want to void this item?
            </p>
          )}

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive">
              Confirm Void
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

