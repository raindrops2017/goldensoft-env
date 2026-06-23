import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { usePermissions } from '../../hooks/usePermissions';
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
  Settings,
  Minimize,
  UserRound,
  Database,
  PlayCircle
} from 'lucide-react';
import { useCurrentShift, useOpenShift } from '../../hooks/api/useShiftApi';
import { toast } from 'sonner';

// function PosTile({ 
//   label, 
//   icon: Icon, 
//   gradientColors, 
//   shadowColor, 
//   glowColor, 
//   disabled, 
//   onClick 
// }: { 
//   label: string; 
//   icon: any; 
//   gradientColors: string; 
//   shadowColor: string; 
//   glowColor: string;
//   disabled: boolean; 
//   onClick: () => void; 
// }) {
//   const baseClass = "group relative w-[13.5rem] h-[15.5rem] rounded-[2.5rem] border flex flex-col items-center justify-center gap-7 overflow-hidden touch-manipulation transition-all duration-300";
  
//   if (disabled) {
//     return (
//       <button 
//         disabled
//         className={`${baseClass} bg-slate-100/40 dark:bg-[#14101c]/40 border-slate-200/50 dark:border-white/5 opacity-60 dark:opacity-40 cursor-not-allowed`}
//       >
//         <div className="relative">
//           <div className={`relative w-[5.5rem] h-[5.5rem] rounded-[1.8rem] flex items-center justify-center bg-gradient-to-br ${gradientColors} shadow-xl ${shadowColor} grayscale`}>
//             <Icon className="w-10 h-10 text-white/70" />
//           </div>
//         </div>
//         <span className="text-xl font-bold text-slate-500 dark:text-white/70 tracking-wide z-10 transition-colors duration-300">{label}</span>
//       </button>
//     );
//   }

//   return (
//     <button 
//       onClick={onClick}
//       className={`${baseClass} bg-white/80 dark:bg-[#14101c]/80 backdrop-blur-sm border-slate-200 dark:border-white/5 active:scale-95 hover:bg-slate-50 dark:hover:bg-[#1a1525] shadow-sm dark:shadow-none`}
//     >
//       <div className="absolute inset-0 bg-gradient-to-b from-black/[0.03] dark:from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
//       <div className="relative transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-105">
//         <div className={`absolute inset-0 blur-2xl opacity-40 ${glowColor} group-hover:opacity-60 transition-opacity`} />
//         <div className={`relative w-[5.5rem] h-[5.5rem] rounded-[1.8rem] flex items-center justify-center bg-gradient-to-br ${gradientColors} shadow-xl ${shadowColor}`}>
//           <Icon className="w-10 h-10 text-white" />
//         </div>
//       </div>
//       <span className="text-xl font-bold text-slate-800 dark:text-white tracking-wide z-10 transition-colors duration-300">{label}</span>
//     </button>
//   );
// }
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
    "group relative flex aspect-[4/3] sm:aspect-square flex-col items-center justify-center overflow-hidden rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/10 bg-white/5 p-4 sm:p-8 backdrop-blur-xl transition-all duration-500 ease-out active:scale-[0.98]";

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
      <span className="z-10 text-lg font-bold tracking-wider text-white/90 transition-colors duration-300 group-hover:text-white sm:text-xl md:text-2xl">
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
      className={`${baseClass} hover:-translate-y-1 hover:border-white/20 hover:bg-white/10 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 sm:hover:-translate-y-2`}
    >
      {content}
    </Link>
  );
}

