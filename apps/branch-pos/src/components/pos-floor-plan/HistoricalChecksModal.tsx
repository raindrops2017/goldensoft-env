import { useState } from 'react';
import { useHistoricalChecks } from '@/hooks/api/useChecksApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Loader2, ListOrdered, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNavigate } from 'react-router-dom';
import { useTableSections } from '@/hooks/useTables';

interface HistoricalChecksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HistoricalChecksModal({ isOpen, onClose }: HistoricalChecksModalProps) {
  const navigate = useNavigate();

  const { data: sections = [] } = useTableSections();
  const allTables = sections.flatMap(s => s.tables || []);
  const getTableNameById = (tableId: string | null | undefined) => {
    if (!tableId) return 'N/A';
    const found = allTables.find(t => t.id === tableId);
    return found ? (found.name || `T${found.number}`) : `T${tableId}`;
  };
  const getTableNumberById = (tableId: string | null | undefined) => {
    if (!tableId) return '';
    const found = allTables.find(t => t.id === tableId);
    return found ? String(found.number) : '';
  };

  // Filter state
  const [status, setStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [chkNo, setChkNo] = useState<string>('');
  const [tableNo, setTableNo] = useState<string>('');
  const [amountOperator, setAmountOperator] = useState<string>('=');
  const [amountValue, setAmountValue] = useState<string>('');

  // Applied filters that actually trigger the query
  const [appliedFilters, setAppliedFilters] = useState<any>(null);

  const { data: checks, isLoading, isFetching } = useHistoricalChecks(appliedFilters);

  const handleSearch = () => {
    setAppliedFilters({
      status: status !== 'all' ? status : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      chkNo: chkNo || undefined,
      tableId: tableNo || undefined, // NOTE: If tableNo is a string, we might need to look up tableId, but assuming the API handles it or user types ID. If user types number, backend should probably filter by tableName/number. For now pass as tableId.
      amountOperator: amountValue ? amountOperator : undefined,
      amountValue: amountValue || undefined,
    });
  };

  const handleReset = () => {
    setStatus('all');
    setDateFrom('');
    setDateTo('');
    setChkNo('');
    setTableNo('');
    setAmountOperator('=');
    setAmountValue('');
    setAppliedFilters(null);
  };

  const getStatusBadge = (statusId: number) => {
    switch (statusId) {
      case 1:
        return <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Open</span>;
      case 2:
        return <span className="bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-350 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Cash</span>;
      case 3:
        return <span className="bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Visa</span>;
      case 4:
        return <span className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Owner CL</span>;
      case 5:
        return <span className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Voided</span>;
      case 6:
        return <span className="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Mixed</span>;
      case 7:
        return <span className="bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Comp</span>;
      case 8:
        return <span className="bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Officer</span>;
      case 9:
        return <span className="bg-gray-100 text-gray-750 dark:bg-white/5 dark:text-gray-400 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Merged</span>;
      case 10:
        return <span className="bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Staff CL</span>;
      case 11:
        return <span className="bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Food Test</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Unknown</span>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-[95vw] w-full h-[95vh] flex flex-col p-0 bg-slate-50 dark:bg-[#0f0b15] border-slate-200 dark:border-white/10 overflow-hidden">
        <DialogHeader className="p-3 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#15111d] shrink-0">
          <DialogTitle className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-indigo-500" />
            Historical Checks
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Filters Area */}
          <div className="p-2 bg-white dark:bg-[#1a1626] border-b border-slate-200 dark:border-white/5 shrink-0 flex items-end gap-2 overflow-x-auto">
            <div className="flex flex-col gap-1 w-24 shrink-0">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 text-xs rounded-lg dark:bg-[#211d31] dark:border-white/10">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="1">Open</SelectItem>
                  <SelectItem value="2">Closed</SelectItem>
                  <SelectItem value="3">Voided</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1 w-32 shrink-0">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Date From</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "h-8 w-full text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#211d31] px-3 flex justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                    {dateFrom ? format(new Date(dateFrom), "MMM d, yyyy") : <span>Date From</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom ? new Date(dateFrom) : undefined}
                    onSelect={(d) => setDateFrom(d ? format(d, "yyyy-MM-dd") : "")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-1 w-32 shrink-0">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Date To</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "h-8 w-full text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#211d31] px-3 flex justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                    {dateTo ? format(new Date(dateTo), "MMM d, yyyy") : <span>Date To</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo ? new Date(dateTo) : undefined}
                    onSelect={(d) => setDateTo(d ? format(d, "yyyy-MM-dd") : "")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-1 w-20 shrink-0">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Check No</label>
              <Input
                type="number"
                placeholder="Ex: 104"
                value={chkNo}
                onChange={(e) => setChkNo(e.target.value)}
                className="h-8 text-xs rounded-lg dark:bg-[#211d31] dark:border-white/10"
              />
            </div>

            <div className="flex flex-col gap-1 w-24 shrink-0">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Table Name/No</label>
              <Input
                type="text"
                placeholder="Ex: T1"
                value={tableNo}
                onChange={(e) => setTableNo(e.target.value)}
                className="h-8 text-xs rounded-lg dark:bg-[#211d31] dark:border-white/10"
              />
            </div>

            <div className="flex flex-col gap-1 w-40 shrink-0">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Amount</label>
              <div className="flex gap-1">
                <Select value={amountOperator} onValueChange={setAmountOperator}>
                  <SelectTrigger className="h-8 text-xs w-16 px-2 rounded-lg dark:bg-[#211d31] dark:border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="=">=</SelectItem>
                    <SelectItem value=">">{'>'}</SelectItem>
                    <SelectItem value="<">{'<'}</SelectItem>
                    <SelectItem value=">=">{'>='}</SelectItem>
                    <SelectItem value="<=">{'<='}</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amountValue}
                  onChange={(e) => setAmountValue(e.target.value)}
                  className="h-8 text-xs rounded-lg flex-1 dark:bg-[#211d31] dark:border-white/10"
                />
              </div>
            </div>

            <div className="flex items-center ml-auto gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={handleReset}
                className="h-8 px-3 rounded-lg text-xs text-slate-600 font-bold active:scale-95 dark:text-slate-300 dark:border-white/10"
              >
                Reset
              </Button>
              <Button
                onClick={handleSearch}
                className="h-8 px-4 rounded-lg text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold active:scale-95 flex items-center gap-1.5"
                disabled={isFetching}
              >
                {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Apply
              </Button>
            </div>
          </div>

          {/* Table Area */}
          <div className="flex-1 overflow-auto bg-slate-50 dark:bg-[#0a0710]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-100 dark:bg-[#1a1626] border-b border-slate-200 dark:border-white/5 z-10">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">#</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Table No</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Check Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Guests</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && !checks ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center">
                      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : !checks || checks.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-16 text-center text-slate-500 dark:text-slate-400">
                      <Filter className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="text-lg font-bold">No checks found</p>
                      <p className="text-sm">Try adjusting your filters</p>
                    </td>
                  </tr>
                ) : (
                  checks.map((check) => (
                    <tr
                      key={check.id}
                      className="border-b border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-[#15111d] transition-colors"
                    >
                      <td className="px-6 py-4 font-black text-slate-800 dark:text-slate-200">
                        {check.chkNo}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                        {check.chkDate}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                        {new Date(check.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                        {getTableNameById(check.tableId)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-350 truncate max-w-[150px]" title={check.tableName || '—'}>
                        {check.tableName || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                        {check.guestCount}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(check.chkStatusId)}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white">
                        {check.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Button
                          onClick={() => {
                            onClose();
                            const tableNumber = getTableNumberById(check.tableId);
                            const tableIdentifier = tableNumber || check.tableId;
                            navigate(`/table/${tableIdentifier}?chkNo=${check.chkNo}`);
                          }}
                          className="h-10 px-4 rounded-xl font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 active:scale-95 transition-transform"
                        >
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
