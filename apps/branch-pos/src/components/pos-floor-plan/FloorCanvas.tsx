import { Button } from '@/components/ui/button';
import {
  Plus,
  Grid,
  AlignLeft,
  AlignRight,
  AlignStartVertical,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  Trash2,
  Copy,
  Settings,
  Lock
} from 'lucide-react';
import type { Table } from '@goldensoft/core-schemas';
import type { TableSectionWithTables } from '@/hooks/useTables';
import FreeTable from '../../icons/Free-Table';

interface FloorCanvasProps {
  activeSection: TableSectionWithTables;
  isEditMode: boolean;
  selectedTableIds: string[];
  localPositions: Record<string, { posX: number; posY: number }>;
  locks: Record<string, any>;
  getTableStatus: (tableId: string) => string;
  statusConfig: Record<
    string,
    { bg: string; border: string; label: string; pulse: string }
  >;
  tableIconMap: Record<string, any>;
  handleTableClick: (table: Table) => void;
  setActiveConfigTableId: (id: string | null) => void;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>, table: Table) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>, table: Table) => void;
  handleCreateTable: () => void;
  handleCloneTableDirectly: (table: Table) => void;
  setIsAddBatchOpen: (val: boolean) => void;
  containerRef: (node: HTMLDivElement | null) => void;
  containerSize: { width: number; height: number };
  handleAlignSelected: (alignment: 'left' | 'right' | 'top' | 'bottom') => void;
  handleDistributeSelected: (direction: 'horizontal' | 'vertical') => void;
  setIsDeleteBatchOpen: (val: boolean) => void;
  openChecks?: any[];
  businessDate?: string;
}

