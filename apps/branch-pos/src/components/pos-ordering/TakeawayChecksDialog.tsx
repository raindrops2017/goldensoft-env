import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { CheckWithItems } from "@goldensoft/core-schemas";
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
  checks: CheckWithItems[];
  onSelect: (check: CheckWithItems) => void;
}

export default function TakeawayChecksDialog({
  isOpen,
  onClose,
  checks,
  onSelect,
}: Props) {
  const [query, setQuery] = useState("");

  const filtered = (checks ?? []).filter((check) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    const custNotes = (check.customerId || "").toLowerCase();
    return (
      String(check.chkNo).includes(q) || custNotes.includes(q)
    );
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl border-white/10 bg-[#f8fafc] p-0 shadow-2xl dark:bg-gray-900 sm:rounded-3xl">
        <div className="flex flex-col h-[85vh] max-h-[800px]">
          {/* Header */}
          <DialogHeader className="shrink-0 border-b border-gray-100 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  <ShoppingBag size={24} />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                    Open Takeaway Checks
                  </DialogTitle>
                  <p className="text-sm font-medium text-gray-500">
                    {checks?.length || 0} active orders
                  </p>
                </div>
              </div>
              <div className="relative w-72">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search check # or customer..."
                  className="w-full border-gray-200 bg-gray-50 pl-10 focus:bg-white dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {filtered.map((check) => {
                const timeStr = check.createdAt 
                  ? new Date(check.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                  : "";

                return (
                  <button
                    key={check.id}
                    onClick={() => onSelect(check)}
                    className="group flex flex-col items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 text-left transition-all hover:border-brand-200 hover:bg-brand-50/50 hover:shadow-lg active:scale-[0.98] dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-500/50"
                  >
                    <div className="flex w-full items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-600 transition-colors group-hover:bg-brand-100 group-hover:text-brand-600 dark:bg-gray-800 dark:text-gray-400 dark:group-hover:bg-brand-500/20">
                          <Package size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            Check #{check.chkNo}
                          </p>
                          <div className="flex items-center gap-1 text-xs font-medium text-gray-500">
                            <Clock size={12} />
                            {timeStr}
                          </div>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                        {check.net} EGP
                      </span>
                    </div>

                    <div className="w-full space-y-2 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
                      <div className="flex items-start gap-2 text-sm">
                        <MessageSquare
                          size={14}
                          className="mt-0.5 shrink-0 text-gray-400"
                        />
                        <p className="line-clamp-2 font-medium leading-relaxed text-gray-700 dark:text-gray-300">
                          {check.customerId || "No customer info"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800">
                  <ShoppingBasket className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  No checks found
                </h3>
                <p className="text-gray-500">
                  {query
                    ? "Try adjusting your search criteria"
                    : "There are no open takeaway checks right now"}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