function ActionTile({ 
  label, 
  icon, 
  onClick, 
  glowColor 
}: { 
  label: string; 
  icon: React.ReactNode; 
  onClick: () => void;
  glowColor: string; 
}) {
  const baseClass =
    "group relative flex aspect-[4/3] sm:aspect-square flex-col items-center justify-center overflow-hidden rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/10 bg-white/5 p-4 sm:p-8 backdrop-blur-xl transition-all duration-500 ease-out active:scale-[0.98]";

  const content = (
    <>
      <div className={`absolute inset-0 bg-gradient-to-b ${glowColor} opacity-0 transition-opacity duration-500 group-hover:opacity-20`} />
      <div className="z-10 mb-3 sm:mb-6 transition-transform duration-500 group-hover:-translate-y-2 group-hover:scale-110">
        {icon}
      </div>
      <span className="z-10 text-lg font-bold tracking-wider text-white/90 transition-colors duration-300 group-hover:text-white sm:text-xl md:text-2xl">
        {label}
      </span>
    </>
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClass} hover:-translate-y-1 hover:border-white/20 hover:bg-white/10 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 sm:hover:-translate-y-2`}
    >
      {content}
    </button>
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
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-red-500/30 bg-red-500/10 text-red-400"
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
  
  // const { isDarkMode, toggleTheme } = useThemeStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [startingCash, setStartingCash] = useState('0');

  const { data: currentShift, isLoading: shiftLoading, refetch: refetchShift } = useCurrentShift();
  const openShiftMutation = useOpenShift();
  
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.warn(`Error attempting to exit fullscreen: ${err.message}`);
        });
      }
    }
  }, []);


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
      can(PERMISSIONS.TAKEAWAY_OPEN) ? "/pos/takeaway" : null;
    const del =
      can(PERMISSIONS.DELIVERY_OPEN)
        ? "/pos/delivery"
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

  const handleOpenShift = async () => {
    try {
      await openShiftMutation.mutateAsync({ startingCash: parseFloat(startingCash) || 0 });
      toast.success("Shift opened successfully!");
      setIsShiftModalOpen(false);
      refetchShift();
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message || "Failed to open shift");
    }
  };



  // Note: Profile and Settings don't have dedicated permissions in core-schemas yet, 
  // so we'll default them to true for now or you can define them in the schema!
  const canProfile = true; 
  const canSettings = true;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#0a0510] text-white">
        {/* Background Ambient Orbs */}
        <div className="pointer-events-none absolute -left-[20%] -top-[20%] size-[60%] rounded-full bg-purple-900/10 blur-[100px] sm:bg-purple-900/20 sm:blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-[20%] -right-[20%] size-[60%] rounded-full bg-indigo-900/10 blur-[100px] sm:bg-indigo-900/20 sm:blur-[120px]" />
        <div className="pointer-events-none absolute left-[40%] top-[40%] size-[30%] rounded-full bg-fuchsia-900/5 blur-[80px] sm:bg-fuchsia-900/10 sm:blur-[100px]" />

        <div className="relative z-10 flex min-h-dvh flex-col p-3 sm:p-4 md:p-6">
          {/* Header */}
          <header className="flex flex-col gap-4 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 bg-white/[0.02] px-4 py-3 sm:py-4 backdrop-blur-3xl shadow-2xl md:flex-row md:items-center md:justify-between md:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 px-3 shadow-lg shadow-amber-500/20 sm:h-12 sm:rounded-2xl sm:px-4">
                  <span className="text-lg font-black tracking-tight text-black sm:text-xl">
                    GS
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                    Golden Soft
                  </h2>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50 sm:text-xs">
                    Point of Sale
                  </p>
                </div>
              </div>
              {/* Mobile Actions */}
              <div className="flex items-center gap-2 md:hidden">
                <button
                  type="button"
                  onClick={toggleFullScreen}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/80 transition hover:bg-white/10"
                >
                  {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-400 transition hover:bg-red-500/20"
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
                  label="Server"
                />
              </div>

              <div className="hidden h-8 w-px bg-white/10 md:block" />

              <div className="hidden items-center gap-3 md:flex">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-white">
                    {user?.username || "User"}
                  </span>
                  {canProfile ? (
                    <Link
                      to="/profile"
                      className="text-xs font-medium text-pink-300 hover:text-pink-200 transition"
                    >
                      View Profile
                    </Link>
                  ) : (
                    <span className="text-xs font-medium text-white/30">
                      Cashier
                    </span>
                  )}
                  {currentShift && (
                    <span className="text-[10px] font-bold text-emerald-400 mt-1 uppercase tracking-wider">
                      Shift Open
                    </span>
                  )}
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
                  <UserRound className="size-5 text-white/80" />
                </div>
                <button
                  type="button"
                  onClick={toggleFullScreen}
                  className="ml-2 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md transition hover:bg-white/10 hover:text-white"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="ml-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400 transition hover:bg-red-500/20 hover:text-red-300"
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
                <h1 className="text-5xl font-light tabular-nums tracking-tighter text-white drop-shadow-lg sm:text-7xl md:text-8xl">
                  {clockStr}
                </h1>
                <p className="mt-2 sm:mt-4 text-sm font-medium uppercase tracking-[0.15em] sm:tracking-[0.2em] text-white/60 sm:text-lg md:text-xl">
                  {dateLine}
                </p>
              </div>

              {/* Tiles Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-4 md:gap-8">
                {!shiftLoading && !currentShift && (
                  <ActionTile
                    label="Open Shift"
                    icon={
                      <GlowingIcon
                        icon={PlayCircle}
                        gradient="bg-gradient-to-br from-emerald-400 to-green-600"
                        shadow="bg-green-500"
                      />
                    }
                    onClick={() => setIsShiftModalOpen(true)}
                    glowColor="from-green-500/0 to-green-500"
                  />
                )}
                {tiles.map((t) => (
                  <PosTile key={t.id} tile={t} />
                ))}
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer className="mt-auto flex shrink-0 flex-col items-center justify-between gap-4 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 bg-white/[0.02] px-4 py-3 sm:py-4 backdrop-blur-xl sm:flex-row sm:px-6">
            <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5">
                  <Phone className="size-4 text-white/60" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/90">
                    Customer Service
                  </p>
                  <p className="text-[10px] sm:text-xs text-white/50">
                    Golden Soft POS · Standard Edition
                  </p>
                </div>
              </div>

              {/* Mobile Settings Button */}
              <div className="sm:hidden">
                {canSettings ? (
                  <Link
                    to="/profile"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                    aria-label="Settings"
                  >
                    <Settings className="size-4" />
                  </Link>
                ) : (
                  <span
                    className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-full bg-white/5 text-white/30"
                    title="No permission"
                  >
                    <Settings className="size-4" />
                  </span>
                )}
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-4">
              <div className="flex flex-col items-end">
                <p className="text-sm font-bold text-white">{}</p>
                <p className="text-xs text-white/50">Active Branch</p>
              </div>
              {canSettings ? (
                <Link
                  to="/profile"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                  aria-label="Settings"
                >
                  <Settings className="size-4" />
                </Link>
              ) : (
                <span
                  className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-full bg-white/5 text-white/30"
                  title="No permission"
                >
                  <Settings className="size-4" />
                </span>
              )}
            </div>
          </footer>
        </div>

        {/* Open Shift Modal */}
        {isShiftModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60">
            <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#120a1c] p-6 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-2">Open Shift</h2>
              <p className="text-white/60 mb-6 text-sm">Enter the starting cash amount to open the register for the day.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Starting Cash (EGP)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={startingCash}
                      onChange={(e) => setStartingCash(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-xl font-bold text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setIsShiftModalOpen(false)}
                  className="flex-1 rounded-full border border-white/10 bg-white/5 py-4 font-bold text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOpenShift}
                  disabled={openShiftMutation.isPending}
                  className="flex-1 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 py-4 font-bold text-white hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {openShiftMutation.isPending ? "Opening..." : "Open Shift"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    // <div className="relative min-h-screen bg-slate-50 dark:bg-[#0a0710] bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-[#1c122b] dark:via-[#0d0914] dark:to-[#0a0710] text-slate-900 dark:text-white select-none overflow-hidden touch-manipulation flex flex-col font-sans transition-colors duration-300">
      
    //   {/* Top Bar */}
    //   <header className="m-6 p-3 px-4 rounded-full bg-white/80 dark:bg-[#15111d]/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 flex justify-between items-center shadow-lg dark:shadow-xl z-20 transition-colors duration-300">
    //     {/* Left: Brand */}
    //     <div className="flex items-center gap-3">
    //       <img 
    //         src="/images/logo/GSLOGO-icon.svg" 
    //         alt="Golden Soft Logo" 
    //         className="w-12 h-12 object-contain"
    //       />
    //       <div className="flex flex-col">
    //         <span className="font-bold text-lg leading-tight tracking-wide text-slate-900 dark:text-white transition-colors duration-300">Golden Soft</span>
    //         <span className="text-slate-500 dark:text-gray-400 text-[0.65rem] font-bold tracking-[0.2em] transition-colors duration-300">POINT OF SALE</span>
    //       </div>
    //     </div>

    //     {/* Right: Status & User */}
    //     <div className="flex items-center gap-5">
    //       {/* Status Badges */}
    //       <div className="flex items-center gap-3 mr-4">
    //         <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isOnline ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400' : 'border-red-500/20 bg-red-500/10 text-red-500 dark:text-red-400'}`}>
    //           <Wifi className="w-3.5 h-3.5" />
    //           <span className="text-[0.65rem] font-bold tracking-widest">{isOnline ? 'WEB ONLINE' : 'WEB OFFLINE'}</span>
    //         </div>
    //         <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
    //           <Server className="w-3.5 h-3.5" />
    //           <span className="text-[0.65rem] font-bold tracking-widest">SERVER ONLINE</span>
    //         </div>
    //       </div>

    //       {/* User Info */}
    //       <div className="flex items-center gap-3">
    //         <div className="flex flex-col text-right">
    //           <span className="font-bold text-sm leading-tight text-slate-900 dark:text-white transition-colors duration-300">{user?.username}</span>
    //           {canProfile ? (
    //             <button onClick={() => navigate('/profile')} className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors duration-300">View Profile</button>
    //           ) : (
    //             <span className="text-slate-500 dark:text-white/30 text-xs font-semibold transition-colors duration-300">Cashier</span>
    //           )}
    //         </div>
    //         <button 
    //           onClick={() => canProfile ? navigate('/profile') : null}
    //           disabled={!canProfile}
    //           className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors touch-manipulation ${canProfile ? 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95' : 'bg-slate-100 dark:bg-white/5 opacity-50 cursor-not-allowed'}`}
    //         >
    //           <User className="w-5 h-5 text-slate-600 dark:text-gray-300 transition-colors duration-300" />
    //         </button>
    //       </div>

    //       <div className="w-px h-8 bg-slate-200 dark:bg-white/10 mx-1 transition-colors duration-300" />

    //       {/* Actions */}
    //       <div className="flex items-center gap-2">
    //         <button onClick={toggleTheme} className="w-11 h-11 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center transition-colors active:scale-95 touch-manipulation">
    //           {isDarkMode ? <Sun className="w-5 h-5 text-gray-300" /> : <Moon className="w-5 h-5 text-slate-600" />}
    //         </button>
    //         <button onClick={toggleFullScreen} className="w-11 h-11 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center transition-colors active:scale-95 touch-manipulation">
    //           <Maximize className="w-5 h-5 text-slate-600 dark:text-gray-300 transition-colors duration-300" />
    //         </button>
    //         <button onClick={handleLogout} className="w-11 h-11 rounded-full bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 flex items-center justify-center transition-colors active:scale-95 touch-manipulation">
    //           <LogOut className="w-5 h-5 text-red-600 dark:text-red-400 transition-colors duration-300" />
    //         </button>
    //       </div>
    //     </div>
    //   </header>

    //    {/* Main Content - Centered */}
    //       <main className="flex flex-1 items-center justify-center py-6 sm:py-10">
    //         <div className="w-full max-w-5xl">
    //           {/* Date and Time Header */}
    //           <div className="mb-8 sm:mb-12 text-center">
    //             <h1 className="text-5xl font-light tabular-nums tracking-tighter text-white drop-shadow-lg sm:text-7xl md:text-8xl">
    //               {formattedTime}
    //             </h1>
    //             <p className="mt-2 sm:mt-4 text-sm font-medium uppercase tracking-[0.15em] sm:tracking-[0.2em] text-white/60 sm:text-lg md:text-xl">
    //               {formattedDate}
    //             </p>
    //           </div>

    //           {/* Tiles Grid */}
    //           <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-4 md:gap-8">
    //             {tiles.map((t) => (
    //               <PosTile key={t.id} tile={t} />
    //             ))}
    //           </div>
    //         </div>
    //       </main>

    //   {/* Bottom Bar */}
    //   <footer className="absolute bottom-6 left-6 right-6 p-4 px-6 rounded-full bg-white/80 dark:bg-[#15111d]/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 flex justify-between items-center shadow-lg dark:shadow-xl z-20 transition-colors duration-300">
    //     <div className="flex items-center gap-4">
    //       <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center shadow-sm dark:shadow-inner transition-colors duration-300">
    //         <Phone className="w-5 h-5 text-slate-600 dark:text-gray-400 transition-colors duration-300" />
    //       </div>
    //       <div className="flex flex-col">
    //         <span className="text-slate-900 dark:text-white font-bold text-sm tracking-wide transition-colors duration-300">Customer Service</span>
    //         <span className="text-slate-500 dark:text-gray-500 text-xs font-semibold mt-0.5 transition-colors duration-300">Golden Soft POS • Standard Edition</span>
    //       </div>
    //     </div>

    //     <div className="flex items-center gap-5">
    //       <div className="flex flex-col text-right">
    //         <span className="text-slate-900 dark:text-white font-bold text-sm tracking-wide transition-colors duration-300">{user?.username ? `${user.username} Branch` : 'Aspero Giza'}</span>
    //         <span className="text-slate-500 dark:text-gray-500 text-xs font-semibold mt-0.5 transition-colors duration-300">Active Branch</span>
    //       </div>
    //       <button 
    //         onClick={() => canSettings ? navigate('/settings') : null} 
    //         disabled={!canSettings}
    //         className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors touch-manipulation shadow-sm dark:shadow-inner ${canSettings ? 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95' : 'bg-slate-100 dark:bg-white/5 opacity-50 cursor-not-allowed'}`}
    //       >
    //         <Settings className="w-5 h-5 text-slate-600 dark:text-gray-400 transition-colors duration-300" />
    //       </button>
    //     </div>
    //   </footer>
    // </div>
  );
}
