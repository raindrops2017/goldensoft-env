import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  Send,
  CheckSquare,
  Square,
  RefreshCw,
  ShoppingBag,
  DollarSign,
  CreditCard,
} from "lucide-react";
import {
  useChecksApi,
  useOpenChecks,
  useDeliveryPilots,
} from "@/hooks/api/useChecksApi";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { DispatchPilotsList } from "../../../components/delivery/DispatchPilotsList";

export default function DeliveryDispatch() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatElapsed = (isoString?: string) => {
    if (!isoString) return "00:00";
    const start = new Date(isoString).getTime();
    const elapsedMs = currentTime.getTime() - start;
    if (elapsedMs < 0) return "00:00";
    const totalSecs = Math.floor(elapsedMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const { data: openChecks = [] } = useOpenChecks();
  const { data: pilots = [], refetch: refetchPilots } = useDeliveryPilots();
  const checksApi = useChecksApi();

  const [selectedCheckIds, setSelectedCheckIds] = useState<string[]>([]);
  const [selectedPilotId, setSelectedPilotId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const deliveryChecks = useMemo(() => {
    return openChecks.filter(
      (c: any) => c.checkKindId === 2 && c.chkStatusId === 1,
    );
  }, [openChecks]);

  const readyChecks = useMemo(() => {
    return deliveryChecks.filter(
      (c: any) =>
        !c.deliveryState ||
        c.deliveryState === "Preparing" ||
        c.deliveryState === "Ready"
    );
  }, [deliveryChecks]);

  const pilotActiveChecks = useMemo(() => {
    const mapping: Record<string, typeof deliveryChecks> = {};
    for (const c of deliveryChecks) {
      if (c.deliveryPilotId) {
        if (!mapping[c.deliveryPilotId]) mapping[c.deliveryPilotId] = [];
        mapping[c.deliveryPilotId].push(c);
      }
    }
    return mapping;
  }, [deliveryChecks]);

  const availablePilots = useMemo(() => {
    return pilots.filter((p: any) => {
      if (!p.isActive) return false;
      const active = pilotActiveChecks[p.id] || [];
      const hasDispatched = active.some((c: any) => c.deliveryState === "Dispatched");
      return !hasDispatched;
    });
  }, [pilots, pilotActiveChecks]);

  const outPilots = useMemo(() => {
    return pilots.filter((p: any) => {
      if (!p.isActive) return false;
      const active = pilotActiveChecks[p.id] || [];
      const hasDispatched = active.some((c: any) => c.deliveryState === "Dispatched");
      return hasDispatched;
    });
  }, [pilots, pilotActiveChecks]);

  const handleToggleCheckSelect = (id: string) => {
    setSelectedCheckIds((prev) =>
      prev.includes(id) ? prev.filter((cId) => cId !== id) : [...prev, id],
    );
  };

  const handleSelectAllReady = () => {
    if (selectedCheckIds.length === readyChecks.length) {
      setSelectedCheckIds([]);
    } else {
      setSelectedCheckIds(readyChecks.map((c: any) => c.id));
    }
  };

  const handleDispatch = async () => {
    if (!selectedPilotId) {
      toast.error("Please select a pilot to dispatch to");
      return;
    }
    if (selectedCheckIds.length === 0) {
      toast.error("Please select at least one order to dispatch");
      return;
    }

    setIsSubmitting(true);
    try {
      await checksApi.dispatchChecks.mutateAsync({
        checkIds: selectedCheckIds,
        pilotId: selectedPilotId,
      });

      for (const chkId of selectedCheckIds) {
        try {
          await checksApi.printCheck.mutateAsync({ chkId });
        } catch (printErr) {
          console.error("Print failed for check ID: " + chkId, printErr);
        }
      }

      toast.success("Orders dispatched and receipt slips printed!");
      setSelectedCheckIds([]);
      setSelectedPilotId(null);
      queryClient.invalidateQueries({ queryKey: ["openChecks"] });
    } catch (err: any) {
      toast.error(
        "Dispatch failed: " + (err.response?.data?.error || err.message),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnOnly = async (pilotId: string, pilotName: string) => {
    const activeChecks = pilotActiveChecks[pilotId] || [];
    setConfirmConfig({
      isOpen: true,
      title: "Free Pilot",
      description: `Free Pilot ${pilotName}? This will release ${activeChecks.length} orders back to the "Ready" list without closing them.`,
      onConfirm: async () => {
        try {
          await checksApi.returnPilot.mutateAsync(pilotId);
          toast.success(`Pilot ${pilotName} returned to shop`);
          queryClient.invalidateQueries({ queryKey: ["openChecks"] });
        } catch (err: any) {
          toast.error(
            "Return failed: " + (err.response?.data?.error || err.message),
          );
        }
      },
    });
  };

  const handleReturnAndSettle = async (
    pilotId: string,
    pilotName: string,
    method: "cash" | "visa",
  ) => {
    const activeChecks = pilotActiveChecks[pilotId] || [];
    if (activeChecks.length === 0) return;

    const totalSum = activeChecks.reduce(
      (sum: number, c: any) => sum + c.total,
      0,
    );
    setConfirmConfig({
      isOpen: true,
      title: `Confirm Settle (${method.toUpperCase()})`,
      description: `Settle all ${activeChecks.length} checks for pilot ${pilotName} via ${method.toUpperCase()}? Total sum: ${totalSum.toFixed(2)} EGP. `,
      onConfirm: async () => {
        try {
          await checksApi.batchCloseChecks.mutateAsync({
            checkIds: activeChecks.map((c: any) => c.id),
            paymentMethod: method === "cash" ? "Cash" : "Visa",
          });

          await checksApi.returnPilot.mutateAsync(pilotId);
          toast.success(
            `Settled carrying orders and checked in ${pilotName} successfully!`,
          );
          queryClient.invalidateQueries({ queryKey: ["openChecks"] });
        } catch (err: any) {
          toast.error(
            "Settlement / Return failed: " +
              (err.response?.data?.error || err.message),
          );
        }
      },
    });
  };

  const handleUnassignCheck = async (checkId: string, chkNo: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Unassign Order",
      description: `Unassign order #${chkNo}? This will return it to the "Ready" list.`,
      onConfirm: async () => {
        try {
          await checksApi.unassignCheckPilot.mutateAsync(checkId);
          toast.success(`Order #${chkNo} unassigned`);
          queryClient.invalidateQueries({ queryKey: ["openChecks"] });
        } catch (err: any) {
          toast.error("Unassign failed: " + (err.response?.data?.error || err.message));
        }
      },
    });
  };

  const handleSwitchPilot = async (checkId: string, chkNo: string, targetPilotId: string, targetPilotName: string) => {
    try {
      await checksApi.assignPilot.mutateAsync({ checkIds: [checkId], pilotId: targetPilotId });
      toast.success(`Order #${chkNo} switched to pilot ${targetPilotName}`);
      queryClient.invalidateQueries({ queryKey: ["openChecks"] });
    } catch (err: any) {
      toast.error("Switch failed: " + (err.response?.data?.error || err.message));
    }
  };

  const handleArrivePilot = async (pilotId: string, pilotName: string) => {
    try {
      await checksApi.arrivePilot.mutateAsync(pilotId);
      toast.success(`Pilot ${pilotName} marked as Arrived (Delivered checks)`);
      queryClient.invalidateQueries({ queryKey: ["openChecks"] });
    } catch (err: any) {
      toast.error("Mark Arrived failed: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-[#0a0510] text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-200 select-none">
      {/* HEADER (Oversized h-20 touch header) */}
      <header className="flex justify-between items-center px-6 h-20 bg-white dark:bg-[#120a1c] border-b border-slate-200 dark:border-white/10 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            className="w-14 h-14 p-0 rounded-2xl text-slate-500 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer border border-slate-200 dark:border-white/10 flex items-center justify-center"
            onClick={() => navigate("/delivery")}
          >
            <ArrowLeft className="w-6 h-6 text-slate-700 dark:text-white" />
          </Button>
          <div className="text-left">
            <h1 className="text-base font-black tracking-tight text-[#1e293b] dark:text-white">
              Dispatch Console
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
              Assign ready orders to delivery pilots and manage checkout
              transits.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-14 w-14 rounded-2xl border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-[#1c1829] dark:bg-[#120a1c] active:scale-95 transition-all p-0 flex items-center justify-center cursor-pointer shadow-sm shrink-0"
            onClick={() => {
              refetchPilots();
              queryClient.invalidateQueries({ queryKey: ["openChecks"] });
              toast.success("Dispatch data re-indexed");
            }}
          >
            <RefreshCw className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          </Button>
          <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3.5 py-1.5 rounded-xl border border-emerald-500/20 text-xs font-black">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Online
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="flex flex-1 p-6 gap-6 min-h-0 overflow-hidden bg-slate-100/50 dark:bg-transparent">
        {/* LEFT PANEL: Ready to Dispatch Checks (Width: 45%) */}
        <section className="flex flex-col w-[45%] bg-white dark:bg-[#151120] border border-slate-200 dark:border-white/10 rounded-3xl p-5 min-h-0 overflow-hidden shadow-sm">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-500" />
              <h2 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-wider">
                Available to Dispatch
              </h2>
              <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-black px-2.5 py-0.5 rounded-full border border-indigo-500/25">
                {readyChecks.length}
              </span>
            </div>
            {readyChecks.length > 0 && (
              <button
                onClick={handleSelectAllReady}
                className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {selectedCheckIds.length === readyChecks.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
            {readyChecks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 text-center py-12">
                <CheckCircle className="w-16 h-16 mb-3 opacity-35 text-indigo-500" />
                <p className="text-sm font-black text-slate-700 dark:text-slate-350">
                  All orders are dispatched
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[280px]">
                  New ready or preparing orders will appear here.
                </p>
              </div>
            ) : (
              readyChecks.map((chk: any) => {
                const isSelected = selectedCheckIds.includes(chk.id);
                return (
                  <div
                    key={chk.id}
                    onClick={() => handleToggleCheckSelect(chk.id)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all active:scale-[0.99] text-left select-none ${
                      isSelected
                        ? "bg-indigo-500/5 dark:bg-[#252036] border-indigo-500 dark:border-indigo-400 shadow-sm"
                        : "bg-white dark:bg-[#1c1829] border-slate-200 dark:border-white/5 hover:border-indigo-500/30"
                    }`}
                  >
                    <div className="shrink-0 text-slate-400">
                      {isSelected ? (
                        <CheckSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <Square className="w-6 h-6 text-slate-300 dark:text-slate-800" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                          <span>Order #{chk.chkNo}</span>
                          <span className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded border ${
                            chk.deliveryState === "Ready"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          }`}>
                            {chk.deliveryState || "Preparing"}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-black">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>{formatElapsed(chk.createdAt)}</span>
                        </div>
                      </div>
                      <div className="text-xs font-black text-slate-650 dark:text-slate-300 mt-1">
                        {chk.customerName || "Walk-In"}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {chk.deliveryAddress || "No address"}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Total
                      </div>
                      <div className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {chk.total?.toFixed(1)} EGP
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* RIGHT PANEL: Pilots Board & Dispatch Controller (Width: 55%) */}
        <section className="flex flex-col w-[55%] bg-white dark:bg-[#151120] border border-slate-200 dark:border-white/10 rounded-3xl p-5 min-h-0 overflow-hidden shadow-sm">
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-4">
            <DispatchPilotsList
              availablePilots={availablePilots}
              outPilots={outPilots}
              pilotActiveChecks={pilotActiveChecks}
              selectedPilotId={selectedPilotId}
              setSelectedPilotId={setSelectedPilotId}
              formatElapsed={formatElapsed}
              handleReturnOnly={handleReturnOnly}
              handleReturnAndSettle={handleReturnAndSettle}
              handleUnassignCheck={handleUnassignCheck}
              handleSwitchPilot={handleSwitchPilot}
              handleArrivePilot={handleArrivePilot}
            />

            {/* DISPATCH CONTROLLER ACTION BANNER */}
            {selectedCheckIds.length > 0 && selectedPilotId && (
              <div className="bg-indigo-500/5 dark:bg-[#252036] border border-indigo-500/25 dark:border-white/10 p-4 rounded-2xl flex justify-between items-center gap-4 shrink-0 shadow-sm text-left">
                <div className="min-w-0">
                  <div className="text-sm font-black text-indigo-700 dark:text-indigo-250">
                    Dispatching {selectedCheckIds.length}{" "}
                    {selectedCheckIds.length === 1 ? "order" : "orders"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1 truncate">
                    Selected Pilot:{" "}
                    <span className="font-extrabold text-slate-700 dark:text-slate-200">
                      {
                        (
                          pilots.find(
                            (p: any) => p.id === selectedPilotId,
                          ) as any
                        )?.name
                      }
                    </span>
                  </div>
                </div>
                <Button
                  className="h-14 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs active:scale-95 transition-all flex items-center gap-2 shrink-0 cursor-pointer border-none shadow-md"
                  onClick={handleDispatch}
                  disabled={isSubmitting}
                >
                  <Send className="w-4.5 h-4.5 text-white" />
                  {isSubmitting ? "Sending..." : "Dispatch & Print"}
                </Button>
              </div>
            )}

            {/* SETTLE CONTROLLER ACTION BANNER FOR ACTIVE/AVAILABLE PILOTS WITH UNSETTLED CHECKS */}
            {selectedCheckIds.length === 0 && selectedPilotId && (() => {
              const active = pilotActiveChecks[selectedPilotId] || [];
              if (active.length === 0) return null;
              const totalSum = active.reduce((sum, c) => sum + (c.total || 0), 0);
              const pilotName = pilots.find((p) => p.id === selectedPilotId)?.name || "";
              return (
                <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/25 dark:border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 shadow-sm text-left animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-emerald-700 dark:text-emerald-450">
                      Settle Pilot: {pilotName}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1">
                      {active.length} unsettled {active.length === 1 ? "order" : "orders"} carrying <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{totalSum.toFixed(1)} EGP</span>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      className="h-12 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer border-none shadow-sm flex-1 sm:flex-none"
                      onClick={() => handleReturnAndSettle(selectedPilotId, pilotName, "cash")}
                    >
                      <DollarSign className="w-4 h-4 text-white" />
                      Settle Cash
                    </Button>
                    <Button
                      className="h-12 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer border-none shadow-sm flex-1 sm:flex-none"
                      onClick={() => handleReturnAndSettle(selectedPilotId, pilotName, "visa")}
                    >
                      <CreditCard className="w-4 h-4 text-white" />
                      Settle Visa
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </section>
      </main>

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
