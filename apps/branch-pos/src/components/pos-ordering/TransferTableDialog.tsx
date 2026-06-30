import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeftRight } from "lucide-react";
import { useTableSections } from "@/hooks/useTables";
import { useOpenChecks } from "@/hooks/api/useChecksApi";
import { useCurrentShift } from "@/hooks/api/useShiftApi";

interface Props {
  open: boolean;
  onClose: () => void;
  tableName: string;
  tableNo: string | undefined;
  onTransfer: (targetTableId: string) => void;
  isTransferring: boolean;
}

export function TransferTableDialog({
  open,
  onClose,
  tableName,
  tableNo,
  onTransfer,
  isTransferring,
}: Props) {
  const { data: sections = [] } = useTableSections();
  const { data: openChecks = [] } = useOpenChecks();
  const { data: currentShift } = useCurrentShift();
  const [activeSectionId, setActiveSectionId] = useState<string>("");

  useEffect(() => {
    if (sections.length > 0 && !activeSectionId) {
      setActiveSectionId(sections[0].id);
    }
  }, [sections, activeSectionId]);

  const activeSectionTables = useMemo(() => {
    const sec = sections.find((s) => s.id === activeSectionId) || sections[0];
    return sec?.tables || [];
  }, [sections, activeSectionId]);

  const freeTables = useMemo(() => {
    if (!currentShift) return [];
    return activeSectionTables.filter((table) => {
      const tableChecks = openChecks.filter(
        (c) => c.tableId === table.id && c.chkDate === currentShift.businessDate
      );
      return tableChecks.length === 0;
    });
  }, [activeSectionTables, openChecks, currentShift]);

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-4xl max-w-[calc(100%-2rem)] bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 font-sans">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-slate-850 dark:text-white leading-tight flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-950/30">
                <ArrowLeftRight size={22} className="animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="tracking-tight select-none">Transfer Table</span>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5 select-none">
                  Select a vacant table to transfer this active check
                </span>
              </div>
            </div>

            {/* Visual Path Flow Card */}
            <div className="bg-gradient-to-r from-slate-50 to-indigo-50/20 dark:from-slate-950/60 dark:to-indigo-950/15 p-4 rounded-2xl border border-slate-150 dark:border-slate-800/80 flex items-center justify-between shadow-inner">
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">Source Table</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-500 animate-ping shrink-0" />
                  <span className="text-base font-black text-indigo-600 dark:text-indigo-400 select-none">
                    {tableName || `T${tableNo}`}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-center px-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-slate-400 dark:text-slate-500 select-none">
                  <ArrowLeftRight size={16} />
                </div>
              </div>

              <div className="flex flex-col gap-1 flex-1 text-right items-end">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">Target Table</span>
                <span className="text-sm font-extrabold text-slate-400 dark:text-slate-650 italic mt-0.5 select-none">
                  Select Destination...
                </span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {sections.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto select-none no-scrollbar py-2 border-b border-slate-100 dark:border-slate-800/50">
            {sections.map((sec) => {
              const isActive = activeSectionId === sec.id;
              // Calculate number of free tables in this section to show as a badge!
              const sectionFreeTablesCount = sec.tables?.filter((table) => {
                if (!currentShift) return false;
                const tableChecks = openChecks.filter(
                  (c) => c.tableId === table.id && c.chkDate === currentShift.businessDate
                );
                return tableChecks.length === 0;
              }).length || 0;

              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSectionId(sec.id)}
                  className={`h-16 px-6 shrink-0 rounded-2xl border flex items-center gap-3 font-black transition-all duration-75 active:scale-95 text-sm cursor-pointer select-none ${
                    isActive
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/25"
                      : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
                  }`}
                >
                  <span>{sec.name}</span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-450"
                    }`}
                  >
                    {sectionFreeTablesCount}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="py-4 select-none">
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            Select Free Table
          </h4>
          
          {freeTables.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                No free tables available in this section
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-3 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
              {freeTables.map((table) => (
                <button
                  key={table.id}
                  type="button"
                  disabled={isTransferring}
                  onClick={() => onTransfer(table.id)}
                  className="h-16 text-base font-black bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-850 rounded-2xl active:scale-95 transition-all text-slate-800 dark:text-slate-200 cursor-pointer flex flex-col items-center justify-center shadow-sm relative group disabled:opacity-50 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 hover:border-indigo-500 dark:hover:border-indigo-500"
                >
                  <span className="tracking-wide">{table.name || `T${table.number}`}</span>
                  <span className="absolute bottom-1.5 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    Vacant
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-16 rounded-2xl text-sm font-extrabold cursor-pointer border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 transition-all active:scale-95 shadow-sm"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