export function FloorCanvas({
  activeSection,
  isEditMode,
  selectedTableIds,
  localPositions,
  locks,
  getTableStatus,
  statusConfig,
  tableIconMap,
  handleTableClick,
  setActiveConfigTableId,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  handleCreateTable,
  handleCloneTableDirectly,
  setIsAddBatchOpen,
  containerRef,
  containerSize,
  handleAlignSelected,
  handleDistributeSelected,
  setIsDeleteBatchOpen,
  openChecks = [],
  businessDate
}: FloorCanvasProps) {
  return (
    <div
      ref={containerRef}
      className="flex-1 relative flex items-center justify-center overflow-hidden"
    >
      <section
        className={`bg-slate-100/40 dark:bg-black/35 overflow-hidden flex flex-col shadow-inner transition-all duration-75 ${
          isEditMode
            ? 'relative shrink-0 shadow-2xl border border-slate-200 dark:border-white/5 rounded-[2.5rem]'
            : 'absolute inset-0 w-full h-full'
        }`}
        style={
          isEditMode
            ? {
                width: '1024px',
                height: '600px'
              }
            : undefined
        }
      >
        {/* Subtle snap grid layout overlay in edit mode */}
        {isEditMode && (
          <div
            className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-10"
            style={{
              backgroundImage:
                'radial-gradient(circle, #6366f1 1px, transparent 1.5px)',
              backgroundSize: '20px 20px'
            }}
          />
        )}

        <div
          className="w-full h-full relative overflow-hidden"
          id="seating-canvas"
        >
          {activeSection.tables.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <span className="text-slate-400 text-sm font-semibold">
                No Seating tables placed in this section.
              </span>
              {isEditMode && (
                <Button
                  onClick={handleCreateTable}
                  variant="outline"
                  className="h-16 rounded-2xl px-5 border-slate-200 dark:border-white/10 dark:text-white dark:bg-[#201b2f] mt-2 active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Place Table
                </Button>
              )}
            </div>
          ) : (
            activeSection.tables.map((table) => {
              const localPos = localPositions[table.id];
              const posX = localPos ? localPos.posX : table.posX;
              const posY = localPos ? localPos.posY : table.posY;
              const isSelected = selectedTableIds.includes(table.id);
              const status = getTableStatus(table.id);
              const config = statusConfig[status];
              const TableSvgIcon = tableIconMap[status] || FreeTable;
              const tableLock = locks[table.id];

              // Responsive position calculations maintaining original aspect ratio of tables
              const scaleX = containerSize.width / 1024;
              const scaleY = containerSize.height / 600;
              const tableScale = Math.min(scaleX, scaleY);

              const widthVal = isEditMode
                ? table.tableWidth
                : table.tableWidth * tableScale;
              const heightVal = isEditMode
                ? table.tableHeight
                : table.tableHeight * tableScale;

              const leftVal = isEditMode
                ? posX
                : (posX + table.tableWidth / 2) * scaleX - widthVal / 2;
              const topVal = isEditMode
                ? posY
                : (posY + table.tableHeight / 2) * scaleY - heightVal / 2;

              return (
                <div
                  key={table.id}
                  onPointerDown={(e) => onPointerDown(e, table)}
                  onPointerMove={onPointerMove}
                  onPointerUp={(e) => onPointerUp(e, table)}
                  onClick={() => {
                    if (!isEditMode) {
                      handleTableClick(table);
                    }
                  }}
                  className={`absolute select-none cursor-pointer border-2 flex flex-col items-center justify-center group font-sans active:scale-95 transition-all duration-100 ${
                    table.shape === 'circle' ? 'rounded-full' : 'rounded-2xl'
                  } ${
                    isEditMode
                      ? isSelected
                        ? 'border-indigo-600 bg-indigo-600/20 ring-4 ring-indigo-600/10 shadow-lg scale-105'
                        : 'border-slate-300 dark:border-white/5 bg-white dark:bg-[#1a1626]/40 shadow-sm text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-[#1a1626]/60 hover:text-slate-950 dark:hover:text-white'
                      : tableLock
                      ? 'border-red-500/40 bg-red-950/20 hover:scale-100 cursor-not-allowed shadow-none'
                      : table.belongsToCurrentUser === false
                      ? 'border-slate-500/40 bg-slate-900/10 hover:scale-100 cursor-not-allowed shadow-none opacity-60'
                      : `${config.bg} ${config.border} hover:scale-102 hover:shadow-lg`
                  } ${!isEditMode ? 'overflow-hidden' : ''}`}
                  style={{
                    left: `${leftVal}px`,
                    top: `${topVal}px`,
                    width: `${widthVal}px`,
                    height: `${heightVal}px`,
                    touchAction: 'none'
                  }}
                >
                  {/* Floating Custom Check Name Badge */}
                  {!isEditMode && (() => {
                    const tableChecks = openChecks ? openChecks.filter(
                      (c) => c.tableId === table.id && c.chkDate === businessDate
                    ) : [];
                    if (tableChecks.length === 1 && tableChecks[0].tableName) {
                      return (
                        <div className="absolute top-0 left-0 bg-amber-500 dark:bg-amber-600 text-white text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-br shadow-sm z-20 max-w-[85%] truncate select-none border-b border-r border-white/20 uppercase tracking-wider">
                          {tableChecks[0].tableName}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Operational Table Lock Overlay */}
                  {!isEditMode && tableLock && (
                    <div
                      className={`absolute inset-0 bg-red-950/30 border-red-500/60 border-2 flex flex-col items-center justify-center backdrop-blur-[0.5px] z-10 select-none ${
                        table.shape === 'circle' ? 'rounded-full' : 'rounded-2xl'
                      }`}
                    >
                      <Lock className="w-5 h-5 text-red-500 animate-bounce" />
                      <span className="text-[8px] font-black text-red-300 mt-0.5 uppercase truncate max-w-[85%] select-none">
                        Locked
                      </span>
                    </div>
                  )}

                  {/* Waiter Lock Overlay */}
                  {!isEditMode && !tableLock && table.belongsToCurrentUser === false && (
                    <div
                      className={`absolute inset-0 bg-slate-900/35 border-slate-500/60 border-2 flex flex-col items-center justify-center backdrop-blur-[0.5px] z-10 select-none ${
                        table.shape === 'circle' ? 'rounded-full' : 'rounded-2xl'
                      }`}
                    >
                      <Lock className="w-5 h-5 text-slate-400" />
                      <span className="text-[8px] font-black text-slate-300 mt-0.5 uppercase truncate max-w-[85%] select-none">
                        Other Waiter
                      </span>
                    </div>
                  )}

                  {/* Clone table directly icon button */}
                  {isEditMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleCloneTableDirectly(table);
                      }}
                      className="clone-btn absolute top-1 right-8 w-6 h-6 rounded-full bg-white dark:bg-[#1a1626] border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-indigo-600 hover:border-indigo-500 active:scale-90 transition-all z-10 shadow-md cursor-pointer"
                      title="Clone Table"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}

                  {/* Properties settings icon shown on every table in edit mode only */}
                  {isEditMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setActiveConfigTableId(table.id);
                      }}
                      className="settings-btn absolute top-1 right-1 w-6 h-6 rounded-full bg-white dark:bg-[#1a1626] border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-indigo-600 hover:border-indigo-500 active:scale-90 transition-all z-10 shadow-md cursor-pointer"
                      title="Configure Table"
                    >
                      <Settings className="w-3 h-3" />
                    </button>
                  )}

                  {/* Check state pulse dot overlay */}
                  {!isEditMode && status !== 'free' && (
                    <span className="absolute top-2 right-2 flex h-2 w-2">
                      <span
                        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${config.pulse}`}
                      ></span>
                      <span
                        className={`relative inline-flex rounded-full h-2 w-2 ${config.pulse}`}
                      ></span>
                    </span>
                  )}

                  {/* Render direct SVG imported components */}
                  <div className="w-[45%] h-[45%] flex items-center justify-center text-current mb-0.5 [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain">
                    <TableSvgIcon />
                  </div>

                  <span className="font-extrabold tracking-tight text-[10px] sm:text-xs text-slate-800 dark:text-white select-none">
                    {table.name || `T${table.number}`}
                  </span>

                  {/* Show status label in non-edit mode */}
                  {!isEditMode && (
                    <span className="text-[8px] font-black uppercase tracking-wider scale-90 opacity-90">
                      {config.label}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Floating batch and add table buttons inside canvas in edit mode */}
        {isEditMode && (
          <>
            <button
              onClick={() => setIsAddBatchOpen(true)}
              className="absolute bottom-6 right-24 w-16 h-16 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-lg hover:bg-slate-700 active:scale-90 transition-transform cursor-pointer border border-white/10"
              title="Add Batch of Tables"
            >
              <Grid className="w-6 h-6" />
            </button>

            <button
              onClick={handleCreateTable}
              className="absolute bottom-6 right-6 w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:bg-indigo-700 active:scale-90 transition-transform cursor-pointer"
              title="Add New Seating Table"
            >
              <Plus className="w-8 h-8" />
            </button>
          </>
        )}
      </section>

      {/* Floating Design Alignment Toolbar */}
      {isEditMode && selectedTableIds.length > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-[#15111d]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl rounded-3xl p-2.5 flex items-center gap-1.5 z-30 select-none animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header/Label indicating anchor */}
          <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex flex-col justify-center select-none shrink-0 mr-1.5 max-w-[120px]">
            <span className="text-[8px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest leading-none select-none">
              Selection ({selectedTableIds.length})
            </span>
            <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 truncate select-none leading-tight mt-0.5">
              Anchor:{' '}
              {activeSection.tables.find((t) => t.id === selectedTableIds[0])
                ?.name ||
                `T${
                  activeSection.tables.find(
                    (t) => t.id === selectedTableIds[0]
                  )?.number || ''
                }`}
            </span>
          </div>

          {/* Alignment Tools Group */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleAlignSelected('left')}
              disabled={selectedTableIds.length < 2}
              className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer text-slate-700 dark:text-slate-300"
              title="Align Left"
            >
              <AlignLeft className="w-5 h-5" />
            </button>

            <button
              onClick={() => handleAlignSelected('right')}
              disabled={selectedTableIds.length < 2}
              className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer text-slate-700 dark:text-slate-300"
              title="Align Right"
            >
              <AlignRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => handleAlignSelected('top')}
              disabled={selectedTableIds.length < 2}
              className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer text-slate-700 dark:text-slate-300"
              title="Align Top"
            >
              <AlignStartVertical className="w-5 h-5" />
            </button>

            <button
              onClick={() => handleAlignSelected('bottom')}
              disabled={selectedTableIds.length < 2}
              className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer text-slate-700 dark:text-slate-300"
              title="Align Bottom"
            >
              <AlignEndVertical className="w-5 h-5" />
            </button>
          </div>

          <div className="w-[1px] h-8 bg-slate-200 dark:bg-white/10 mx-1 shrink-0" />

          {/* Distribution Tools Group */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleDistributeSelected('horizontal')}
              disabled={selectedTableIds.length < 3}
              className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer text-slate-700 dark:text-slate-300"
              title="Distribute Horizontally"
            >
              <AlignHorizontalDistributeCenter className="w-5 h-5" />
            </button>

            <button
              onClick={() => handleDistributeSelected('vertical')}
              disabled={selectedTableIds.length < 3}
              className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer text-slate-700 dark:text-slate-300"
              title="Distribute Vertically"
            >
              <AlignVerticalDistributeCenter className="w-5 h-5" />
            </button>
          </div>

          <div className="w-[1px] h-8 bg-slate-200 dark:bg-white/10 mx-1 shrink-0" />

          {/* Floating Delete Selected Button */}
          <button
            onClick={() => setIsDeleteBatchOpen(true)}
            className="h-12 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-1.5 font-bold text-xs active:scale-95 transition-all cursor-pointer"
            title="Delete Selected Tables"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete ({selectedTableIds.length})</span>
          </button>
        </div>
      )}
    </div>
  );
}
