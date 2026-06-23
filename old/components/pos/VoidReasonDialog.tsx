import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { Textarea } from "../ui/textarea";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export default function VoidReasonDialog({ isOpen, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason);
    setReason("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-500">
            <AlertTriangle size={24} />
            <DialogTitle>Void Check Confirmation</DialogTitle>
          </div>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Are you sure you want to void this entire check? This action cannot be undone and will zero out all totals.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium dark:text-gray-200">
              Void Reason <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="Enter reason for voiding this check..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="resize-none h-24"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim()}
          >
            Confirm Void
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
