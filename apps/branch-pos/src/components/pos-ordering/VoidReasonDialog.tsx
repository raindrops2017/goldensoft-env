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
import { useQuery } from "@tanstack/react-query";

interface VoidReason {
  id: number;
  reason: string;
  isWaste: boolean;
}

export function VoidReasonDialog({ 
  open, 
  onOpenChange, 
  onConfirm 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  onConfirm: (reasonId: number) => void; 
}) {
  const [selectedReasonId, setSelectedReasonId] = useState<number | null>(null);

  const { data: reasons = [] } = useQuery({
    queryKey: ['void-reasons'],
    queryFn: async () => {
      // Temporary mock or API call
      // const res = await api.get('/options/void-reasons');
      // return res.data.data as VoidReason[];
      return [
        { id: 1, reason: "Customer changed mind", isWaste: false },
        { id: 2, reason: "Kitchen mistake", isWaste: true },
        { id: 3, reason: "Wrong entry", isWaste: false },
        { id: 4, reason: "Spoiled / Dropped", isWaste: true },
      ] as VoidReason[];
    },
    enabled: open
  });

  const handleConfirm = () => {
    if (!selectedReasonId) return;
    onConfirm(selectedReasonId);
    setSelectedReasonId(null);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) setSelectedReasonId(null);
      onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-500">
            <AlertTriangle size={24} />
            <DialogTitle>Void Item Confirmation</DialogTitle>
          </div>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Please select a reason for voiding this item.
          </p>
          <div className="grid grid-cols-1 gap-2">
            {reasons.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedReasonId(r.id)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  selectedReasonId === r.id
                    ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/50 dark:text-red-400"
                    : "bg-gray-50 border-transparent hover:border-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-700"
                }`}
              >
                <span className="text-sm font-medium">{r.reason}</span>
                {r.isWaste && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">
                    Waste
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!selectedReasonId}
          >
            Confirm Void
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
