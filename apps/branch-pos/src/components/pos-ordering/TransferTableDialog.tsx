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
      <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-slate-800 dark:text-white leading-tight flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <ArrowLeftRight size={22} />
            </div>
            <div className="flex flex-col">
              <span>Transfer Table / نقل الطاولة</span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 animate-pulse bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full inline-block w-fit">
                Current Table: {tableName || `T${tableNo}`}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {sections.length > 0 && (
          <div className="flex flex-wrap gap-2 my-2 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
            {sections.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSectionId(sec.id)}
                className={`flex-1 min-w-[80px] h-11 text-xs font-black select-none rounded-xl active:scale-95 transition-all flex items-center justify-center ${
                  activeSectionId === sec.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {sec.name}
              </button>
            ))}
          </div>
        )}

        <div className="py-4 select-none">
          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Select Free Table / اختر طاولة فارغة
          </h4>
          
          {freeTables.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                No free tables available in this section
              </p>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1">
                لا توجد طاولات فارغة في هذا القسم
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {freeTables.map((table) => (
                <button
                  key={table.id}
                  type="button"
                  disabled={isTransferring}
                  onClick={() => onTransfer(table.id)}
                  className="h-16 text-lg font-black bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl active:scale-95 transition-all text-slate-800 dark:text-slate-200 cursor-pointer flex flex-col items-center justify-center shadow-sm relative group disabled:opacity-50"
                >
                  <span>{table.name || `T${table.number}`}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-14 rounded-2xl text-sm font-extrabold cursor-pointer border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition active:scale-98"
          >
            Cancel / إلغاء
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
