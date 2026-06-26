import { Layers, X, Copy, Trash2 } from 'lucide-react';
import type { Table, TableShape } from '@goldensoft/core-schemas';

interface TableConfigModalProps {
  table: Table | null;
  onClose: () => void;
  onUpdate: (fields: Partial<Table>) => void;
  onCopy: () => void;
  onDelete: (table: Table) => void;
}

export function TableConfigModal({
  table,
  onClose,
  onUpdate,
  onCopy,
  onDelete
}: TableConfigModalProps) {
  if (!table) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#15111d] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in duration-100">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-4">
          <h3 className="text-base font-black tracking-wider uppercase flex items-center gap-1.5 dark:text-white">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Configure Table
          </h3>
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer active:scale-95 text-slate-500 dark:text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name field */}
          <div className="space-y-1">
            <label className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
              Table Label
            </label>
            <input
              type="text"
              value={table.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="w-full h-16 bg-slate-50 dark:bg-[#201b2f] border border-slate-200 dark:border-white/5 rounded-2xl px-4 text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-500"
            />
          </div>

          {/* Number field */}
          <div className="space-y-1">
            <label className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
              Table ID/No
            </label>
            <input
              type="number"
              value={table.number}
              onChange={(e) => onUpdate({ number: parseInt(e.target.value) || 0 })}
              className="w-full h-16 bg-slate-50 dark:bg-[#201b2f] border border-slate-200 dark:border-white/5 rounded-2xl px-4 text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-500"
            />
          </div>

          {/* Shape selection */}
          <div className="space-y-1">
            <label className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
              Table Shape
            </label>
            <div className="flex gap-2">
              {(['rect', 'circle'] as TableShape[]).map((shape) => (
                <button
                  key={shape}
                  onClick={() => onUpdate({ shape })}
                  className={`flex-1 h-16 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer active:scale-95 ${
                    table.shape === shape
                      ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-[#201b2f] border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  {shape === 'rect' ? 'Rectangle' : 'Circle'}
                </button>
              ))}
            </div>
          </div>

          {/* Width slider */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-black tracking-wider text-slate-400 uppercase">
              <span>Width</span>
              <span>{table.tableWidth}px</span>
            </div>
            <input
              type="range"
              min="40"
              max="150"
              step="5"
              value={table.tableWidth}
              onChange={(e) => onUpdate({ tableWidth: parseInt(e.target.value) })}
              className="w-full accent-indigo-600 dark:accent-indigo-500 h-3 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Height slider */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-black tracking-wider text-slate-400 uppercase">
              <span>Height</span>
              <span>{table.tableHeight}px</span>
            </div>
            <input
              type="range"
              min="40"
              max="150"
              step="5"
              value={table.tableHeight}
              onChange={(e) => onUpdate({ tableHeight: parseInt(e.target.value) })}
              className="w-full accent-indigo-600 dark:accent-indigo-500 h-3 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-white/5 pt-4 mt-2 flex flex-col gap-2.5">
          {/* Copy action */}
          <button
            onClick={onCopy}
            className="w-full h-16 bg-slate-100 dark:bg-[#221b33] hover:bg-slate-200 dark:hover:bg-[#2b2241] border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Copy className="w-4 h-4" />
            Clone Table Settings
          </button>

          {/* Delete action */}
          <button
            onClick={() => onDelete(table)}
            className="w-full h-16 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 rounded-2xl text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Delete Table
          </button>
        </div>
      </div>
    </div>
  );
}
