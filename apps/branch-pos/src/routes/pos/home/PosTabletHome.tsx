import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { usePermissions } from '@/hooks/usePermissions';
import { useThemeStore } from '@/store/useThemeStore';
import { useFullscreenStore } from '@/store/useFullscreenStore';
import { PERMISSIONS } from '@goldensoft/core-schemas';
import { 
  ConciergeBell,
  ShoppingBasket,
  Truck,
  BarChart3,
  Wifi,
  Maximize,
  LogOut,
  Phone,
  Minimize,
  UserRound,
  Database,
  Sun,
  Moon
} from 'lucide-react';
import { useCurrentShift, useCloseShift, useCloseDay } from '@/hooks/api/useShiftApi';
import { toast } from 'sonner';

type TileDef = {
  id: string;
  label: string;
  icon: React.ReactNode;
  to: string | null;
  disabledReason?: string;
  glowColor: string;
};


  function GlowingIcon({
  icon: Icon,
  gradient,
  shadow,
}: {
  icon: any;
  gradient: string;
  shadow: string;
}) {
  return (
    <div className="relative flex items-center justify-center">
      <div
        className={`absolute inset-0 blur-2xl ${shadow} opacity-40 transition-opacity duration-500 group-hover:opacity-80`}
      />
      <div
        className={`relative flex items-center justify-center rounded-[1.5rem] sm:rounded-[2rem] ${gradient} p-4 sm:p-5 shadow-2xl shadow-black/50`}
      >
        <Icon className="size-10 text-white sm:size-14" strokeWidth={1.5} />
      </div>
    </div>
  );
};

function routeAllowedMessage(
  hasPos: boolean,
  hasRoute: boolean,
  routeLabel: string,
) {
  if (!hasPos) return "No permission for this shortcut";
  if (!hasRoute) return `Requires ${routeLabel} access`;
  return undefined;
}

  

function PosTile({ tile }: { tile: TileDef }) {
  const { label, icon, to, disabledReason, glowColor } = tile;
  const disabled = !to;
  const title = disabled && disabledReason ? disabledReason : undefined;

  const baseClass =
    "group relative flex aspect-[4/3] sm:aspect-square flex-col items-center justify-center overflow-hidden rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/5 p-4 sm:p-8 backdrop-blur-xl transition-all duration-500 ease-out active:scale-[0.98] shadow-md shadow-slate-100 dark:shadow-none";

  const content = (
    <>
      {/* Background glow effect on hover */}
      <div
        className={`absolute inset-0 bg-gradient-to-b ${glowColor} opacity-0 transition-opacity duration-500 group-hover:opacity-20`}
      />

      {/* Icon container */}
      <div className="z-10 mb-3 sm:mb-6 transition-transform duration-500 group-hover:-translate-y-2 group-hover:scale-110">
        {icon}
      </div>

      {/* Label */}
      <span className="z-10 text-lg font-bold tracking-wider text-slate-800 dark:text-white/90 transition-colors duration-300 group-hover:text-slate-950 dark:group-hover:text-white sm:text-xl md:text-2xl">
        {label}
      </span>
    </>
  );

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        title={title}
        className={`${baseClass} cursor-not-allowed opacity-40`}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      to={to}
      title={title}
      className={`${baseClass} hover:-translate-y-1 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50/50 dark:hover:bg-white/10 hover:shadow-xl dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 sm:hover:-translate-y-2`}
    >
      {content}
    </Link>
  );
}



