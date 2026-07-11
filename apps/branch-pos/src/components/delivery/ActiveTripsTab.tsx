import { useNavigate } from "react-router-dom";
import { Bike, PackageOpen } from "lucide-react";
import type { DeliveryPilot } from "@goldensoft/core-schemas";

interface Props {
  dispatchedChecks: any[];
  pilots: DeliveryPilot[];
  currentTime: Date;
}

export function ActiveTripsTab({ dispatchedChecks, pilots, currentTime }: Props) {
  const navigate = useNavigate();

  const getTimerClass = (isoString?: string) => {
    if (!isoString) return "text-emerald-500";
    const start = new Date(isoString).getTime();
    const elapsedMs = currentTime.getTime() - start;
    const mins = Math.floor(elapsedMs / 60000);
    if (mins < 30) {
      return "text-emerald-600 dark:text-emerald-400";
    } else if (mins < 45) {
      return "text-amber-600 dark:text-amber-500 font-bold";
    } else {
      return "text-rose-600 dark:text-rose-400 font-black animate-pulse";
    }
  };

  const formatElapsedHMS = (isoString?: string) => {
    if (!isoString) return "00:00:00";
    const start = new Date(isoString).getTime();
    const elapsedMs = currentTime.getTime() - start;
    if (elapsedMs < 0) return "00:00:00";
    const totalSecs = Math.floor(elapsedMs / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleOpenCheck = (checkId: string) => {
    navigate("/delivery/order", {
      state: { checkId }
    });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#151120] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm overflow-hidden min-h-0 select-none">
      <div className="flex justify-between items-center shrink-0 mb-4 pb-4 border-b border-slate-100 dark:border-white/10">
        <div>
          <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Bike className="w-5 h-5 text-indigo-500" /> Active Trips Out On Road
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Real-time status tracking for delivery pilots currently out on road transit assignments.</p>
        </div>
        <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-sm font-extrabold px-3.5 py-1 rounded-full shrink-0">
          {dispatchedChecks.length} Trips Active
        </span>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin">
        {dispatchedChecks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <PackageOpen className="w-16 h-16 text-indigo-400 mb-3 opacity-50" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">No Active Trips</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">No delivery pilots are currently dispatching orders on the road.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-black">
                <th className="py-4 px-4">Order #</th>
                <th className="py-4 px-4">Pilot Assigned</th>
                <th className="py-4 px-4">Pilot Phone</th>
                <th className="py-4 px-4">Customer</th>
                <th className="py-4 px-4">Zone</th>
                <th className="py-4 px-4">Delivery Address</th>
                <th className="py-4 px-4">Dispatched Duration</th>
                <th className="py-4 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {dispatchedChecks.map((chk: any) => {
                const pilot = pilots.find((p: any) => p.id === chk.deliveryPilotId) || chk.deliveryPilot;
                const timerStart = chk.dispatchedAt || chk.updatedAt;
                const zoneName = chk.deliveryZone?.name || chk.deliveryCustomer?.deliveryZone?.name || "N/A";

                return (
                  <tr
                    key={chk.id}
                    onClick={() => handleOpenCheck(chk.id)}
                    className="hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <td className="py-5 px-4 font-black text-indigo-600 dark:text-indigo-400 text-sm">#{chk.chkNo}</td>
                    <td className="py-5 px-4 font-extrabold text-indigo-700 dark:text-indigo-300 text-sm">{pilot ? pilot.name : "Unknown"}</td>
                    <td className="py-5 px-4 font-bold text-slate-500 dark:text-slate-400">{pilot?.phone || "N/A"}</td>
                    <td className="py-5 px-4 font-extrabold text-slate-800 dark:text-slate-200 text-sm truncate max-w-[120px]">{chk.customerName || "Walk-In"}</td>
                    <td className="py-5 px-4 font-extrabold text-slate-700 dark:text-slate-300 text-sm">{zoneName}</td>
                    <td className="py-5 px-4 font-bold text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{chk.deliveryAddress || "N/A"}</td>
                    <td className={`py-5 px-4 font-mono font-black text-sm ${getTimerClass(timerStart)}`}>
                      {formatElapsedHMS(timerStart)}
                    </td>
                    <td className="py-5 px-4 font-black text-right text-slate-900 dark:text-white text-sm">{chk.total?.toFixed(2)} EGP</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
