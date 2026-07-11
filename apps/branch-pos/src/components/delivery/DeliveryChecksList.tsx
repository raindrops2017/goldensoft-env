import { useState, useEffect, useMemo } from "react";
import { Clock, Search, Printer, User, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DeliveryPilot } from "@goldensoft/core-schemas";

const SLA_GREEN_LIMIT = 10;
const SLA_AMBER_LIMIT = 20;

interface Props {
  checks: any[];
  pilots?: DeliveryPilot[];
  onSelectCheck: (check: any) => void;
  onPrintCheck?: (id: string) => void;
  onSettleCheck?: (id: string, method: "cash" | "visa") => Promise<void>;
  onBatchSettleChecks?: (ids: string[], method: "cash" | "visa") => Promise<void>;
  isCompact?: boolean;
  showActions?: boolean;
}

export default function DeliveryChecksList({
  checks = [],
  onSelectCheck,
  onPrintCheck,
}: Props) {
  const [query, setQuery] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatElapsed = (isoString?: string) => {
    if (!isoString) return "00:00";
    const start = new Date(isoString).getTime();
    const elapsedMs = currentTime.getTime() - start;
    if (elapsedMs < 0) return "00:00";
    const totalSecs = Math.floor(elapsedMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getSlaColor = (isoString?: string) => {
    if (!isoString) return "text-emerald-600 dark:text-emerald-400";
    const start = new Date(isoString).getTime();
    const elapsedMs = currentTime.getTime() - start;
    const mins = Math.floor(elapsedMs / (1000 * 60));

    if (mins < SLA_GREEN_LIMIT) {
      return "text-emerald-600 dark:text-emerald-400";
    } else if (mins < SLA_AMBER_LIMIT) {
      return "text-amber-600 dark:text-amber-500 font-bold";
    } else {
      return "text-rose-600 dark:text-rose-450 font-black animate-pulse";
    }
  };

  const filtered = useMemo(() => {
    return checks.filter((check) => {
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      const chkNo = String(check.chkNo);
      const name = (check.customerName || check.deliveryCustomer?.name || "").toLowerCase();
      const phone = (check.customerPhone || check.deliveryCustomer?.phone || "").toLowerCase();
      const pilot = (check.deliveryPilot?.name || "").toLowerCase();
      const zone = (check.deliveryZone?.name || "").toLowerCase();
      const address = (check.deliveryCustomer?.address || "").toLowerCase();
      return (
        chkNo.includes(q) ||
        name.includes(q) ||
        phone.includes(q) ||
        pilot.includes(q) ||
        zone.includes(q) ||
        address.includes(q)
      );
    });
  }, [checks, query]);

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* Search Header - Compact */}
      <div className="shrink-0 mb-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search check #, phone, customer..."
            className="h-14 w-full pl-12 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-bold focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Orders List Container */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600 py-12">
            <p className="text-xs font-black">No matching delivery orders</p>
          </div>
        ) : (
          filtered.map((chk) => {
            const pilotName = chk.deliveryPilot?.name;
            const addressText = chk.deliveryCustomer?.address || chk.deliveryAddress || "";
            const zoneName = chk.deliveryZone?.name || chk.deliveryCustomer?.deliveryZone?.name || "";

            return (
              <div
                key={chk.id}
                onClick={() => onSelectCheck(chk)}
                className="flex items-center justify-between p-3.5 bg-white dark:bg-[#120a1c] border border-slate-200 dark:border-white/5 rounded-2xl cursor-pointer hover:border-indigo-500 transition-all active:scale-[0.99] text-left select-none gap-4"
              >
                {/* Left Info: Check No, SLA, Customer, Zone */}
                <div className="flex-1 min-w-0 flex items-center gap-4">
                  <div className="flex flex-col min-w-[70px] shrink-0">
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">#{chk.chkNo}</span>
                    <span className={`text-[10px] font-bold flex items-center gap-0.5 ${getSlaColor(chk.createdAt)}`}>
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{formatElapsed(chk.createdAt)}</span>
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">
                        {chk.customerName || "Walk-In"}
                      </span>
                      {pilotName && (
                        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] uppercase font-black px-1.5 py-0.5 rounded shrink-0">
                          {pilotName}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5 font-medium flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                      <span className="truncate">{addressText} {zoneName && `(${zoneName})`}</span>
                    </div>
                  </div>
                </div>

                {/* Right Info: Total, Print Action */}
                <div className="shrink-0 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  <span className="text-sm font-black text-slate-900 dark:text-white whitespace-nowrap">{chk.total.toFixed(1)} EGP</span>
                  
                  {onPrintCheck && (
                    <Button
                      variant="ghost"
                      className="w-10 h-10 p-0 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 border border-slate-200 dark:border-white/10 cursor-pointer"
                      title="Print Receipt"
                      onClick={() => onPrintCheck(chk.id)}
                    >
                      <Printer className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
