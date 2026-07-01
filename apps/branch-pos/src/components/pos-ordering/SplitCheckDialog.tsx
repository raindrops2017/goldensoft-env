import { useState, useMemo, useEffect } from 'react';
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
import { type CheckWithItems, calculateBillableQty } from '@goldensoft/core-schemas';
import { toast } from 'sonner';
import { useTableSections } from '../../hooks/useTables';
import { safeRandomUUID } from '../../lib/utils';

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
    isComp?: boolean;
  }>;
}

export function SplitCheckDialog({ open, onClose, check, onSplitConfirm }: SplitCheckDialogProps) {
  if (!open) return null;

  const { data: sections = [] } = useTableSections();
  const allTables = useMemo(() => sections.flatMap(s => s.tables), [sections]);

  const resolvedCheckTableName = useMemo(() => {
    if (check.tableName) return check.tableName;
    if (check.tableId) {
      const table = allTables.find(t => t.id === check.tableId);
      if (table) {
        return table.name || `Table ${table.number}`;
      }
    }
    return '';
  }, [check.tableName, check.tableId, allTables]);

  const headerDisplayName = useMemo(() => {
    if (!check.tableId) return 'Takeaway';
    if (resolvedCheckTableName) {
      if (resolvedCheckTableName.toLowerCase().startsWith('table')) {
        return resolvedCheckTableName;
      }
      return `Table ${resolvedCheckTableName}`;
    }
    return 'Loading Table...';
  }, [check.tableId, resolvedCheckTableName]);

  // Update columns with table info once allTables/check data is available
  useEffect(() => {
    if (allTables.length > 0) {
      setColumns(prev => prev.map(c => {
        // If tableId exists but tableName is not set, try to resolve it
        if (c.tableId && !c.tableName) {
          const table = allTables.find(t => t.id === c.tableId);
          if (table) {
            return {
              ...c,
              tableName: table.name || `Table ${table.number}`
            };
          }
        }
        return c;
      }));
    }
  }, [allTables]);

  // Prevent splitting if the check has 1 or less billable items/quantities
  useEffect(() => {
    if (open) {
      const activeItems = check.items || [];
      if (activeItems.length === 0) {
        toast.error("Cannot split an empty check.");
        onClose();
        return;
      }
      
      const totalBillableQty = activeItems.reduce((sum, item) => {
        const qty = Number(item.qty) || 0;
        const entQty = Number(item.entQty) || 0;
        const billable = calculateBillableQty(qty, entQty);
        return sum + billable;
      }, 0);

      if (totalBillableQty <= 1) {
        toast.error("Cannot split a check containing 1 or less billable items.");
        onClose();
        return;
      }
    }
  }, [open, check, onClose]);

  // Even split input states
  const [showEvenNumpad, setShowEvenNumpad] = useState(false);
  const [evenCount, setEvenCount] = useState<string>('');

  // Items split states
  const [columns, setColumns] = useState<TempCheckCol[]>(() => {
    const originalItems = (check.items || [])
      .flatMap(item => {
        const qty = Number(item.qty) || 0;
        const entQty = Number(item.entQty) || 0;
        const billableQty = calculateBillableQty(qty, entQty);

        const result: TempCheckCol['items'] = [];

        // Billable portion
        if (billableQty > 0) {
          result.push({
            checkItemId: item.id,
            menuItemId: item.menuItemId,
            itemName: item.itemName || 'Item',
            itemPrice: item.itemPrice,
            qty: billableQty,
            modifiers: item.modifiers || [],
          });
        }

        // Complimentary portion (excluded from split & subtotal contribution is 0)
        if (entQty > 0) {
          result.push({
            checkItemId: `${item.id}-comp`,
            menuItemId: item.menuItemId,
            itemName: `${item.itemName || 'Item'}`,
            itemPrice: 0,
            qty: entQty,
            modifiers: (item.modifiers || []).map((m: any) => ({ ...m, price: 0 })),
            isComp: true,
          });
        }

        return result;
      });

    return [
      {
        id: 'original',
        guestCount: check.guestCount || 1,
        tableId: check.tableId || undefined,
        tableName: check.tableName || undefined,
        items: originalItems,
      },
      {
        id: safeRandomUUID(),
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

  // Active column tab on mobile
  const [activeColId, setActiveColId] = useState<string>('original');

  const handleAddColumn = () => {
    // Try to resolve table name from check tableId
    let resolvedName = check.tableName || undefined;
    if (!resolvedName && check.tableId) {
      const table = allTables.find(t => t.id === check.tableId);
      if (table) {
        resolvedName = table.name || `Table ${table.number}`;
      }
    }

    const newId = safeRandomUUID();
    setColumns(prev => [
      ...prev,
      {
        id: newId,
        guestCount: 1,
        tableId: check.tableId || undefined,
        tableName: resolvedName,
        items: [],
      }
    ]);
    setActiveColId(newId);
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

    if (activeColId === colId) {
      setActiveColId('original');
    }
  };

  const handleItemClick = (colId: string, item: any) => {
    if (item.isComp) return;
    if (activeTransferItem?.checkItemId === item.checkItemId && activeTransferItem?.sourceColId === colId) {
      setActiveTransferItem(null);
    } else {
      setActiveTransferItem({
        sourceColId: colId,
        checkItemId: item.checkItemId,
        maxQty: item.qty,
        qty: Math.max(1, Math.floor(item.qty)), // Default to full item count (min 1, whole integer)
      });
    }
  };

  const handleDecreaseQty = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeTransferItem) return;
    setActiveTransferItem(prev => {
      if (!prev) return null;
      return { ...prev, qty: Math.max(1, prev.qty - 1) };
    });
  };

  const handleIncreaseQty = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeTransferItem) return;
    setActiveTransferItem(prev => {
      if (!prev) return null;
      return { ...prev, qty: Math.min(Math.round(prev.maxQty), prev.qty + 1) };
    });
  };

  const handleMoveItem = (targetColId: string) => {
    if (!activeTransferItem) return;
    const { sourceColId, checkItemId, qty } = activeTransferItem;
    if (sourceColId === targetColId) return;

    // Prevention check: do not leave original check empty
    if (sourceColId === 'original') {
      const originalCol = columns.find(c => c.id === 'original')!;
      const movingItem = originalCol.items.find(i => i.checkItemId === checkItemId);
      if (movingItem && originalCol.items.length === 1 && qty === movingItem.qty) {
        toast.error("Cannot move the last item. The original check cannot be empty.");
        return;
      }
    }

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

  const handleColumnTableNameChange = (colId: string, name: string) => {
    setColumns(prev => prev.map(c => {
      if (c.id === colId) {
        return {
          ...c,
          tableName: name
        };
      }
      return c;
    }));
  };

  const handleGuestCountChange = (colId: string, value: number) => {
    setColumns(prev => prev.map(c => {
      if (c.id === colId) {
        return { ...c, guestCount: Math.max(1, value) };
      }
      return c;
    }));
  };

  const handleSplitEvenPreset = async (splits: number) => {
    try {
      await onSplitConfirm({
        type: 'evenly',
        evenSplitCount: splits
      });
      onClose();
    } catch (err: any) {
      toast.error(err.message || `Failed to split check ${splits}-ways`);
    }
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
        tableName: c.tableName || undefined,
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
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-none overflow-hidden font-sans transition-colors duration-200">
      <style>{`
        /* Custom scrollbar styles */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 9999px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
        
        /* Hide scrollbars for chrome/safari */
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        /* Hide scrollbars for IE/Edge/Firefox */
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 shrink-0 shadow-sm md:flex-row md:items-center md:justify-between md:px-6 md:py-4 transition-colors duration-200">
        <div className="flex items-center justify-between md:justify-start md:gap-4 w-full md:w-auto">
          <div className="flex items-center gap-3">
            <Button 
              onClick={onClose} 
              variant="ghost" 
              className="h-12 w-12 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer active:scale-95 transition-all duration-75"
            >
              <X size={24} />
            </Button>
            <div>
              <h2 className="text-lg md:text-xl font-black tracking-tight select-none leading-tight">
                SPLIT: {headerDisplayName}
              </h2>
              <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400">Check #{check.chkNo}</p>
            </div>
          </div>

          {/* Mobile Split Evenly Trigger */}
          <div className="flex md:hidden">
            <Button
              onClick={() => setShowEvenNumpad(true)}
              variant="outline"
              className="h-12 px-3 border-indigo-200/50 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs rounded-xl active:scale-95 transition-all duration-75 cursor-pointer shadow-sm bg-indigo-50 dark:bg-indigo-950/40"
            >
              <Users size={16} className="mr-1.5" />
              Split Evenly
            </Button>
          </div>
        </div>

        {/* Desktop/Tablet Header Actions */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex gap-2 items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 transition-colors duration-200">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 px-2 select-none uppercase tracking-wider">Split Evenly:</span>
            <Button
              onClick={() => handleSplitEvenPreset(2)}
              variant="outline"
              className="h-10 px-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-extrabold text-xs rounded-xl active:scale-95 transition-all duration-75 cursor-pointer shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              2-Ways
            </Button>
            <Button
              onClick={() => handleSplitEvenPreset(3)}
              variant="outline"
              className="h-10 px-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-extrabold text-xs rounded-xl active:scale-95 transition-all duration-75 cursor-pointer shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              3-Ways
            </Button>
            <Button
              onClick={() => handleSplitEvenPreset(4)}
              variant="outline"
              className="h-10 px-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-extrabold text-xs rounded-xl active:scale-95 transition-all duration-75 cursor-pointer shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              4-Ways
            </Button>
            <Button
              onClick={() => setShowEvenNumpad(true)}
              variant="outline"
              className="h-10 px-3 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/50 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs rounded-xl active:scale-95 transition-all duration-75 cursor-pointer shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-950"
            >
              Custom...
            </Button>
          </div>

          <Button
            onClick={handleSplitItemsConfirm}
            className="h-12 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-xl active:scale-95 transition-all duration-75 cursor-pointer shadow-md shadow-emerald-600/10"
          >
            Confirm Split
          </Button>
        </div>
      </div>

      {/* Mobile Tabs Bar */}
      <div className="flex md:hidden items-center overflow-x-auto touch-pan-x scrollbar-none gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
        {columns.map((col, idx) => {
          const isOriginal = col.id === 'original';
          const isActive = activeColId === col.id;
          const colTotal = calculateColTotal(col);
          const displayName = isOriginal ? 'Original' : col.tableName || `Split #${idx}`;

          return (
            <div
              key={col.id}
              onClick={() => setActiveColId(col.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-black shrink-0 transition-all select-none cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/15'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span>{displayName}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                isActive ? 'bg-indigo-700 text-white' : 'bg-slate-150 dark:bg-slate-900 text-slate-500'
              }`}>
                {colTotal.toFixed(0)}
              </span>
              {!isOriginal && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveColumn(col.id);
                  }}
                  className={`p-1 rounded-md transition-colors ${
                    isActive ? 'hover:bg-indigo-700 text-white' : 'hover:bg-slate-100 text-rose-500'
                  }`}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}

        {/* Add Split Tab */}
        <button
          onClick={handleAddColumn}
          className="flex items-center gap-1 px-3 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-transparent text-slate-500 hover:text-indigo-600 hover:border-indigo-400 shrink-0 text-xs font-extrabold cursor-pointer active:scale-95 transition-all"
        >
          <Plus size={14} />
          <span>Split</span>
        </button>
      </div>

      {/* Main Workspace (Scrollable side-by-side on desktop, single view on mobile) */}
      <div className="flex-1 min-h-0 overflow-hidden md:overflow-x-auto md:overflow-y-hidden flex flex-col md:flex-row gap-4 p-4 md:p-6 items-stretch">
        
        {columns.map((col, idx) => {
          const isOriginal = col.id === 'original';
          const colTotal = calculateColTotal(col);
          const isActiveOnMobile = col.id === activeColId;

          return (
            <div 
              key={col.id} 
              className={`w-full md:w-80 flex-1 min-h-0 md:flex-none flex flex-col rounded-3xl border select-none shrink-0 transition-colors duration-200 ${
                isOriginal 
                  ? 'border-indigo-300 dark:border-indigo-500/30 bg-indigo-50/15 dark:bg-indigo-950/5' 
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40'
              } ${
                isActiveOnMobile ? 'flex' : 'hidden md:flex'
              }`}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/60 rounded-t-3xl shrink-0 flex flex-col gap-2 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm tracking-wide text-indigo-600 dark:text-indigo-400 uppercase">
                    {isOriginal ? 'Original Bill' : `Split Bill #${idx}`}
                  </span>
                  {!isOriginal && (
                    <Button
                      onClick={() => handleRemoveColumn(col.id)}
                      variant="ghost"
                      className="h-8 w-8 text-rose-600 dark:text-rose-500 hover:text-rose-700 dark:hover:text-rose-450 hover:bg-rose-100 dark:hover:bg-rose-950/20 rounded-lg cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>

                {/* Table Context Selector */}
                <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Table Name:</span>
                    {!isOriginal && (
                      <button
                        onClick={() => setSelectingTableColId(col.id)}
                        type="button"
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold active:scale-95 transition-all text-xs"
                      >
                        [Select Table]
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      disabled={isOriginal}
                      value={col.tableName || ''}
                      onChange={(e) => handleColumnTableNameChange(col.id, e.target.value)}
                      placeholder={isOriginal ? "Takeaway" : "e.g. Table 5 / Custom Name"}
                      className="w-full h-10 px-3 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:opacity-70 disabled:cursor-not-allowed text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-650 select-text"
                    />
                  </div>
                </div>

                {/* Guest Count stepper */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/50">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Guest Count:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGuestCountChange(col.id, col.guestCount - 1)}
                      className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold active:scale-95 transition-all cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-xs font-black min-w-4 text-center">{col.guestCount}</span>
                    <button
                      onClick={() => handleGuestCountChange(col.id, col.guestCount + 1)}
                      className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold active:scale-95 transition-all cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Items List (Scrollable) */}
              <div className="flex-1 overflow-y-auto touch-pan-y custom-scrollbar p-4 flex flex-col gap-2 min-h-0 relative">
                {col.items.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 text-xs border-2 border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 text-center">
                    <Scissors size={20} className="mb-2 text-slate-400 dark:text-slate-600" />
                    <span>No items. Select an item in another column to move it here.</span>
                  </div>
                ) : (
                  col.items.map(item => {
                    const isSelected = activeTransferItem?.checkItemId === item.checkItemId && activeTransferItem?.sourceColId === col.id;
                    const isComp = item.isComp;
                    return (
                      <div
                        key={item.checkItemId}
                        onClick={() => !isComp && handleItemClick(col.id, item)}
                        className={`p-3 rounded-2xl border text-left select-none transition-all duration-75 ${
                          isComp
                            ? 'border-dashed border-slate-250 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-900/15 opacity-70 cursor-not-allowed'
                            : isSelected
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/20 cursor-pointer active:scale-98'
                              : 'border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900/60 text-slate-800 dark:text-slate-200 cursor-pointer active:scale-98'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 leading-tight flex items-center gap-1.5">
                            {item.itemName}
                            {isComp && (
                              <span className="text-[9px] font-black tracking-wider bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded uppercase shrink-0">
                                Comp
                              </span>
                            )}
                          </span>
                          <span className={`font-black text-xs px-2 py-0.5 rounded-lg shrink-0 ${
                            isComp
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                              : 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
                          }`}>
                            x{item.qty.toFixed(1).replace('.0', '')}
                          </span>
                        </div>
                        {item.modifiers.map((m: any) => (
                          <div key={m.id} className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 pl-2 border-l border-slate-200 dark:border-slate-800">
                            + {m.name} (x{m.qty})
                          </div>
                        ))}

                        {/* Inline Stepper for quantity adjustment (Desktop only) */}
                        {isSelected && !isComp && item.qty > 1 && (
                          <div 
                            onClick={(e) => e.stopPropagation()} 
                            className="hidden md:flex mt-3 p-2 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 items-center justify-between shadow-inner"
                          >
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider pl-1">Qty to move:</span>
                            <div className="flex items-center gap-2.5">
                              <button
                                onClick={handleDecreaseQty}
                                disabled={activeTransferItem.qty <= 1}
                                className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center font-bold text-sm active:scale-90 transition-all cursor-pointer text-slate-700 dark:text-slate-300"
                              >
                                -
                              </button>
                              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 min-w-8 text-center">
                                {activeTransferItem.qty} / {Math.round(activeTransferItem.maxQty)}
                              </span>
                              <button
                                onClick={handleIncreaseQty}
                                disabled={activeTransferItem.qty >= Math.round(activeTransferItem.maxQty)}
                                className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center font-bold text-sm active:scale-90 transition-all cursor-pointer text-slate-700 dark:text-slate-300"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="text-right text-xs font-black text-slate-500 dark:text-slate-400 mt-2">
                          {isComp ? '0 EGP' : `${(item.itemPrice * item.qty).toFixed(0)} EGP`}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Target Column Dropzone Overlay (Desktop only) */}
                {activeTransferItem && activeTransferItem.sourceColId !== col.id && (
                  <div 
                    onClick={() => handleMoveItem(col.id)}
                    className="hidden md:flex absolute inset-0 bg-indigo-600/90 dark:bg-indigo-700/95 flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all active:scale-[0.98] select-none rounded-2xl m-2 shadow-xl z-10"
                  >
                    <ArrowRightLeft size={36} className="text-white mb-2 animate-pulse" />
                    <span className="text-white font-black text-lg">
                      Move {activeTransferItem.qty} Here
                    </span>
                    <span className="text-white/80 text-[10px] mt-1 uppercase font-bold tracking-wider">
                      Tap to transfer to {isOriginal ? 'Original Bill' : `Split #${idx}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Column Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-3xl shrink-0 transition-colors duration-200">
                <div className="flex justify-between items-center select-none">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Draft Total:</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 select-none">
                    {colTotal.toFixed(0)} EGP
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Split Column Placeholder (Desktop only) */}
        <button
          onClick={handleAddColumn}
          type="button"
          className="hidden md:flex w-80 border-2 border-dashed border-slate-200 dark:border-slate-800/80 rounded-3xl flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-100/50 dark:hover:bg-slate-900/10 cursor-pointer active:scale-98 transition-all shrink-0 select-none group py-8"
        >
          <div className="h-14 w-14 rounded-full bg-slate-200 dark:bg-slate-900 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all shadow-sm">
            <Plus size={24} />
          </div>
          <span className="font-bold text-sm mt-3 select-none">Add Split Check</span>
          <span className="text-[10px] text-slate-500 select-none">Create another custom bill column</span>
        </button>
      </div>

      {/* Mobile Sticky Footer */}
      <div className="md:hidden p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-lg transition-colors duration-200">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider leading-none">Columns</span>
          <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
            {columns.length} Bills
          </span>
        </div>
        <Button
          onClick={handleSplitItemsConfirm}
          className="h-16 px-8 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-2xl active:scale-95 transition-all duration-75 cursor-pointer shadow-md shadow-emerald-600/10 flex-1 ml-4"
        >
          Confirm Split
        </Button>
      </div>

      {/* Mobile Item Transfer Bottom Sheet */}
      {activeTransferItem && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs select-none animate-in fade-in-0 duration-150">
          {/* Click outside to cancel */}
          <div className="absolute inset-0 -z-10" onClick={() => setActiveTransferItem(null)} />
          
          <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl shadow-2xl p-6 flex flex-col gap-4 max-h-[85vh] overflow-y-auto touch-pan-y custom-scrollbar animate-in slide-in-from-bottom duration-200 text-slate-900 dark:text-slate-100">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Move Item</span>
                <h3 className="font-black text-lg text-slate-900 dark:text-slate-100 leading-tight">
                  {(() => {
                    const sourceCol = columns.find(c => c.id === activeTransferItem.sourceColId);
                    const item = sourceCol?.items.find(i => i.checkItemId === activeTransferItem.checkItemId);
                    return item?.itemName || 'Item';
                  })()}
                </h3>
              </div>
              <Button
                onClick={() => setActiveTransferItem(null)}
                variant="ghost"
                className="h-10 w-10 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-xl cursor-pointer bg-slate-100 dark:bg-slate-800"
              >
                <X size={18} />
              </Button>
            </div>

            {/* Stepper if quantity > 1 */}
            {activeTransferItem.maxQty > 1 && (
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-center">Quantity to Move</span>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={handleDecreaseQty}
                    disabled={activeTransferItem.qty <= 1}
                    className="h-14 w-14 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-black text-2xl active:scale-90 transition-all cursor-pointer disabled:opacity-35"
                  >
                    -
                  </button>
                  <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 min-w-16 text-center">
                    {activeTransferItem.qty} / {Math.round(activeTransferItem.maxQty)}
                  </span>
                  <button
                    onClick={handleIncreaseQty}
                    disabled={activeTransferItem.qty >= Math.round(activeTransferItem.maxQty)}
                    className="h-14 w-14 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-black text-2xl active:scale-90 transition-all cursor-pointer disabled:opacity-35"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Destination Grid */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Move to:</span>
              <div className="grid grid-cols-2 gap-2">
                {columns.map((col, idx) => {
                  const isSource = col.id === activeTransferItem.sourceColId;
                  if (isSource) return null;

                  const isOriginal = col.id === 'original';
                  const displayName = isOriginal ? 'Original Bill' : col.tableName || `Split #${idx}`;

                  return (
                    <button
                      key={col.id}
                      onClick={() => handleMoveItem(col.id)}
                      className="h-16 px-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-extrabold text-sm rounded-2xl active:scale-95 transition-all duration-75 cursor-pointer shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-950 flex flex-col justify-center items-center select-none"
                    >
                      <span className="font-extrabold">{displayName}</span>
                      <span className="text-[10px] opacity-60">Total: {calculateColTotal(col).toFixed(0)} EGP</span>
                    </button>
                  );
                })}
                
                {/* Create & Move to New Split */}
                <button
                  onClick={() => {
                    const newId = safeRandomUUID();
                    let resolvedName = check.tableName || undefined;
                    if (!resolvedName && check.tableId) {
                      const table = allTables.find(t => t.id === check.tableId);
                      if (table) {
                        resolvedName = table.name || `Table ${table.number}`;
                      }
                    }

                    setColumns(prev => {
                      const newCol = {
                        id: newId,
                        guestCount: 1,
                        tableId: check.tableId || undefined,
                        tableName: resolvedName,
                        items: [],
                      };
                      const nextCols = [...prev, newCol];
                      
                      const { sourceColId, checkItemId, qty } = activeTransferItem;
                      const sourceColIndex = nextCols.findIndex(c => c.id === sourceColId);
                      const sourceCol = nextCols[sourceColIndex];
                      const sourceItem = sourceCol.items.find(i => i.checkItemId === checkItemId)!;

                      const updatedSourceItems = sourceCol.items.map(item => {
                        if (item.checkItemId === checkItemId) {
                          return { ...item, qty: item.qty - qty };
                        }
                        return item;
                      }).filter(item => item.qty > 0.001);

                      nextCols[sourceColIndex] = { ...sourceCol, items: updatedSourceItems };
                      
                      const targetColIndex = nextCols.findIndex(c => c.id === newId);
                      nextCols[targetColIndex] = {
                        ...nextCols[targetColIndex],
                        items: [{ ...sourceItem, qty: qty }]
                      };

                      return nextCols;
                    });

                    setActiveTransferItem(null);
                    setActiveColId(newId);
                    toast.success('Moved to new split check');
                  }}
                  className="h-16 px-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-350 font-black text-sm rounded-2xl active:scale-95 transition-all duration-75 cursor-pointer shadow-sm hover:bg-slate-200 flex flex-col justify-center items-center select-none"
                >
                  <div className="flex items-center gap-1">
                    <Plus size={14} />
                    <span>+ New Split</span>
                  </div>
                  <span className="text-[10px] opacity-60">Create & Move</span>
                </button>
              </div>
            </div>

            <Button
              onClick={() => setActiveTransferItem(null)}
              className="h-16 w-full mt-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-black text-base rounded-2xl active:scale-95 hover:bg-slate-200"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Even Split Numpad Bottom Sheet / Modal */}
      {showEvenNumpad && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center bg-black/60 backdrop-blur-xs select-none animate-in fade-in-0 duration-150">
          {/* Click outside to close (desktop/mobile background) */}
          <div className="absolute inset-0 -z-10" onClick={() => { setShowEvenNumpad(false); setEvenCount(''); }} />
          
          <div className="w-full md:w-[360px] bg-white dark:bg-slate-900 border-t md:border border-slate-200 dark:border-slate-800 rounded-t-3xl md:rounded-3xl shadow-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto touch-pan-y custom-scrollbar animate-in slide-in-from-bottom md:slide-in-from-none md:zoom-in-95 duration-200 text-slate-900 dark:text-slate-100">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-base flex items-center gap-1.5">
                <Users size={18} className="text-indigo-600 dark:text-indigo-400" />
                <span>Split Evenly</span>
              </h3>
              <Button
                onClick={() => { setShowEvenNumpad(false); setEvenCount(''); }}
                variant="ghost"
                className="h-10 w-10 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer bg-slate-100 dark:bg-slate-800 rounded-xl"
              >
                <X size={18} />
              </Button>
            </div>

            {/* Presets Panel */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Presets:</span>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => handleSplitEvenPreset(2)}
                  variant="outline"
                  className="h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-extrabold text-sm rounded-xl active:scale-95 cursor-pointer shadow-sm hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  2-Ways
                </Button>
                <Button
                  onClick={() => handleSplitEvenPreset(3)}
                  variant="outline"
                  className="h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-extrabold text-sm rounded-xl active:scale-95 cursor-pointer shadow-sm hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  3-Ways
                </Button>
                <Button
                  onClick={() => handleSplitEvenPreset(4)}
                  variant="outline"
                  className="h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-extrabold text-sm rounded-xl active:scale-95 cursor-pointer shadow-sm hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  4-Ways
                </Button>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800/80 my-1" />

            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center">
              <span className="text-xs text-slate-500 dark:text-slate-400 block">Or enter custom split count:</span>
              <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight min-h-[36px] select-none block mt-1">
                {evenCount || '_'}
              </span>
            </div>

            {/* Custom keypad grid */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => setEvenCount(prev => prev.length < 2 ? prev + num : prev)}
                  className="h-14 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-black text-lg active:scale-95 active:bg-indigo-100 dark:active:bg-indigo-950 active:text-indigo-600 dark:active:text-indigo-400 transition-all select-none cursor-pointer border border-slate-200/50 dark:border-slate-700/50 shadow-sm"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => setEvenCount('')}
                className="h-14 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-600 dark:text-rose-500 rounded-xl font-bold text-sm active:scale-95 transition-all select-none cursor-pointer border border-slate-200/50 dark:border-slate-700/50 shadow-sm"
              >
                Clear
              </button>
              <button
                onClick={() => setEvenCount(prev => prev.length < 2 ? prev + '0' : prev)}
                className="h-14 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-black text-lg active:scale-95 active:bg-indigo-100 dark:active:bg-indigo-950 active:text-indigo-600 dark:active:text-indigo-400 transition-all select-none cursor-pointer border border-slate-200/50 dark:border-slate-700/50 shadow-sm"
              >
                0
              </button>
              <button
                onClick={() => setEvenCount(prev => prev.slice(0, -1))}
                className="h-14 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-350 rounded-xl font-bold text-sm active:scale-95 transition-all select-none cursor-pointer border border-slate-200/50 dark:border-slate-700/50 shadow-sm"
              >
                Del
              </button>
            </div>

            <Button
              onClick={handleSplitEvenConfirm}
              className="h-16 w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black text-base rounded-xl cursor-pointer active:scale-95 mt-2"
            >
              Apply Split
            </Button>
          </div>
        </div>
      )}

      {/* Table Selector Bottom Sheet / Modal */}
      {selectingTableColId && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center bg-black/70 backdrop-blur-xs select-none animate-in fade-in-0 duration-150">
          {/* Click outside to close */}
          <div className="absolute inset-0 -z-10" onClick={() => setSelectingTableColId(null)} />

          <div className="w-full md:w-[500px] bg-white dark:bg-slate-900 border-t md:border border-slate-200 dark:border-slate-800 rounded-t-3xl md:rounded-3xl shadow-2xl p-6 flex flex-col gap-4 select-none animate-in slide-in-from-bottom md:slide-in-from-none md:zoom-in-95 duration-200 max-h-[80vh] md:max-h-[85vh] text-slate-900 dark:text-slate-100">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-base flex items-center gap-1.5">
                <MapPin size={18} className="text-indigo-600 dark:text-indigo-400" />
                <span>Move split check to Table</span>
              </h3>
              <Button
                onClick={() => setSelectingTableColId(null)}
                variant="ghost"
                className="h-10 w-10 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer bg-slate-100 dark:bg-slate-800 rounded-xl"
              >
                <X size={18} />
              </Button>
            </div>

            {/* Scrollable table grid grouped by sections */}
            <div className="flex-1 overflow-y-auto touch-pan-y custom-scrollbar flex flex-col gap-4 pr-1">
              {sections.map(section => (
                <div key={section.id} className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider pl-1">
                    {section.name}
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {section.tables.map(table => {
                      const isSameTable = table.id === check.tableId;
                      return (
                        <button
                          key={table.id}
                          onClick={() => handleTableChange(selectingTableColId, table.id)}
                          className={`h-16 flex flex-col items-center justify-center rounded-xl font-bold transition-all cursor-pointer select-none active:scale-95 border ${
                            isSameTable
                              ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/40'
                              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white border-slate-200 dark:border-slate-700/60 shadow-sm'
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
            
            <Button
              onClick={() => setSelectingTableColId(null)}
              className="h-16 w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-black text-base rounded-2xl cursor-pointer active:scale-95"
            >
              Close
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
