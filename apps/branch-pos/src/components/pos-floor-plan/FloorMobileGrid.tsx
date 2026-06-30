import type { Table } from '@goldensoft/core-schemas';
import FreeTable from '@/icons/Free-Table';

interface FloorMobileGridProps {
  activeSection: {
    tables: Table[];
  };
  locks: Record<string, any>;
  getTableStatus: (tableId: string) => string;
  statusConfig: Record<
    string,
    { bg: string; border: string; label: string; pulse: string }
  >;
  tableIconMap: Record<string, any>;
  handleTableClick: (table: Table) => void;
  openChecks?: any[];
  businessDate?: string;
}

export function FloorMobileGrid({
  activeSection,
  locks,
  getTableStatus,
  statusConfig,
  tableIconMap,
  handleTableClick,
  openChecks = [],
  businessDate
}: FloorMobileGridProps) {
  if (!activeSection.tables || activeSection.tables.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-6 select-none bg-slate-50 dark:bg-[#0a0710] flex flex-col items-center justify-center py-16 text-slate-400 text-sm font-semibold">
        No tables found in this view.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 select-none bg-slate-50 dark:bg-[#0a0710]">
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
        {[...activeSection.tables]
          .sort((a, b) => a.number - b.number)
          .map((table) => {
            const status = getTableStatus(table.id);
            const config = statusConfig[status];
            const TableSvgIcon = tableIconMap[status] || FreeTable;
            const tableLock = locks[table.id];

            return (
              <button
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={`h-24 rounded-2xl border-2 flex items-center justify-between px-4 transition-all duration-75 active:scale-95 text-left select-none relative overflow-hidden ${
                  tableLock
                    ? 'border-red-500/40 bg-red-50 dark:bg-red-950/20 cursor-not-allowed opacity-60'
                    : table.belongsToCurrentUser === false
                    ? 'border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 cursor-not-allowed opacity-50 shadow-none'
                    : `${config.bg} ${config.border} hover:scale-102 hover:shadow-lg`
                }`}
              >
                {tableLock && (
                  <span className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}

                {table.belongsToCurrentUser === false && (
                  <span className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400 dark:bg-slate-600"></span>
                  </span>
                )}

                {!tableLock && status !== 'free' && (
                  <span className="absolute top-2 right-2 flex h-2 w-2">
                    <span
                      className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${config.pulse}`}
                    ></span>
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${config.pulse}`}
                    ></span>
                  </span>
                )}

                {/* Floating Custom Check Name Badge */}
                {(() => {
                  const tableChecks = openChecks ? openChecks.filter(
                    (c) => c.tableId === table.id && c.chkDate === businessDate
                  ) : [];
                  if (tableChecks.length === 1 && tableChecks[0].tableName) {
                    return (
                      <div className="absolute top-0 left-0 bg-amber-500 dark:bg-amber-600 text-white text-[11px] sm:text-[12px] font-black px-2.5 py-1 rounded-br shadow-sm z-20 max-w-[85%] truncate select-none border-b border-r border-white/20 uppercase tracking-wider">
                        {tableChecks[0].tableName}
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="flex flex-col justify-center select-none pr-2 max-w-[65%]">
                  <span className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-white truncate">
                    {table.name || `T${table.number}`}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-wider opacity-85 truncate select-none">
                    {tableLock ? `Locked` : table.belongsToCurrentUser === false ? 'Other Waiter' : config.label}
                  </span>
                </div>

                <div className="w-10 h-10 shrink-0 flex items-center justify-center text-current [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain">
                  <TableSvgIcon />
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
}
