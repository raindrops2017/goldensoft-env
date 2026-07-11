import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, CheckCircle, DollarSign, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import type { DeliveryPilot } from "@goldensoft/core-schemas";

interface Props {
  activeDeliveryChecks: any[];
  currentTime: Date;
  pilots: DeliveryPilot[];
  onSettleChecks: (
    checkIds: string[],
    method: "cash" | "visa",
  ) => Promise<void>;
}

export function OpenOrdersTab({
  activeDeliveryChecks,
  currentTime,
  pilots,
  onSettleChecks,
}: Props) {
  const navigate = useNavigate();
  const [selectedPilotId, setSelectedPilotId] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const getTimerClass = (chk: any) => {
    if (chk.deliveryState === "Delivered") {
      return "text-slate-500 dark:text-slate-400 font-bold";
    }
    if (!chk.createdAt) return "text-emerald-500";
    const start = new Date(chk.createdAt).getTime();
    const elapsedMs = currentTime.getTime() - start;
    const mins = Math.floor(elapsedMs / 60000);
    if (mins < 30) {
      return "text-emerald-600 dark:text-emerald-400";
    } else if (mins < 45) {
      return "text-amber-600 dark:text-amber-400 font-bold";
    } else {
      return "text-rose-600 dark:text-rose-400 font-black animate-pulse";
    }
  };

  const formatElapsedHMS = (chk: any) => {
    if (!chk.createdAt) return "00:00:00";
    const start = new Date(chk.createdAt).getTime();
    const end = chk.deliveryState === "Delivered" && chk.updatedAt
      ? new Date(chk.updatedAt).getTime()
      : currentTime.getTime();
    const elapsedMs = end - start;
    if (elapsedMs < 0) return "00:00:00";
    const totalSecs = Math.floor(elapsedMs / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleOpenCheck = (checkId: string) => {
    navigate("/delivery/order", {
      state: { checkId },
    });
  };

  // Filter checks based on pilot select
  const filteredChecks = useMemo(() => {
    return activeDeliveryChecks.filter((chk) => {
      if (selectedPilotId === "all") return true;
      if (selectedPilotId === "unassigned") return !chk.deliveryPilotId;
      return chk.deliveryPilotId === selectedPilotId;
    });
  }, [activeDeliveryChecks, selectedPilotId]);

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredChecks.map((chk) => chk.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (checkId: string) => {
    setSelectedIds((prev) =>
      prev.includes(checkId)
        ? prev.filter((id) => id !== checkId)
        : [...prev, checkId],
    );
  };

  // Settle handler with custom confirmation dialog
  const handleBulkSettle = (method: "cash" | "visa") => {
    const selectedChecks = filteredChecks.filter((c) =>
      selectedIds.includes(c.id),
    );
    const totalSum = selectedChecks.reduce(
      (sum, c) => sum + (c.total || 0),
      0,
    );
    const orderNumbers = selectedChecks.map((c) => `#${c.chkNo}`).join(", ");

    setConfirmConfig({
      isOpen: true,
      title: `Confirm Settle via ${method.toUpperCase()}`,
      description: `Are you sure you want to settle ${selectedChecks.length} checks (${orderNumbers}) via ${method.toUpperCase()}? Total: ${totalSum.toFixed(2)} EGP`,
      onConfirm: async () => {
        await onSettleChecks(selectedIds, method);
        setSelectedIds([]);
      },
    });
  };

  const isAllSelected =
    filteredChecks.length > 0 && selectedIds.length === filteredChecks.length;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#151120] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm overflow-hidden min-h-0 select-none">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 mb-4 pb-4 border-b border-slate-100 dark:border-white/10">
        <div>
          <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-500" /> Open & Unsettled Orders
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Roster of all open delivery checks. Select orders for batch cashier
            settlement.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Pilot Filter Select */}
          <div className="flex items-center gap-2 w-60">
            <span className="text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Rider:
            </span>
            <Select
              value={selectedPilotId}
              onValueChange={(val) => {
                setSelectedPilotId(val);
                setSelectedIds([]);
              }}
            >
              <SelectTrigger className="h-11 bg-slate-50 dark:bg-[#1c1829] border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <SelectValue placeholder="Filter by Rider" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#1c1829] border border-slate-200 dark:border-white/5 rounded-xl shadow-xl">
                <SelectItem value="all" className="cursor-pointer text-xs">
                  All Riders
                </SelectItem>
                <SelectItem
                  value="unassigned"
                  className="cursor-pointer text-xs"
                >
                  Unassigned
                </SelectItem>
                {pilots.map((p) => (
                  <SelectItem
                    key={p.id}
                    value={p.id}
                    className="cursor-pointer text-xs"
                  >
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-black px-3.5 py-1.5 rounded-xl shrink-0">
            {filteredChecks.length} Orders
          </span>
        </div>
      </div>

      {/* Table Workspace */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        {filteredChecks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mb-3 opacity-70" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              No Open Orders
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
              No checks match the current filter criteria.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-black">
                <th className="py-4 px-4 w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 dark:border-white/10 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="py-4 px-4">Order #</th>
                <th className="py-4 px-4">Rider Assigned</th>
                <th className="py-4 px-4">Customer</th>
                <th className="py-4 px-4">Phone</th>
                <th className="py-4 px-4">Delivery Address</th>
                <th className="py-4 px-4">Elapsed Time</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredChecks.map((chk: any) => {
                const state = chk.deliveryState || "Preparing";
                const pilot = pilots.find((p) => p.id === chk.deliveryPilotId);

                let statusBadge =
                  "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
                if (state === "Ready") {
                  statusBadge =
                    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20";
                } else if (state === "Dispatched") {
                  statusBadge =
                    "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20";
                } else if (state === "Delivered") {
                  statusBadge =
                    "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20";
                }

                const isRowSelected = selectedIds.includes(chk.id);

                return (
                  <tr
                    key={chk.id}
                    onClick={() => handleOpenCheck(chk.id)}
                    className={`hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors ${
                      isRowSelected ? "bg-indigo-500/5 dark:bg-[#1f1930]" : ""
                    }`}
                  >
                    <td
                      className="py-5 px-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isRowSelected}
                        onChange={() => handleToggleSelect(chk.id)}
                        className="w-5 h-5 rounded border-slate-300 dark:border-white/10 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-5 px-4 font-black text-indigo-600 dark:text-indigo-400 text-sm">
                      #{chk.chkNo}
                    </td>
                    <td className="py-5 px-4 font-extrabold text-indigo-700 dark:text-indigo-300 text-sm">
                      {pilot ? pilot.name : "Unassigned"}
                    </td>
                    <td className="py-5 px-4 font-extrabold text-slate-800 dark:text-slate-200 text-sm truncate max-w-[120px]">
                      {chk.customerName || "Walk-In"}
                    </td>
                    <td className="py-5 px-4 font-bold text-slate-650 dark:text-slate-350">
                      {chk.customerPhone || "N/A"}
                    </td>
                    <td className="py-5 px-4 text-slate-500 dark:text-slate-400 truncate max-w-[200px] font-bold">
                      {chk.deliveryAddress || "N/A"}
                    </td>
                    <td
                      className={`py-5 px-4 font-mono font-black text-sm ${getTimerClass(chk)}`}
                    >
                      {formatElapsedHMS(chk)}
                    </td>
                    <td className="py-5 px-4">
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${statusBadge}`}
                      >
                        {state}
                      </span>
                    </td>
                    <td className="py-5 px-4 font-black text-right text-slate-900 dark:text-white text-sm">
                      {chk.total?.toFixed(2)} EGP
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Settle Action Banner (Sticky Footer inside card) */}
      {selectedIds.length > 0 && (
        <div className="mt-4 p-4 bg-emerald-500/5 dark:bg-[#1a2d20] border border-emerald-500/25 dark:border-white/10 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-150 shrink-0">
          <div className="text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-400">
            Settle {selectedIds.length} Selected{" "}
            {selectedIds.length === 1 ? "Order" : "Orders"}:{" "}
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
              {filteredChecks
                .filter((c) => selectedIds.includes(c.id))
                .reduce((sum, c) => sum + (c.total || 0), 0)
                .toFixed(2)}{" "}
              EGP
            </span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              className="h-12 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer border-none shadow-sm flex-1 sm:flex-none"
              onClick={() => handleBulkSettle("cash")}
            >
              <DollarSign className="w-4 h-4 text-white" />
              Settle Cash
            </Button>
            <Button
              className="h-12 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer border-none shadow-sm flex-1 sm:flex-none"
              onClick={() => handleBulkSettle("visa")}
            >
              <CreditCard className="w-4 h-4 text-white" />
              Settle Visa
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        description={confirmConfig.description}
      />
    </div>
  );
}
