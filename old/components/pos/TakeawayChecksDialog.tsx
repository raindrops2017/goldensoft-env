import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOpenTakeawayChecks } from "@/hooks/queries/useOpenTakeawayChecks";
import { ChkHead } from "@/types/check.types";
import {
  ShoppingBag,
  Clock,
  Search,
  MessageSquare,
  Package,
  ShoppingBasket,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (check: ChkHead) => void;
}

export default function TakeawayChecksDialog({
  isOpen,
  onClose,
  onSelect,
}: Props) {
  const { data: checks, isLoading } = useOpenTakeawayChecks();
  const [query, setQuery] = useState("");

  const filtered = (checks ?? []).filter((check) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    const custNotes = ((check as any).cust_notes as string) ?? "";
    return (
      String(check.chk_no).includes(q) || custNotes.toLowerCase().includes(q)
    );
  });

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3 mb-5 mt-5">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center shrink-0">
              <ShoppingBag
                size={18}
                className="text-orange-500 dark:text-orange-400"
              />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white leading-tight">
                Open Takeaway Checks
              </DialogTitle>
              {!isLoading && checks && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {checks.length} active{" "}
                  {checks.length === 1 ? "order" : "orders"}
                </p>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
            />
            <Input
              placeholder="Search by check # or customer note..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-10 text-sm rounded-xl
                bg-gray-50 dark:bg-gray-800
                border border-gray-200 dark:border-gray-700
                text-gray-800 dark:text-gray-100
                placeholder:text-gray-400 dark:placeholder:text-gray-500
                focus:border-orange-400 dark:focus:border-orange-500
                focus:bg-white dark:focus:bg-gray-800
                transition-colors"
            />
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-2 border-gray-200 dark:border-gray-700 border-t-orange-500 rounded-full animate-spin" />
              <span className="text-sm text-gray-400 dark:text-gray-500">
                Loading checks...
              </span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Package
                  size={24}
                  className="text-gray-300 dark:text-gray-600"
                />
              </div>
              <span className="text-sm text-gray-400 dark:text-gray-500">
                {query
                  ? "No checks match your search"
                  : "No open takeaway checks"}
              </span>
            </div>
          ) : (
            filtered.map((check) => {
              const total = (check as any).total || 0;
              const itemsCount = check.ChkDetails?.length || 0;
              const custNotes = ((check as any).cust_notes as string) ?? "";

              return (
                <div
                  key={check.chk_no}
                  className="rounded-xl border border-gray-100 dark:border-gray-700/80
                    bg-white dark:bg-gray-800
                    hover:border-orange-300 dark:hover:border-orange-500/50
                    hover:bg-orange-50/30 dark:hover:bg-orange-500/5
                    transition-all duration-150 overflow-hidden"
                >
                  {/* Top row */}
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    {/* Badge */}
                    <div className="w-20 h-10 rounded-lg bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center shrink-0 mr-5">
                      <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 leading-none">
                        #{String(check.chk_no)}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div
                        className="flex items-center gap-2">
                        <MessageSquare
                          size={14}
                          className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5"
                        />
                        <span className="text-md font-bold text-amber-900 dark:text-amber-100 leading-relaxed">
                          {custNotes}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mx-5">

                        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                          <Clock size={11} />
                          <span>{check.chk_time}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                          <ShoppingBasket size={11} />
                          <span className="inline-flex items-center">
                            {itemsCount} {itemsCount === 1 ? "item" : "items"}
                          </span>
                        </div>

                      </div>

                    </div>

                    {/* Total + Action */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-100 tabular-nums">
                        {total.toFixed(2)}
                        <span className="text-xs font-normal text-gray-400 dark:text-gray-500 ml-1">
                          EGP
                        </span>
                      </span>
                      <Button
                        size="sm"
                        onClick={() => {
                          setQuery("");
                          onSelect(check);
                        }}
                        className="h-7 px-4 text-xs font-semibold bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-lg border-0 shadow-none"
                      >
                        Open
                      </Button>
                    </div>
                  </div>

                  {/* Customer note strip — only when present */}
                  {/* {custNotes ? (
                    <div
                      className="flex items-start gap-2 px-4 py-2.5 mx-3 mb-3 rounded-lg
                  bg-amber-50/90 dark:bg-amber-400/10
                  border-l-4 border-amber-500 dark:border-amber-400
                  shadow-sm hover:shadow-md
                  transition-all duration-200"
                    >
                      <MessageSquare
                        size={14}
                        className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5"
                      />
                      <span className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed">
                        {custNotes}
                      </span>
                    </div>
                  ) : null} */}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