function StatusBadge({
  isOnline,
  icon: Icon,
  label,
}: {
  isOnline: boolean;
  icon: any;
  label: string;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 backdrop-blur-md transition-colors sm:gap-2 sm:px-3 sm:py-1.5 ${
        isOnline
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
      }`}
    >
      <Icon className="size-3 sm:size-3.5" />
      <span className="text-[10px] font-bold uppercase tracking-wide sm:text-xs">
        {label}{" "}
        <span className="hidden sm:inline">
          {isOnline ? "Online" : "Offline"}
        </span>
      </span>
    </div>
  );
}


export function PosTabletHome() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const { hasPermission: can } = usePermissions();
  const [now, setNow] = useState(() => new Date());
  const [browserOnline, setBrowserOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const isCloudOnline = false;
  const { isDarkMode, toggleTheme } = useThemeStore();
  const { isFullscreen, toggleFullscreen } = useFullscreenStore();

  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [isCloseDayModalOpen, setIsCloseDayModalOpen] = useState(false);
  const [closingCash, setClosingCash] = useState('0');
  const [showEmptyDayConfirm, setShowEmptyDayConfirm] = useState(false);

  const { data: currentShift, refetch: refetchShift } = useCurrentShift();
  const closeShiftMutation = useCloseShift();
  const closeDayMutation = useCloseDay();


  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

 useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const on = () => setBrowserOnline(true);
    const off = () => setBrowserOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const dateLine = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(now),
    [now],
  );

  const clockStr = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(now),
    [now],
  );


const tiles: TileDef[] = useMemo(() => {
    const dine =
      can(PERMISSIONS.DINING_OPEN)  ? "/dine-in" : null;
    const take =
      can(PERMISSIONS.TAKEAWAY_OPEN) ? "/takeaway" : null;
    const del =
      can(PERMISSIONS.DELIVERY_OPEN)
        ? "/delivery"
        : null;
    const reports = can(PERMISSIONS.REPORTS_TODAY_VIEW) ? "/reports" : null;

    const baseTiles: TileDef[] = [
      {
        id: "dine",
        label: "Dine In",
        icon: (
          <GlowingIcon
            icon={ConciergeBell}
            gradient="bg-gradient-to-br from-cyan-400 to-blue-600"
            shadow="bg-blue-500"
          />
        ),
        to: dine,
        disabledReason: routeAllowedMessage(
          can(PERMISSIONS.DINING_OPEN),
          can(PERMISSIONS.DINING_OPEN),
          "dine-in orders",
        ),
        glowColor: "from-blue-500/0 to-blue-500",
      },
      {
        id: "takeaway",
        label: "Takeaway",
        icon: (
          <GlowingIcon
            icon={ShoppingBasket}
            gradient="bg-gradient-to-br from-orange-400 to-rose-600"
            shadow="bg-rose-500"
          />
        ),
        to: take,
        disabledReason: routeAllowedMessage(
          can(PERMISSIONS.TAKEAWAY_OPEN),
          can(PERMISSIONS.TAKEAWAY_OPEN),
          "takeaway orders",
        ),
        glowColor: "from-rose-500/0 to-rose-500",
      },
      {
        id: "delivery",
        label: "Delivery",
        icon: (
          <GlowingIcon
            icon={Truck}
            gradient="bg-gradient-to-br from-fuchsia-400 to-purple-600"
            shadow="bg-purple-500"
          />
        ),
        to: del,
        disabledReason: routeAllowedMessage(
          can(PERMISSIONS.DELIVERY_OPEN),
          can(PERMISSIONS.DELIVERY_OPEN),
          "delivery orders",
        ),
        glowColor: "from-purple-500/0 to-purple-500",
      },
      {
        id: "reports",
        label: "Reports",
        icon: (
          <GlowingIcon
            icon={BarChart3}
            gradient="bg-gradient-to-br from-emerald-400 to-teal-600"
            shadow="bg-teal-500"
          />
        ),
        to: reports,
        disabledReason: routeAllowedMessage(
          can(PERMISSIONS.REPORTS_TODAY_VIEW),
          can(PERMISSIONS.REPORTS_TODAY_VIEW),
          "Reports"),
        glowColor: "from-teal-500/0 to-teal-500",
      },
    ];
    
    return baseTiles;
  }, [can]);

  const handleCloseShift = async () => {
    try {
      await closeShiftMutation.mutateAsync({ actualClosingCash: parseFloat(closingCash) || 0 });
      toast.success("Shift closed successfully! Next shift is now open.");
      setIsCloseShiftModalOpen(false);
      refetchShift();
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message || "Failed to close shift");
    }
  };

  const handleCloseDay = async (force = false) => {
    const isEmpty = currentShift && (currentShift.expectedClosingCash || 0) === (currentShift.startingCash || 0);
    if (isEmpty && !force) {
      setShowEmptyDayConfirm(true);
      return;
    }

    try {
      await closeDayMutation.mutateAsync({ actualClosingCash: parseFloat(closingCash) || 0 });
      toast.success("Business day closed successfully! New business day is now open.");
      setIsCloseDayModalOpen(false);
      setShowEmptyDayConfirm(false);
      refetchShift();
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message || "Failed to close business day");
    }
  };


  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-50 dark:bg-[#0a0710] bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-[#1c122b] dark:via-[#0d0914] dark:to-[#0a0710] text-slate-900 dark:text-white select-none touch-manipulation font-sans transition-colors duration-300">
        {/* Background Ambient Orbs */}
        <div className="pointer-events-none absolute -left-[20%] -top-[20%] size-[60%] rounded-full bg-purple-900/10 blur-[100px] sm:bg-purple-900/20 sm:blur-[120px] dark:opacity-100 opacity-50" />
        <div className="pointer-events-none absolute -bottom-[20%] -right-[20%] size-[60%] rounded-full bg-indigo-900/10 blur-[100px] sm:bg-indigo-900/20 sm:blur-[120px] dark:opacity-100 opacity-50" />
        <div className="pointer-events-none absolute left-[40%] top-[40%] size-[30%] rounded-full bg-fuchsia-900/5 blur-[80px] sm:bg-fuchsia-900/10 sm:blur-[100px] dark:opacity-100 opacity-50" />

        <div className="relative z-10 flex min-h-dvh flex-col p-3 sm:p-4 md:p-6">
          {/* Header */}
          <header className="flex flex-col gap-4 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200/80 bg-white/70 dark:border-white/5 dark:bg-white/[0.02] px-4 py-3 sm:py-4 backdrop-blur-3xl shadow-2xl md:flex-row md:items-center md:justify-between md:px-6 transition-colors duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shrink-0">
                  <img
                    src="/images/logo/logo.jpg"
                    alt="Golden Soft Logo"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                    Golden Soft
                  </h2>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50 sm:text-xs">
                    Point of Sale
                  </p>
                </div>
              </div>
              {/* Mobile Actions */}
              <div className="flex items-center gap-2 md:hidden">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200/50 dark:bg-white/5 text-slate-700 dark:text-white/80 transition hover:bg-slate-350 dark:hover:bg-white/10"
                  title="Toggle Theme"
                >
                  {isDarkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </button>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200/50 dark:bg-white/5 text-slate-700 dark:text-white/80 transition hover:bg-slate-350 dark:hover:bg-white/10"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400 transition hover:bg-red-500/20"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 md:gap-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <StatusBadge isOnline={browserOnline} icon={Wifi} label="Web" />
                <StatusBadge
                  isOnline={isCloudOnline}
                  icon={Database}
                  label="Cloud"
                />
              </div>

              <div className="hidden h-8 w-px bg-white/10 md:block" />

              <div className="hidden items-center gap-3 md:flex">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="ml-2 flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md transition hover:bg-slate-200/50 dark:hover:bg-white/10 text-slate-700 dark:text-white"
                  title="Toggle Theme"
                >
                  {isDarkMode ? <Sun className="size-5" /> : <Moon className="size-5" />}
                </button>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="ml-2 flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md transition hover:bg-slate-200/50 dark:hover:bg-white/10 text-slate-700 dark:text-white"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="ml-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400 transition hover:bg-red-500/20 hover:text-red-500 dark:hover:text-red-300"
                  aria-label="Log out"
                >
                  <LogOut className="size-5" />
                </button>
              </div>
            </div>
          </header>

          {/* Main Content - Centered */}
          <main className="flex flex-1 items-center justify-center py-6 sm:py-10">
            <div className="w-full max-w-5xl">
              {/* Date and Time Header */}
              <div className="mb-8 sm:mb-12 text-center">
                <h1 className="text-5xl font-light tabular-nums tracking-tighter text-slate-900 dark:text-white drop-shadow-lg sm:text-7xl md:text-8xl">
                  {clockStr}
                </h1>
                <p className="mt-2 sm:mt-4 text-sm font-medium uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-500 dark:text-white/60 sm:text-lg md:text-xl">
                  {dateLine}
                </p>
              </div>

              {/* Tiles Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-4 md:gap-8">
                {tiles.map((t) => (
                  <PosTile key={t.id} tile={t} />
                ))}
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer className="mt-auto flex shrink-0 flex-col items-center justify-between gap-4 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200/80 bg-white/70 dark:border-white/5 dark:bg-white/[0.02] px-4 py-3 sm:py-4 backdrop-blur-xl sm:flex-row sm:px-6 transition-colors duration-300">
            <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200/50 dark:bg-white/5">
                  <Phone className="size-4 text-slate-600 dark:text-white/60" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white/90">
                    Customer Service
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-white/50">
                    +20 122 454 0308
                  </p>
                </div>
              </div>
              {/* Mobile Settings Button */}
              <div className="sm:hidden flex items-center gap-2">
                {can(PERMISSIONS.WORK_SHIFT_CLOSE) && currentShift && (
                  <button
                    type="button"
                    onClick={() => {
                      setClosingCash('0');
                      setIsCloseShiftModalOpen(true);
                    }}
                    disabled={currentShift.shiftNumber >= 3}
                    className={`h-10 px-3 rounded-xl font-bold shadow-md transition-all duration-75 active:scale-[0.93] text-[10px] uppercase tracking-wider ${
                      currentShift.shiftNumber >= 3
                        ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white active:brightness-95'
                    }`}
                    title={currentShift.shiftNumber >= 3 ? "Shift 3 can only be closed with EOD" : "Close Current Shift"}
                  >
                    Shift {currentShift.shiftNumber}
                  </button>
                )}
                {can(PERMISSIONS.WORKDAY_CLOSE) && (
                  <button
                    type="button"
                    onClick={() => {
                      setClosingCash('0');
                      setShowEmptyDayConfirm(false);
                      setIsCloseDayModalOpen(true);
                    }}
                    className="h-10 px-3 rounded-xl font-bold bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md transition-all duration-75 active:scale-[0.93] text-[10px] uppercase tracking-wider active:brightness-95"
                  >
                    Close Day
                  </button>
                )}
                <div className="flex items-center gap-2 ml-2">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {user?.username || "User"}
                    </span>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md">
                    <UserRound className="size-4 text-slate-700 dark:text-white/80" />
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-4">
              {can(PERMISSIONS.WORK_SHIFT_CLOSE) && currentShift && (
                <button
                  type="button"
                  onClick={() => {
                    setClosingCash('0');
                    setIsCloseShiftModalOpen(true);
                  }}
                  disabled={currentShift.shiftNumber >= 3}
                  className={`h-12 px-4 rounded-xl font-bold shadow-md transition-all duration-75 active:scale-95 text-xs uppercase tracking-wider flex items-center gap-2 select-none ${
                    currentShift.shiftNumber >= 3
                      ? 'bg-slate-200 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:brightness-115 active:brightness-95 shadow-orange-500/10 hover:shadow-orange-500/20'
                  }`}
                  title={currentShift.shiftNumber >= 3 ? "Shift 3 can only be closed with EOD" : "Close Current Shift"}
                >
                  Close Shift {currentShift.shiftNumber}
                </button>
              )}
              {can(PERMISSIONS.WORKDAY_CLOSE) && (
                <button
                  type="button"
                  onClick={() => {
                    setClosingCash('0');
                    setShowEmptyDayConfirm(false);
                    setIsCloseDayModalOpen(true);
                  }}
                  className="h-12 px-4 rounded-xl font-bold bg-gradient-to-r from-red-500 to-rose-600 text-white hover:brightness-115 active:brightness-95 shadow-md shadow-red-500/10 hover:shadow-red-500/20 transition-all duration-75 active:scale-95 text-xs uppercase tracking-wider flex items-center gap-2 select-none"
                >
                  Close Day
                </button>
              )}
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {user?.username || "User"}
                </span>
                {currentShift && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 uppercase tracking-wider">
                    Shift {currentShift.shiftNumber} Open</span>
                )}
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md">
                <UserRound className="size-5 text-slate-700 dark:text-white/80" />
              </div>
            </div>
          </footer>
        </div>

        {/* Close Shift Modal */}
        {isCloseShiftModalOpen && currentShift && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60">
            <div className="w-full max-w-md rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#120a1c] p-6 shadow-2xl">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Close Shift {currentShift.shiftNumber}</h2>
              <p className="text-slate-500 dark:text-white/60 mb-6 text-sm">
                Enter the actual closing cash in the drawer. Closing this shift will automatically open Shift {currentShift.shiftNumber + 1}.
              </p>
              
              <div className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-2 select-none">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-white/60">Starting Cash</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{(currentShift.startingCash || 0).toFixed(2)} EGP</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-white/60">Expected Cash</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{(currentShift.expectedClosingCash || 0).toFixed(2)} EGP</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-white/80 mb-2">Actual Closing Cash (EGP)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={closingCash}
                    onChange={(e) => setClosingCash(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-4 text-xl font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setIsCloseShiftModalOpen(false)}
                  className="flex-1 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 py-4 font-bold text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 active:scale-[0.95] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCloseShift}
                  disabled={closeShiftMutation.isPending}
                  className="flex-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 py-4 font-bold text-white hover:brightness-110 active:scale-[0.95] transition-all disabled:opacity-50"
                >
                  {closeShiftMutation.isPending ? "Closing..." : "Close Shift"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Close Day Modal */}
        {isCloseDayModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60">
            <div className="w-full max-w-md rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#120a1c] p-6 shadow-2xl">
              {showEmptyDayConfirm ? (
                <>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No Sales Recorded</h2>
                  <p className="text-slate-500 dark:text-white/60 mb-6 text-sm">
                    Warning: There are no sales recorded for the active business day ({currentShift?.businessDate}). Are you sure you want to close the business day?
                  </p>
                  <div className="mt-8 flex gap-3">
                    <button
                      onClick={() => setShowEmptyDayConfirm(false)}
                      className="flex-1 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 py-4 font-bold text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 active:scale-[0.95] transition-all"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => handleCloseDay(true)}
                      disabled={closeDayMutation.isPending}
                      className="flex-1 rounded-full bg-gradient-to-r from-red-500 to-rose-600 py-4 font-bold text-white hover:brightness-110 active:scale-[0.95] transition-all disabled:opacity-50"
                    >
                      {closeDayMutation.isPending ? "Processing..." : "Yes, Close Day"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Close Business Day</h2>
                  <p className="text-slate-500 dark:text-white/60 mb-6 text-sm">
                    {currentShift 
                      ? `This will close the active Shift ${currentShift.shiftNumber} and lock the business day (${currentShift.businessDate}). All open checks must be resolved.`
                      : "This will finalize and close the business day. All open checks must be resolved."
                    }
                  </p>
                  
                  {currentShift && (
                    <div className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-2 select-none">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 dark:text-white/60">Starting Cash</span>
                        <span className="font-semibold text-slate-800 dark:text-white">{(currentShift.startingCash || 0).toFixed(2)} EGP</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 dark:text-white/60">Expected Cash</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{(currentShift.expectedClosingCash || 0).toFixed(2)} EGP</span>
                      </div>
                    </div>
                  )}

                  {currentShift && (
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-white/80 mb-2">Actual Closing Cash (EGP)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={closingCash}
                          onChange={(e) => setClosingCash(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-4 text-xl font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-8 flex gap-3">
                    <button
                      onClick={() => setIsCloseDayModalOpen(false)}
                      className="flex-1 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 py-4 font-bold text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 active:scale-[0.95] transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleCloseDay(false)}
                      disabled={closeDayMutation.isPending}
                      className="flex-1 rounded-full bg-gradient-to-r from-red-500 to-rose-600 py-4 font-bold text-white hover:brightness-110 active:scale-[0.95] transition-all disabled:opacity-50"
                    >
                      {closeDayMutation.isPending ? "Processing..." : "Close Day"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
  );
}
