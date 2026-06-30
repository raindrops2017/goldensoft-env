import { X } from 'lucide-react';
import { Button } from '../ui/button';
import type { CheckWithItems, Table } from '@goldensoft/core-schemas';
import OccTable from '../../icons/Occ-Table';
import PrintedTable from '../../icons/Printed-Table';

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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none">
      <div className="w-[780px] max-w-[95vw] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-100 max-h-[90vh] text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase text-indigo-650 dark:text-indigo-400 tracking-wider">Multiple Open Bills</span>
            <h3 className="font-black text-xl text-slate-900 dark:text-slate-100">
              Table {table.name || `T${table.number}`}
            </h3>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            className="h-10 w-10 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer active:scale-95 transition-all"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Checks Grid of Table-like Cards */}
        <div className="flex-1 overflow-y-auto grid grid-cols-5 gap-3 pr-1 py-1">
          {checks.map((chk) => {
            const isPrinted = (chk.printCount || 0) > 0;
            const config = isPrinted
              ? {
                  bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/20 text-fuchsia-700 dark:text-fuchsia-400',
                  border: 'border-fuchsia-200 dark:border-fuchsia-500/30 hover:border-fuchsia-500 dark:hover:border-fuchsia-500/60 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-950/30',
                  pulse: 'bg-fuchsia-500',
                  label: 'Printed',
                  icon: PrintedTable
                }
              : {
                  bg: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400',
                  border: 'border-amber-200 dark:border-amber-500/30 hover:border-amber-500 dark:hover:border-amber-500/60 hover:bg-amber-100 dark:hover:bg-amber-950/30',
                  pulse: 'bg-amber-500',
                  label: 'Occupied',
                  icon: OccTable
                };

            const TableIcon = config.icon;
            const shapeClass = table.shape === 'circle' ? 'rounded-full aspect-square' : 'rounded-[1.5rem] aspect-square';

            return (
              <div
                key={chk.id}
                onClick={() => onSelectCheck(chk.chkNo)}
                className={`relative select-none cursor-pointer border-2 flex flex-col items-center justify-center p-3 active:scale-95 transition-all duration-100 ${shapeClass} ${config.bg} ${config.border}`}
              >
                {/* Pulse Dot */}
                <span className="absolute top-2 right-2 flex h-2 w-2">
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${config.pulse}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${config.pulse}`}></span>
                </span>

                {/* Table SVG Icon */}
                <div className=" flex items-center justify-center text-current mb-1 [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain">
                  <TableIcon />
                </div>

                {/* Check No Label / Custom Table Name */}
                <span className="font-extrabold text-xs text-slate-900 dark:text-white text-center truncate max-w-full px-1" title={chk.tableName || `Check #${chk.chkNo}`}>
                  {chk.tableName || `Check #${chk.chkNo}`}
                </span>

                {chk.tableName && (
                  <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 mt-0.5 select-none">
                    Check #{chk.chkNo}
                  </span>
                )}

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
