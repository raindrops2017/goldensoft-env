import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Clock,
  UserMinus,
  ArrowLeftRight,
  CheckSquare,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DeliveryPilot } from "@goldensoft/core-schemas";

interface Props {
  availablePilots: DeliveryPilot[];
  outPilots: DeliveryPilot[];
  pilotActiveChecks: Record<string, any[]>;
  selectedPilotId: string | null;
  setSelectedPilotId: (id: string | null) => void;
  formatElapsed: (isoString?: string) => string;
  handleReturnOnly: (pilotId: string, pilotName: string) => Promise<void>;
  handleReturnAndSettle: (
    pilotId: string,
    pilotName: string,
    method: "cash" | "visa",
  ) => Promise<void>;
  handleUnassignCheck: (checkId: string, chkNo: string) => Promise<void>;
  handleSwitchPilot: (
    checkId: string,
    chkNo: string,
    targetPilotId: string,
    targetPilotName: string,
  ) => Promise<void>;
  handleArrivePilot: (pilotId: string, pilotName: string) => Promise<void>;
}

export function DispatchPilotsList({
  availablePilots,
  outPilots,
  pilotActiveChecks,
  selectedPilotId,
  setSelectedPilotId,
  formatElapsed,
  handleReturnAndSettle,
  handleUnassignCheck,
  handleSwitchPilot,
  handleArrivePilot,
}: Props) {
  const [activeTab, setActiveTab] = useState<"available" | "out">("available");
  const [switchingCheck, setSwitchingCheck] = useState<any | null>(null);

  return (
    <div className="flex-1 flex flex-col min-h-0 select-none text-left">
      {/* ── Tabs (Oversized touch targets) ── */}
      <div className="flex bg-slate-150 dark:bg-[#120a1c] p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("available")}
          className={`h-14 flex-1 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center justify-center gap-2 cursor-pointer border-none ${
            activeTab === "available"
              ? "bg-white dark:bg-[#252036] text-emerald-600 dark:text-white shadow-sm border border-slate-200/50"
              : "bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${activeTab === "available" ? "bg-emerald-500" : "bg-slate-400"}`}
          ></span>
          Available ({availablePilots.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("out")}
          className={`h-14 flex-1 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center justify-center gap-2 cursor-pointer border-none ${
            activeTab === "out"
              ? "bg-white dark:bg-[#252036] text-amber-600 dark:text-white shadow-sm border border-slate-200/50"
              : "bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${activeTab === "out" ? "bg-amber-500 animate-pulse" : "bg-slate-400"}`}
          ></span>
          Out on Delivery ({outPilots.length})
        </button>
      </div>

      {/* ── Tab Panels ── */}
      <div className="flex-1 overflow-y-auto mt-4 pr-1 scrollbar-thin">
        {activeTab === "available" ? (
          availablePilots.length === 0 ? (
            <div className="bg-slate-50 dark:bg-[#1c1829] border border-dashed border-slate-200 dark:border-white/5 p-8 rounded-2xl text-center text-xs text-slate-500 dark:text-slate-400 font-bold">
              No pilots currently available in the branch.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {availablePilots.map((p: any) => {
                const isSelected = selectedPilotId === p.id;
                const active = pilotActiveChecks[p.id] || [];
                const unsettledCount = active.length;
                const unsettledAmount = active.reduce(
                  (sum, c) => sum + (c.total || 0),
                  0,
                );

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPilotId(isSelected ? null : p.id)}
                    className={`relative w-full aspect-square flex flex-col items-center justify-center p-3 rounded-2xl cursor-pointer select-none touch-manipulation transition-all duration-75 ease-out border text-center active:scale-95 focus-visible:outline-none ${
                      isSelected
                        ? "bg-emerald-500/5 dark:bg-[#252036] border-emerald-500 ring-1 ring-emerald-500"
                        : "bg-white dark:bg-[#1c1829] border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-[#252036]"
                    }`}
                  >
                    {/* Unsettled amount badge */}
                    {unsettledCount > 0 && (
                      <span
                        className="absolute top-2 right-2 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white shadow-sm"
                        title={`${unsettledCount} unsettled orders`}
                      >
                        {unsettledCount}
                      </span>
                    )}

                    {/* Circular Avatar (matches employee grid) */}
                    <div
                      className={`w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 transition-colors duration-75 ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-slate-250 dark:border-slate-800 bg-slate-250 dark:bg-slate-800"
                      }`}
                    >
                      <img
                        src="/images/default-avatar.jpg"
                        alt={p.name}
                        className="w-full h-full object-cover select-none pointer-events-none"
                      />
                    </div>

                    {/* Name */}
                    <span
                      className={`text-xs font-black truncate mt-2.5 text-center w-full tracking-wide leading-none ${
                        isSelected
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {p.name}
                    </span>
                    {unsettledCount > 0 ? (
                      <span className="text-[9px] text-amber-600 dark:text-amber-400 font-extrabold mt-1">
                        {unsettledAmount.toFixed(0)} EGP
                      </span>
                    ) : (
                      p.phone && (
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1 truncate w-full">
                          {p.phone}
                        </span>
                      )
                    )}
                  </button>
                );
              })}
            </div>
          )
        ) : outPilots.length === 0 ? (
          <div className="bg-slate-50 dark:bg-[#1c1829] border border-dashed border-slate-200 dark:border-white/5 p-8 rounded-2xl text-center text-xs text-slate-500 dark:text-slate-400 font-bold">
            No pilots currently out on delivery road trips.
          </div>
        ) : (
          <div className="space-y-3.5">
            {outPilots.map((p: any) => {
              const activeChecks = (pilotActiveChecks[p.id] || []).filter(
                (chk: any) => chk.deliveryState === "Dispatched"
              );
              const newestCheck = activeChecks.reduce(
                (newest: any, current: any) => {
                  if (!newest) return current;
                  return new Date(
                    current.dispatchedAt || current.updatedAt,
                  ).getTime() >
                    new Date(newest.dispatchedAt || newest.updatedAt).getTime()
                    ? current
                    : newest;
                },
                null as any,
              );

              const dispatchTime =
                newestCheck?.dispatchedAt || newestCheck?.updatedAt;

              return (
                <div
                  key={p.id}
                  className="bg-slate-50 dark:bg-[#1c1829] border border-slate-200 dark:border-white/5 rounded-2xl p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-black text-slate-800 dark:text-white">
                        {p.name}
                      </div>
                      {p.phone && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1.5 mt-1">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span>{p.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-lg text-xs font-black border border-amber-500/20">
                        <Clock className="w-4 h-4" />
                        <span>{formatElapsed(dispatchTime)}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 rounded-lg hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 hover:text-emerald-700 active:scale-95 transition-all text-xs font-black flex items-center gap-1 cursor-pointer bg-transparent border border-emerald-500/20 animate-in fade-in duration-100"
                        onClick={() => handleArrivePilot(p.id, p.name)}
                      >
                        <CheckSquare className="w-4 h-4 text-emerald-500" />
                        Arrive
                      </Button>
                    </div>
                  </div>

                  {/* Order items carrying */}
                  <div className="space-y-2 mt-3.5 pt-3.5 border-t border-slate-150 dark:border-white/10">
                    {activeChecks.map((chk: any) => (
                      <div
                        key={chk.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#120a1c] border border-slate-200 dark:border-white/5"
                      >
                        <div className="min-w-0 flex-1 mr-2 text-left">
                          <div className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                            <span className="text-indigo-650 dark:text-indigo-400">
                              #{chk.chkNo}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold truncate max-w-[120px]">
                              {chk.customerName || "Walk-In"}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[200px] mt-0.5">
                            {chk.deliveryAddress || "No address"}
                          </div>
                          <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 mt-1">
                            {chk.total?.toFixed(1)} EGP &bull;{" "}
                            <span className="uppercase text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-550 dark:text-amber-400 border border-amber-500/20">
                              {chk.deliveryState}
                            </span>
                          </div>
                        </div>

                        {/* Small icon action buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Unassign */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 p-0 rounded-xl hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 active:scale-95 transition-all text-slate-400 cursor-pointer flex items-center justify-center border-none"
                            onClick={() =>
                              handleUnassignCheck(chk.id, chk.chkNo)
                            }
                            title="Unassign Order"
                          >
                            <UserMinus className="w-4.5 h-4.5" />
                          </Button>

                          {/* Switch Pilot */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 p-0 rounded-xl hover:bg-indigo-500/10 hover:text-indigo-650 dark:hover:text-indigo-400 active:scale-95 transition-all text-slate-400 cursor-pointer flex items-center justify-center border-none"
                            onClick={() => setSwitchingCheck(chk)}
                            title="Switch Pilot"
                          >
                            <ArrowLeftRight className="w-4.5 h-4.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Switch Pilot Dialog (Oversized touch targets / Wide Width) ── */}
      <Dialog
        open={!!switchingCheck}
        onOpenChange={(open) => !open && setSwitchingCheck(null)}
      >
        <DialogContent className="sm:max-w-4xl max-w-[calc(100%-2rem)] w-full bg-[#f8fafc] dark:bg-[#0c0a17] border border-slate-200/50 dark:border-white/10 rounded-3xl p-6 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-slate-100 dark:border-white/5">
            <DialogTitle className="text-lg font-black text-slate-800 dark:text-white">
              Switch Pilot for Order #{switchingCheck?.chkNo}
            </DialogTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select an available pilot to transfer this order's transit.
            </p>
          </DialogHeader>

          <div className="py-6 overflow-y-auto max-h-[400px]">
            {availablePilots.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400 font-bold text-xs">
                No available pilots to switch to.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {availablePilots.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={async () => {
                      if (switchingCheck) {
                        await handleSwitchPilot(
                          switchingCheck.id,
                          switchingCheck.chkNo,
                          p.id,
                          p.name,
                        );
                        setSwitchingCheck(null);
                      }
                    }}
                    className="relative w-full aspect-square flex flex-col items-center justify-center p-3 rounded-2xl cursor-pointer select-none touch-manipulation transition-all duration-75 ease-out border text-center bg-white dark:bg-[#1c1829] border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-[#252036] active:scale-95"
                  >
                    {/* Circular Avatar */}
                    <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-800">
                      <img
                        src="/images/default-avatar.jpg"
                        alt={p.name}
                        className="w-full h-full object-cover select-none pointer-events-none"
                      />
                    </div>

                    {/* Name */}
                    <span className="text-xs font-black truncate mt-2 text-center w-full select-none tracking-wide leading-none text-slate-700 dark:text-slate-200">
                      {p.name}
                    </span>
                    {p.phone && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1 truncate w-full">
                        {p.phone}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
