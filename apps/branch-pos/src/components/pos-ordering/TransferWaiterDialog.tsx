import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserCheck, Loader2 } from "lucide-react";

interface Waiter {
  id: string;
  username: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  tableName: string;
  tableNo: string | undefined;
  onTransfer: (targetWaiterId: string) => void;
  isTransferring: boolean;
}

export function TransferWaiterDialog({
  open,
  onClose,
  tableName,
  tableNo,
  onTransfer,
  isTransferring,
}: Props) {
  // Fetch active waiters list
  const { data: waiters = [], isLoading, error } = useQuery({
    queryKey: ["activeWaiters"],
    queryFn: async () => {
      const res = await api.get("/auth/waiters");
      return res.data.data as Waiter[];
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 font-sans">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-slate-800 dark:text-white leading-tight flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <UserCheck size={22} />
            </div>
            <div className="flex flex-col">
              <span>Transfer Waiter / تحويل النادل</span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 animate-pulse bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full inline-block w-fit">
                Table: {tableName || `T${tableNo}`}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 select-none">
          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Select Target Waiter / اختر النادل
          </h4>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : error ? (
            <div className="text-center py-6 text-red-500 font-bold text-sm">
              Failed to load waiters list.
            </div>
          ) : waiters.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                No active waiters available
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
              {waiters.map((waiter) => (
                <button
                  key={waiter.id}
                  type="button"
                  disabled={isTransferring}
                  onClick={() => onTransfer(waiter.id)}
                  className="h-16 w-full text-base font-extrabold bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-250 dark:border-slate-800 rounded-2xl active:scale-95 active:bg-slate-200 dark:active:bg-slate-700 transition-all text-slate-800 dark:text-slate-200 cursor-pointer flex items-center justify-between px-5 shadow-sm relative disabled:opacity-50"
                >
                  <span>{waiter.username}</span>
                  <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-xs">
                    ID
                  </div>
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
