import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingBag } from "lucide-react";
import type { CheckWithItems, DeliveryPilot } from "@goldensoft/core-schemas";
import DeliveryChecksList from "@/components/delivery/DeliveryChecksList";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  checks: CheckWithItems[];
  pilots?: DeliveryPilot[];
  onSelect: (check: CheckWithItems) => void;
  onPrintCheck?: (id: string) => void;
}

export default function DeliveryChecksDialog({
  isOpen,
  onClose,
  checks,
  pilots,
  onSelect,
  onPrintCheck,
}: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-6xl w-full overflow-hidden border border-slate-200/50 bg-[#f8fafc] p-0 shadow-2xl dark:border-slate-800/80 dark:bg-[#0c0a17] sm:rounded-3xl">
        <div className="flex flex-col h-[85vh] max-h-[750px] p-6">
          {/* Header */}
          <DialogHeader className="shrink-0 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <ShoppingBag size={24} className="animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Open Delivery Orders
                </DialogTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Select an order to load it into the ticket workspace.</p>
              </div>
            </div>
          </DialogHeader>

          {/* List component */}
          <div className="flex-1 min-h-0">
            <DeliveryChecksList
              checks={checks}
              pilots={pilots}
              onSelectCheck={onSelect}
              onPrintCheck={onPrintCheck}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
