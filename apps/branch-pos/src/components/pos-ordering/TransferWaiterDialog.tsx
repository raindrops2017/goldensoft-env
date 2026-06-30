import { useState } from "react";
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
  currentWaiterId?: string;
}

function getInitials(name: string) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

interface WaiterCardProps {
  waiter: Waiter;
  isCurrent: boolean;
  isTransferring: boolean;
  onClick: () => void;
}

function WaiterCard({ waiter, isCurrent, isTransferring, onClick }: WaiterCardProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(() => {
    return (waiter as any).profilePic || "/images/default-avatar.jpg";
  });

  const handleImgError = () => {
    setImgSrc(null);
  };

  const initials = getInitials(waiter.username);

  return (
    <button
      type="button"
      disabled={isTransferring || isCurrent}
      onClick={onClick}
      className={`
        w-[calc(20%-12.8px)] min-w-[110px] aspect-square flex flex-col items-center justify-center p-4 rounded-2xl
        cursor-pointer select-none touch-manipulation
        transition-all duration-75 ease-out border text-center relative
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50
        active:scale-95
        ${isCurrent
          ? "bg-slate-100/50 dark:bg-slate-800/30 border-slate-350 dark:border-slate-700 opacity-60 pointer-events-none"
          : "bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800/80 hover:bg-slate-100 hover:border-indigo-500 dark:hover:border-indigo-500 active:bg-slate-200 dark:active:bg-slate-700 shadow-sm"
        }
      `}
    >
      {/* Profile Picture / Initials */}
      <div
        className={`
          w-14 h-14 rounded-full overflow-hidden shrink-0 border-2 transition-colors duration-75 flex items-center justify-center
          ${isCurrent 
            ? "border-slate-300 dark:border-slate-700 bg-slate-250 dark:bg-slate-800" 
            : "border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-800"
          }
        `}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={waiter.username}
            onError={handleImgError}
            className="w-full h-full object-cover select-none pointer-events-none"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-extrabold font-outfit">
            {initials}
          </div>
        )}
      </div>

      {/* Waiter Name */}
      <span
        className={`
          text-xs font-black truncate mt-3 text-center w-full select-none tracking-wide leading-none
          ${isCurrent
            ? "text-slate-500 dark:text-slate-400"
            : "text-slate-700 dark:text-slate-200"
          }
        `}
      >
        {waiter.username}
      </span>

      {/* Current Badge */}
      {isCurrent && (
        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-slate-500 dark:bg-slate-750 text-[9px] font-black tracking-widest uppercase text-white dark:text-slate-200 px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-650 scale-90 select-none">
          Current
        </span>
      )}
    </button>
  );
}

export function TransferWaiterDialog({
  open,
  onClose,
  tableName,
  tableNo,
  onTransfer,
  isTransferring,
  currentWaiterId,
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
      <DialogContent className="sm:max-w-3xl max-w-[calc(100%-2rem)] bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 font-sans">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-slate-850 dark:text-white leading-tight flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-950/30">
                <UserCheck size={22} className="animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="tracking-tight select-none">Transfer Waiter</span>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5 select-none">
                  Assign Table {tableName || `T${tableNo}`} to another active waiter
                </span>
              </div>
            </div>

            {/* Visual Path Flow Card */}
            {/* <div className="bg-gradient-to-r from-slate-50 to-indigo-50/20 dark:from-slate-950/60 dark:to-indigo-950/15 p-4 rounded-2xl border border-slate-150 dark:border-slate-800/80 flex items-center justify-between shadow-inner">
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">Current Waiter</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600 animate-pulse shrink-0" />
                  <span className="text-base font-black text-slate-700 dark:text-slate-300 select-none">
                    {currentWaiter?.username || "None"}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-center px-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-slate-400 dark:text-slate-500 select-none">
                  <ArrowLeftRight size={16} />
                </div>
              </div>

              <div className="flex flex-col gap-1 flex-1 text-right items-end">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">Target Waiter</span>
                <span className="text-sm font-extrabold text-slate-450 dark:text-slate-650 italic mt-0.5 select-none">
                  Select Destination...
                </span>
              </div>
            </div> */}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 select-none">
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            Select Target Waiter
          </h4>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-650" />
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
            <div className="flex flex-wrap gap-4 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
              {waiters.map((waiter) => (
                <WaiterCard
                  key={waiter.id}
                  waiter={waiter}
                  isCurrent={currentWaiterId === waiter.id}
                  isTransferring={isTransferring}
                  onClick={() => onTransfer(waiter.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-16 rounded-2xl text-sm font-extrabold cursor-pointer border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-white transition-all active:scale-95 shadow-sm"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
