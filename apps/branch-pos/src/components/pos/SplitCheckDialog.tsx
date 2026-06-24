import { useState, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Scissors, 
  Users, 
  ArrowRightLeft,
  MapPin
} from 'lucide-react';
import { Button } from '../ui/button';
import type { CheckWithItems } from '@goldensoft/core-schemas';
import { toast } from 'sonner';
import { useTableSections } from '../../hooks/useTables';

interface SplitCheckDialogProps {
  open: boolean;
  onClose: () => void;
  check: CheckWithItems;
  onSplitConfirm: (payload: {
    type: 'items' | 'evenly';
    itemsSplits?: Array<{
      guestCount: number;
      tableId?: string;
      items: Array<{ checkItemId: string; qty: number }>;
    }>;
    evenSplitCount?: number;
  }) => Promise<void>;
}

interface TempCheckCol {
  id: string; // 'original' or UUID
  guestCount: number;
  tableId?: string;
  tableName?: string;
  items: Array<{
    checkItemId: string;
    menuItemId: string;
    itemName: string;
    itemPrice: number;
    qty: number;
    modifiers: any[];
  }>;
}

export function SplitCheckDialog({ open, onClose, check, onSplitConfirm }: SplitCheckDialogProps) {
  if (!open) return null;

  const { data: sections = [] } = useTableSections();
  const allTables = useMemo(() => sections.flatMap(s => s.tables), [sections]);

  // Even split input states
  const [showEvenNumpad, setShowEvenNumpad] = useState(false);
  const [evenCount, setEvenCount] = useState<string>('');

  // Items split states
  const [columns, setColumns] = useState<TempCheckCol[]>(() => {
    const originalItems = (check.items || []).map(item => ({
      checkItemId: item.id,
      menuItemId: item.menuItemId,
      itemName: item.itemName || 'Item',
      itemPrice: item.itemPrice,
      qty: item.qty,
      modifiers: item.modifiers || [],
    }));

    return [
      {
        id: 'original',
        guestCount: check.guestCount || 1,
        tableId: check.tableId || undefined,
        tableName: check.tableName || undefined,
        items: originalItems,
      },
      {
        id: crypto.randomUUID(),
        guestCount: 1,
        tableId: check.tableId || undefined,
        tableName: check.tableName || undefined,
        items: [],
      }
    ];
  });

  // Table selector popup states
  const [selectingTableColId, setSelectingTableColId] = useState<string | null>(null);

  // Active selected item for transfer
  const [activeTransferItem, setActiveTransferItem] = useState<{
    sourceColId: string;
    checkItemId: string;
    maxQty: number;
    qty: number;
  } | null>(null);



  const handleAddColumn = () => {
    setColumns(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        guestCount: 1,
        tableId: check.tableId || undefined,
        tableName: check.tableName || undefined,
        items: [],
      }
    ]);
  };

  const handleRemoveColumn = (colId: string) => {
    if (colId === 'original') return;
    const colToRemove = columns.find(c => c.id === colId);
    if (!colToRemove) return;

    // Put items back to original check
    setColumns(prev => {
      const original = prev.find(c => c.id === 'original')!;
      const updatedOriginalItems = [...original.items];

      for (const item of colToRemove.items) {
        const existing = updatedOriginalItems.find(i => i.checkItemId === item.checkItemId);
        if (existing) {
          existing.qty += item.qty;
        } else {
          updatedOriginalItems.push(item);
        }
      }

      return prev
        .filter(c => c.id !== colId)
        .map(c => c.id === 'original' ? { ...c, items: updatedOriginalItems } : c);
    });

    if (activeTransferItem?.sourceColId === colId) {
      setActiveTransferItem(null);
    }
  };

  const handleItemClick = (colId: string, item: any) => {
    setActiveTransferItem({
      sourceColId: colId,
      checkItemId: item.checkItemId,
      maxQty: item.qty,
      qty: Math.min(1, item.qty),
    });
  };

  const handleMoveItem = (targetColId: string) => {
    if (!activeTransferItem) return;
    const { sourceColId, checkItemId, qty } = activeTransferItem;
    if (sourceColId === targetColId) return;

    setColumns(prev => {
      // Find source item
      const sourceCol = prev.find(c => c.id === sourceColId)!;
      const sourceItem = sourceCol.items.find(i => i.checkItemId === checkItemId)!;

      // Update source column items
      let updatedSourceItems = sourceCol.items.map(item => {
        if (item.checkItemId === checkItemId) {
          return { ...item, qty: item.qty - qty };
        }
        return item;
      }).filter(item => item.qty > 0.001);

      // Find or insert target item
      const targetCol = prev.find(c => c.id === targetColId)!;
      const targetItem = targetCol.items.find(i => i.checkItemId === checkItemId);

      let updatedTargetItems = [...targetCol.items];
      if (targetItem) {
        updatedTargetItems = targetCol.items.map(item => {
          if (item.checkItemId === checkItemId) {
            return { ...item, qty: item.qty + qty };
          }
          return item;
        });
      } else {
        updatedTargetItems.push({
          ...sourceItem,
          qty: qty
        });
      }

      return prev.map(col => {
        if (col.id === sourceColId) return { ...col, items: updatedSourceItems };
        if (col.id === targetColId) return { ...col, items: updatedTargetItems };
        return col;
      });
    });

    setActiveTransferItem(null);
    toast.success('Items moved in checkout draft');
  };

  const calculateColTotal = (col: TempCheckCol) => {
    let sum = 0;
    for (const item of col.items) {
      let itemSum = item.itemPrice * item.qty;
      for (const mod of item.modifiers) {
        itemSum += (mod.price || 0) * (mod.qty || 1) * item.qty;
      }
      sum += itemSum;
    }
    return sum;
  };

  const handleTableChange = (colId: string, tableId: string) => {
    const table = allTables.find(t => t.id === tableId);
    if (!table) return;

    setColumns(prev => prev.map(c => {
      if (c.id === colId) {
        return {
          ...c,
          tableId: table.id,
          tableName: table.name || `Table ${table.number}`
        };
      }
      return c;
    }));
    setSelectingTableColId(null);
  };

  const handleGuestCountChange = (colId: string, value: number) => {
    setColumns(prev => prev.map(c => {
      if (c.id === colId) {
        return { ...c, guestCount: Math.max(1, value) };
      }
      return c;
    }));
  };

  const handleSplitEvenConfirm = async () => {
    const splits = Number(evenCount);
    if (isNaN(splits) || splits < 2 || splits > 100) {
      toast.error('Please enter a valid split count between 2 and 100');
      return;
    }

    try {
      await onSplitConfirm({
        type: 'evenly',
        evenSplitCount: splits
      });
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to split check evenly');
    }
  };

  const handleSplitItemsConfirm = async () => {
    // Validate we actually split something
    const splitCols = columns.filter(c => c.id !== 'original');
    const hasItemsInSplits = splitCols.some(c => c.items.length > 0);
    if (!hasItemsInSplits) {
      toast.error('Please move items to at least one split check column first.');
      return;
    }

    // Format splits configuration
    const itemsSplits = splitCols
      .filter(c => c.items.length > 0)
      .map(c => ({
        guestCount: c.guestCount,
        tableId: c.tableId !== check.tableId ? c.tableId : undefined,
        items: c.items.map(i => ({
          checkItemId: i.checkItemId,
          qty: i.qty
        }))
      }));

    try {
      await onSplitConfirm({
        type: 'items',
        itemsSplits
      });
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to split check items');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-955 bg-slate-950/95 text-white select-none overflow-hidden font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button 
            onClick={onClose} 
            variant="ghost" 
            className="h-12 w-12 rounded-xl text-slate-400 hover:text-white cursor-pointer active:scale-95 transition-all duration-75"
          >
            <X size={24} />
          </Button>
          <div>
            <h2 className="text-xl font-black tracking-tight select-none">
              SPLIT CHECK: Table {check.tableName || check.tableId || 'Takeaway'} (Check #{check.chkNo})
            </h2>
            <p className="text-xs text-slate-400">Drag/Tap items to assign them to different check columns</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => setShowEvenNumpad(true)}
            className="h-12 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl active:scale-95 transition-all duration-75 flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-900/20"
          >
            <Users size={18} />
            <span>Split Evenly</span>
          </Button>
          <Button
            onClick={handleSplitItemsConfirm}
            className="h-12 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-xl active:scale-95 transition-all duration-75 cursor-pointer shadow-lg shadow-emerald-950/20"
          >
            Confirm Split
          </Button>
        </div>
      </div>

      {/* Main Workspace (Scrollable side-by-side) */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden flex gap-4 p-6 items-stretch select-none">
        
        {columns.map((col, idx) => {
          const isOriginal = col.id === 'original';
          const colTotal = calculateColTotal(col);

          return (
            <div 
              key={col.id} 
              className={`w-80 flex flex-col rounded-3xl border bg-slate-900/40 select-none shrink-0 ${
                isOriginal 
                  ? 'border-indigo-500/30 bg-indigo-950/5' 
                  : 'border-slate-800'
              }`}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 rounded-t-3xl shrink-0 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm tracking-wide text-indigo-400 uppercase">
                    {isOriginal ? 'Original Bill' : `Split Bill #${idx}`}
                  </span>
                  {!isOriginal && (
                    <Button
                      onClick={() => handleRemoveColumn(col.id)}
                      variant="ghost"
                      className="h-8 w-8 text-rose-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>

                {/* Table Context Selector */}
                <div className="flex items-center gap-1 mt-1 text-xs text-slate-300">
                  <MapPin size={12} className="text-slate-400" />
                  <span className="truncate max-w-[130px] font-semibold">
                    {col.tableName || `Table ${check.tableName || 'N/A'}`}
                  </span>
                  {!isOriginal && (
                    <button
                      onClick={() => setSelectingTableColId(col.id)}
                      type="button"
                      className="ml-auto text-indigo-400 hover:text-indigo-300 font-bold active:scale-95 transition-all text-[11px]"
                    >
                      [Change Table]
                    </button>
                  )}
                </div>

                {/* Guest Count stepper */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/50">
                  <span className="text-xs text-slate-400 font-medium">Guest Count:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGuestCountChange(col.id, col.guestCount - 1)}
                      className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center font-bold active:scale-95 transition-all cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-xs font-black min-w-4 text-center">{col.guestCount}</span>
                    <button
                      onClick={() => handleGuestCountChange(col.id, col.guestCount + 1)}
                      className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center font-bold active:scale-95 transition-all cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Items List (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 select-none min-h-0">
                {col.items.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-xs border-2 border-dashed border-slate-800/60 rounded-2xl p-4 text-center">
                    <Scissors size={20} className="mb-2 text-slate-700" />
                    <span>No items. Tap items in other columns to move them here.</span>
                  </div>
                ) : (
                  col.items.map(item => {
                    const isSelected = activeTransferItem?.checkItemId === item.checkItemId && activeTransferItem?.sourceColId === col.id;
                    return (
                      <div
                        key={item.checkItemId}
                        onClick={() => handleItemClick(col.id, item)}
                        className={`p-3 rounded-2xl border text-left cursor-pointer active:scale-98 transition-all duration-75 select-none ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/20'
                            : 'border-slate-800/80 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-extrabold text-sm text-slate-100 leading-tight">
                            {item.itemName}
                          </span>
                          <span className="font-black text-xs text-indigo-400 bg-indigo-950/30 px-2 py-0.5 rounded-lg shrink-0">
                            x{item.qty.toFixed(1).replace('.0', '')}
                          </span>
                        </div>
                        {item.modifiers.map((m: any) => (
                          <div key={m.id} className="text-[10px] text-slate-400 font-medium mt-0.5 pl-2 border-l border-slate-800">
                            + {m.name} (x{m.qty})
                          </div>
                        ))}
                        <div className="text-right text-xs font-black text-slate-400 mt-2">
                          {(item.itemPrice * item.qty).toFixed(0)} EGP
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Column Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/50 rounded-b-3xl shrink-0">
                <div className="flex justify-between items-center select-none">
                  <span className="text-xs font-bold text-slate-400">Draft Total:</span>
                  <span className="text-lg font-black text-emerald-400 select-none">
                    {colTotal.toFixed(0)} EGP
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Split Column Placeholder */}
        <button
          onClick={handleAddColumn}
          type="button"
          className="w-80 border-2 border-dashed border-slate-800/80 rounded-3xl flex flex-col items-center justify-center text-slate-400 hover:text-white hover:border-indigo-500 hover:bg-slate-900/10 cursor-pointer active:scale-98 transition-all shrink-0 select-none group py-8"
        >
          <div className="h-14 w-14 rounded-full bg-slate-900 group-hover:bg-indigo-950 flex items-center justify-center text-slate-300 group-hover:text-indigo-400 transition-all shadow-md">
            <Plus size={24} />
          </div>
          <span className="font-bold text-sm mt-3 select-none">Add Split Check</span>
          <span className="text-[10px] text-slate-500 select-none">Create another custom bill column</span>
        </button>
      </div>

      {/* Floating Item Transfer Controls (renders when an item is tapped) */}
      {activeTransferItem && (() => {
        const itemCol = columns.find(c => c.id === activeTransferItem.sourceColId)!;
        const item = itemCol.items.find(i => i.checkItemId === activeTransferItem.checkItemId)!;
        
        return (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[550px] max-w-full bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl p-5 flex flex-col gap-4 z-40 select-none animate-in slide-in-from-bottom-6 fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Move Item</span>
                <h3 className="font-black text-base text-slate-100">{item.itemName}</h3>
              </div>
              <Button
                onClick={() => setActiveTransferItem(null)}
                variant="ghost"
                className="h-8 w-8 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </Button>
            </div>

            {/* Quantity Stepper */}
            <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-2xl border border-slate-800/50">
              <span className="text-xs text-slate-400 font-bold">Quantity to Move:</span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveTransferItem(prev => prev ? { ...prev, qty: Math.max(0.1, Number((prev.qty - 0.5).toFixed(1))) } : null)}
                  className="h-10 w-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center font-bold text-lg active:scale-90 transition-all cursor-pointer"
                >
                  -
                </button>
                <span className="text-base font-black min-w-16 text-center select-none text-indigo-400">
                  {activeTransferItem.qty.toFixed(1).replace('.0', '')} / {activeTransferItem.maxQty.toFixed(1).replace('.0', '')}
                </span>
                <button
                  onClick={() => setActiveTransferItem(prev => prev ? { ...prev, qty: Math.min(prev.maxQty, Number((prev.qty + 0.5).toFixed(1))) } : null)}
                  className="h-10 w-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center font-bold text-lg active:scale-90 transition-all cursor-pointer"
                >
                  +
                </button>
                <Button
                  onClick={() => setActiveTransferItem(prev => prev ? { ...prev, qty: prev.maxQty } : null)}
                  variant="outline"
                  className="h-10 rounded-xl px-3 border-indigo-500/30 text-indigo-400 text-xs font-extrabold cursor-pointer active:scale-95"
                >
                  All
                </Button>
              </div>
            </div>

            {/* Target Columns selection */}
            <div>
              <span className="text-xs text-slate-400 font-bold block mb-2">Select Destination Column:</span>
              <div className="flex flex-wrap gap-2">
                {columns.map((c, idx) => {
                  const isSource = c.id === activeTransferItem.sourceColId;
                  const label = c.id === 'original' ? 'Original Check' : `Split #${idx}`;
                  
                  return (
                    <Button
                      key={c.id}
                      onClick={() => handleMoveItem(c.id)}
                      disabled={isSource}
                      className={`h-12 flex-1 rounded-xl font-bold active:scale-95 transition-all text-xs cursor-pointer ${
                        isSource
                          ? 'bg-slate-950 text-slate-700 border border-slate-800/80 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      <ArrowRightLeft size={12} className="mr-1.5 shrink-0" />
                      <span className="truncate">{label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Even Split Numpad Popover */}
      {showEvenNumpad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none">
          <div className="w-[320px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-100">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-base text-slate-100 flex items-center gap-1.5">
                <Users size={18} className="text-indigo-400" />
                <span>Split Evenly</span>
              </h3>
              <Button
                onClick={() => { setShowEvenNumpad(false); setEvenCount(''); }}
                variant="ghost"
                className="h-8 w-8 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </Button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-center">
              <span className="text-xs text-slate-500 block">How many ways to split?</span>
              <span className="text-3xl font-black text-indigo-400 tracking-tight min-h-[36px] select-none block mt-1">
                {evenCount || '_'}
              </span>
            </div>

            {/* Custom keypad grid */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => setEvenCount(prev => prev.length < 2 ? prev + num : prev)}
                  className="h-14 bg-slate-800 hover:bg-slate-700 rounded-xl font-black text-lg active:scale-95 active:bg-indigo-950 active:text-indigo-400 transition-all select-none cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => setEvenCount('')}
                className="h-14 bg-slate-800/40 hover:bg-slate-800 text-rose-400 hover:text-rose-300 rounded-xl font-bold text-sm active:scale-95 transition-all select-none cursor-pointer"
              >
                Clear
              </button>
              <button
                onClick={() => setEvenCount(prev => prev.length < 2 ? prev + '0' : prev)}
                className="h-14 bg-slate-800 hover:bg-slate-700 rounded-xl font-black text-lg active:scale-95 transition-all select-none cursor-pointer"
              >
                0
              </button>
              <button
                onClick={() => setEvenCount(prev => prev.slice(0, -1))}
                className="h-14 bg-slate-800/40 hover:bg-slate-800 text-slate-300 rounded-xl font-bold text-sm active:scale-95 transition-all select-none cursor-pointer"
              >
                Del
              </button>
            </div>

            <Button
              onClick={handleSplitEvenConfirm}
              className="h-14 w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black text-base rounded-xl cursor-pointer active:scale-95 mt-2"
            >
              Apply Split
            </Button>
          </div>
        </div>
      )}

      {/* Table Selector Dialog for Custom Splits */}
      {selectingTableColId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none">
          <div className="w-[500px] max-w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 select-none animate-in zoom-in-95 duration-100 max-h-[85vh]">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-base text-slate-100 flex items-center gap-1.5">
                <MapPin size={18} className="text-indigo-400" />
                <span>Move split check to Table</span>
              </h3>
              <Button
                onClick={() => setSelectingTableColId(null)}
                variant="ghost"
                className="h-8 w-8 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </Button>
            </div>

            {/* Scrollable table grid grouped by sections */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
              {sections.map(section => (
                <div key={section.id} className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider pl-1">
                    {section.name}
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {section.tables.map(table => {
                      const isSameTable = table.id === check.tableId;
                      return (
                        <button
                          key={table.id}
                          onClick={() => handleTableChange(selectingTableColId, table.id)}
                          className={`h-14 flex flex-col items-center justify-center rounded-xl font-bold transition-all cursor-pointer select-none active:scale-95 ${
                            isSameTable
                              ? 'bg-indigo-950 text-indigo-400 border border-indigo-500/40'
                              : 'bg-slate-800 hover:bg-slate-700 text-white'
                          }`}
                        >
                          <span className="text-xs font-black">{table.name || `T${table.number}`}</span>
                          <span className="text-[9px] opacity-60">
                            {isSameTable ? 'Source' : ''}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
