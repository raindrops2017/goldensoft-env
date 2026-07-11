import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Motorbike, Printer, CheckSquare, Square } from "lucide-react";
import type { DeliveryPilot } from "@goldensoft/core-schemas";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pilots: DeliveryPilot[];
  unassignedChecks: any[];
  onAssign: (checkIds: string[], pilotId: string, shouldPrint: boolean) => Promise<void>;
  defaultPilotId?: string;
}

export default function PilotAssignmentDialog({
  open,
  onOpenChange,
  pilots,
  unassignedChecks,
  onAssign,
  defaultPilotId
}: Props) {
  const [selectedPilotId, setSelectedPilotId] = useState<string>("");
  const [selectedCheckIds, setSelectedCheckIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Auto-select pilot and reset selected checks on open
  useEffect(() => {
    if (open) {
      setSelectedCheckIds([]);
      if (defaultPilotId) {
        setSelectedPilotId(defaultPilotId);
      } else if (pilots && pilots.length > 0) {
        setSelectedPilotId(pilots[0].id);
      } else {
        setSelectedPilotId("");
      }
    }
  }, [open, pilots, defaultPilotId]);

  const handleToggleSelectAll = () => {
    if (selectedCheckIds.length === unassignedChecks.length) {
      setSelectedCheckIds([]);
    } else {
      setSelectedCheckIds(unassignedChecks.map(c => c.id));
    }
  };

  const handleToggleCheck = (id: string) => {
    setSelectedCheckIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleAssignClick = async (shouldPrint: boolean) => {
    if (!selectedPilotId || selectedCheckIds.length === 0) return;
    setLoading(true);
    try {
      await onAssign(selectedCheckIds, selectedPilotId, shouldPrint);
      onOpenChange(false);
      setSelectedCheckIds([]);
    } catch (err) {
      // errors handled by caller
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-5xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-slate-900 dark:text-slate-100 overflow-hidden flex flex-col max-h-[85vh] shadow-2xl select-none">
        <DialogHeader className="shrink-0 border-b border-slate-100 dark:border-slate-800 pb-4">
          <DialogTitle className="text-xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <Motorbike className="w-6 h-6 text-indigo-500" />
            Pilot Assignment Portal
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 my-4 space-y-5">
          {/* Pilot Dropdown Selection */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 dark:text-slate-400 block mb-1 uppercase tracking-wider">
              Select Delivery Pilot
            </label>
            <select
              value={selectedPilotId}
              onChange={(e) => setSelectedPilotId(e.target.value)}
              className="w-full h-16 rounded-2xl bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 px-4 text-base font-extrabold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Choose Pilot...</option>
              {pilots.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Checks Selection List */}
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-black text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                Unassigned Open Checks ({unassignedChecks.length})
              </label>
              {unassignedChecks.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95"
                  onClick={handleToggleSelectAll}
                >
                  {selectedCheckIds.length === unassignedChecks.length ? "Deselect All" : "Select All"}
                </Button>
              )}
            </div>

            {unassignedChecks.length > 0 ? (
              <div className="border rounded-3xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 shadow-sm">
                {unassignedChecks.map((chk) => {
                  const isChecked = selectedCheckIds.includes(chk.id);
                  return (
                    <div
                      key={chk.id}
                      onClick={() => handleToggleCheck(chk.id)}
                      className="flex items-center justify-between px-5 h-20 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 cursor-pointer active:scale-[0.99] duration-75 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-6 h-6 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                          {isChecked ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-black text-slate-800 dark:text-white">
                            Check #{chk.chkNo}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold truncate max-w-[260px] md:max-w-[400px] mt-0.5">
                            {chk.customerName || "Walk-In"} - {chk.deliveryAddress || "No address"}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        {chk.total.toFixed(2)} EGP
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center">
                <Motorbike className="w-12 h-12 text-slate-350 dark:text-slate-650 mb-3 opacity-55 animate-bounce" />
                <p className="text-sm font-black text-slate-800 dark:text-white">All checks assigned</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">There are no open delivery checks without a pilot.</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 mt-4 gap-3 flex flex-col sm:flex-row border-t border-slate-100 dark:border-slate-800 pt-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl h-16 text-sm font-extrabold flex-1 active:scale-95 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={loading || !selectedPilotId || selectedCheckIds.length === 0}
            className="rounded-2xl h-16 text-sm font-extrabold bg-slate-700 hover:bg-slate-800 text-white flex-1 active:scale-95 transition-all cursor-pointer border-none shadow-sm"
            onClick={() => handleAssignClick(false)}
          >
            Assign Only
          </Button>
          <Button
            type="button"
            disabled={loading || !selectedPilotId || selectedCheckIds.length === 0}
            className="rounded-2xl h-16 text-sm font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white flex-1 flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-indigo-900/10 border-none cursor-pointer"
            onClick={() => handleAssignClick(true)}
          >
            <Printer className="w-5 h-5" />
            Print & Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
