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
  Package,
  ShoppingBasket,
  User,
  Phone,
  Receipt,
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
    const name = (check.customerName || "").toLowerCase();
    const phone = (check.customerPhone || "").toLowerCase();
    return (
      String(check.chkNo).includes(q) ||
      name.includes(q) ||
      phone.includes(q)
    );
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-4xl overflow-hidden border border-slate-200/50 bg-[#f8fafc] p-0 shadow-2xl dark:border-slate-800/80 dark:bg-[#0c0a17] sm:rounded-3xl">
        {/* Custom Scrollbar Styles */}
        <style dangerouslySetInnerHTML={{ __html: `
          .custom-dialog-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          .custom-dialog-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-dialog-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 9999px;
          }
          .dark .custom-dialog-scrollbar::-webkit-scrollbar-thumb {
            background: #334155;
          }
          .custom-dialog-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
          .dark .custom-dialog-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #475569;
          }
        `}} />

        <div className="flex flex-col h-[85vh] max-h-[750px]">
          {/* Header */}
          <DialogHeader className="shrink-0 border-b border-slate-100 bg-white px-6 py-5 dark:border-slate-850 dark:bg-slate-900">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  <ShoppingBag size={24} className="animate-pulse" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Open Takeaway Checks
                  </DialogTitle>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="flex h-5 items-center rounded-full bg-brand-100 px-2.5 text-xs font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                      {checks?.length || 0} active orders
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="relative w-full sm:w-80">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-550"
                  size={18}
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search check #, name, phone..."
                  className="h-11 w-full select-none rounded-xl border-slate-200/80 bg-slate-50 pl-10 pr-4 text-sm font-medium transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:bg-slate-900"
                />
              </div>
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto custom-dialog-scrollbar p-6">
            {filtered.length > 0 ? (
              <div className="flex flex-col gap-2">
                {filtered.map((check) => {
                  const timeStr = check.createdAt 
                    ? new Date(check.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                    : "";

                  const itemsCount = check.items?.reduce((sum, item) => sum + item.qty, 0) || 0;
                  const itemsPreview = check.items
                    ?.map((item) => `${item.qty}x ${item.itemName}`)
                    .join(", ");

                  return (
                    <button
                      key={check.id}
                      onClick={() => onSelect(check)}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-100 bg-white shadow-sm transition-all duration-150 hover:border-brand-200 hover:bg-brand-50/20 hover:shadow-md active:scale-[0.99] dark:border-slate-800/80 dark:bg-slate-900/40 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/5 text-left w-full"
                    >
                      {/* Check ID & Time Block */}
                      <div className="flex items-center gap-3 min-w-[150px]">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition-colors group-hover:bg-brand-50 group-hover:text-brand-600 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-brand-500/10 dark:group-hover:text-brand-400">
                          <Receipt size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-white">
                            Check #{check.chkNo}
                          </p>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                            <Clock size={11} />
                            <span>{timeStr}</span>
                          </div>
                        </div>
                      </div>

                      {/* Customer Details Block */}
                      <div className="flex flex-col gap-0.5 min-w-[200px] max-w-[250px] truncate">
                        {check.customerName || check.customerPhone ? (
                          <>
                            {check.customerName && (
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                                <User size={12} className="text-brand-500/70" />
                                <span className="truncate">{check.customerName}</span>
                              </div>
                            )}
                            {check.customerPhone && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                <Phone size={12} className="text-slate-400" />
                                <span>{check.customerPhone}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs italic text-slate-400 dark:text-slate-500">
                            <User size={12} className="opacity-40" />
                            <span>Walk-in Customer</span>
                          </div>
                        )}
                      </div>

                      {/* Items Preview Block */}
                      <div className="flex-1 min-w-0 hidden md:block">
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-450 dark:text-slate-500">
                          <Package size={12} />
                          <span>{itemsCount} {itemsCount === 1 ? 'item' : 'items'}</span>
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-450 dark:text-slate-400">
                          {itemsPreview || "Empty cart"}
                        </p>
                      </div>

                      {/* Total Amount Badge */}
                      <div className="shrink-0 flex items-center justify-end">
                        <span className="rounded-xl bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                          {check.total.toFixed(2)} EGP
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900 shadow-inner">
                  <ShoppingBasket className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  No checks found
                </h3>
                <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">
                  {query
                    ? "Try adjusting your search query to find a different takeaway order."
                    : "There are currently no active takeaway orders registered."}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
