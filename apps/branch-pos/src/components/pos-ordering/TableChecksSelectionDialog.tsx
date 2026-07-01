import { X } from 'lucide-react';
import { Button } from '../ui/button';
import type { CheckWithItems, Table } from '@goldensoft/core-schemas';
import OccTable from '../../icons/Occ-Table';
import PrintedTable from '../../icons/Printed-Table';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';

interface TableChecksSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  table: Table;
  checks: CheckWithItems[];
  onSelectCheck: (chkNo: number) => void;
}

export function TableChecksSelectionDialog({
  open,
  onClose,
  table,
  checks,
  onSelectCheck,
}: TableChecksSelectionDialogProps) {
  const currentUser = useAuthStore(state => state.user);
  const isWaiter = currentUser?.isWaiter;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 select-none animate-in fade-in duration-100">
      <div className="w-full sm:w-[780px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl sm:rounded-[2.5rem] shadow-2xl p-4 sm:p-6 flex flex-col gap-4 max-h-[90vh] text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase text-indigo-650 dark:text-indigo-400 tracking-wider">Multiple Open Bills</span>
            <h3 className="font-black text-lg sm:text-xl text-slate-900 dark:text-slate-100">
              Table {table.name || `T${table.number}`}
            </h3>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            className="h-12 w-12 sm:h-10 sm:w-10 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer active:scale-95 transition-all flex items-center justify-center shrink-0"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Checks Grid of Table-like Cards */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pr-1 py-1">
          {checks.map((chk) => {
            const isPrinted = (chk.printCount || 0) > 0;
            const isOwnCheck = !isWaiter || chk.waiterId === currentUser?.id;

            const config = !isOwnCheck
              ? {
                  bg: 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600',
                  border: 'border-slate-200 dark:border-slate-800/60 cursor-not-allowed opacity-50',
                  pulse: 'bg-slate-300 dark:bg-slate-700',
                  label: chk.waiterName || 'Other Waiter',
                  icon: OccTable
                }
              : isPrinted
              ? {
                  bg: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400',
                  border: 'border-red-200 dark:border-red-500/30 hover:border-red-500 dark:hover:border-red-500/60 hover:bg-red-100 dark:hover:bg-red-950/30 cursor-pointer',
                  pulse: 'bg-red-500',
                  label: 'Printed',
                  icon: PrintedTable
                }
              : {
                  bg: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
                  border: 'border-amber-200 dark:border-amber-500/30 hover:border-amber-500 dark:hover:border-amber-500/60 hover:bg-amber-100 dark:hover:bg-amber-950/30 cursor-pointer',
                  pulse: 'bg-amber-500',
                  label: 'Occupied',
                  icon: OccTable
                };

            const TableIcon = config.icon;
            const shapeClass = table.shape === 'circle' ? 'rounded-full aspect-square' : 'rounded-2xl aspect-square';

            return (
              <div
                key={chk.id}
                onClick={() => {
                  if (isOwnCheck) {
                    onSelectCheck(chk.chkNo);
                  } else {
                    toast.error(`This check belongs to another waiter (${chk.waiterName || 'unknown'}) / هذا الحساب يخص نادل آخر`);
                  }
                }}
                className={`relative select-none border-2 flex flex-col items-center justify-center p-3 transition-all duration-100 overflow-hidden ${shapeClass} ${config.bg} ${config.border} ${isOwnCheck ? 'active:scale-95' : ''}`}
              >
                {/* Floating Custom Check Name Badge */}
                {chk.tableName && (
                  <div className="absolute top-0 left-0 bg-amber-500 dark:bg-amber-600 text-white text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-br shadow-sm z-20 max-w-[85%] truncate select-none border-b border-r border-white/20 uppercase tracking-wider">
                    {chk.tableName}
                  </div>
                )}

                {/* Pulse Dot */}
                <span className="absolute top-2 right-2 flex h-2 w-2">
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${config.pulse}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${config.pulse}`}></span>
                </span>

                {/* Table SVG Icon */}
                <div className="w-[45%] h-[45%] flex items-center justify-center text-current mb-0.5 [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain">
                  <TableIcon />
                </div>

                {/* Check No Label under the Icon */}
                <span className="text-[9px] sm:text-[10px] font-black text-slate-500 dark:text-slate-400 mt-0.5 select-none">
                  Check #{chk.chkNo}
                </span>

                {/* Table Name */}
                <span className="font-extrabold tracking-tight text-[10px] sm:text-xs text-slate-800 dark:text-white select-none mt-0.5">
                  {table.name || `T${table.number}`}
                </span>

                {/* Status Label */}
                <span className="text-[8px] font-black uppercase tracking-wider scale-90 opacity-90 mt-0.5">
                  {config.label}
                </span>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
