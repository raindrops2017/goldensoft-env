import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import PageMeta from "@/components/common/PageMeta";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import { usePermission } from "@/hooks/usePermission";
import {
  ConciergeBell,
  Database,
  LayoutDashboard,
  LogOut,
  Phone,
  Settings,
  ShoppingBasket,
  Truck,
  UserRound,
  Wifi,
  Maximize,
  Minimize,
} from "lucide-react";

type TileDef = {
  id: string;
  label: string;
  icon: React.ReactNode;
  to: string | null;
  disabledReason?: string;
  glowColor: string;
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

export default function PosTabletHome() {
  const { user, logout } = useAuth();
  const { selectedBranch, isOnline: branchServerOnline } = useBranch();
  const { can } = usePermission();
  const [now, setNow] = useState(() => new Date());
  const [browserOnline, setBrowserOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
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
      can("pos.home.dine_in") && can("orders.open_dining") ? "/dinning" : null;
    const take =
      can("pos.home.takeaway") && can("orders.open_takeaway")
        ? "/pos/takeaway"
        : null;
    const del =
      can("pos.home.delivery") && can("orders.open_delivery")
        ? "/pos/delivery"
        : null;
    const dashboard = can("dashboard.view") ? "/dashboard" : null;

    return [
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
          can("pos.home.dine_in"),
          can("orders.open_dining"),
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
          can("pos.home.takeaway"),
          can("orders.open_takeaway"),
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
          can("pos.home.delivery"),
          can("orders.open_delivery"),
          "delivery orders",
        ),
        glowColor: "from-purple-500/0 to-purple-500",
      },
      {
        id: "dashboard",
        label: "Dashboard",
        icon: (
          <GlowingIcon
            icon={LayoutDashboard}
            gradient="bg-gradient-to-br from-emerald-400 to-teal-600"
            shadow="bg-teal-500"
          />
        ),
        to: dashboard,
        disabledReason: can("dashboard.view")
          ? undefined
          : "No permission to open the analytics dashboard",
        glowColor: "from-teal-500/0 to-teal-500",
      },
    ];
  }, [can]);

  const handleLogout = useCallback(() => {
    void logout();
  }, [logout]);

  const venueName = selectedBranch?.name?.trim() || "Restaurant";
  const canProfile = can("pos.home.profile");
  const canSettings = can("pos.home.settings");

  return (
    <>
      <PageMeta title="Golden Soft POS | Home" description="POS tablet home" />
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
                  onClick={toggleFullscreen}
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
                  isOnline={branchServerOnline}
                  icon={Database}
                  label="Server"
                />
              </div>

              <div className="hidden h-8 w-px bg-white/10 md:block" />

              <div className="hidden items-center gap-3 md:flex">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-white">
                    {user?.name || "User"}
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
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
                  <UserRound className="size-5 text-white/80" />
                </div>
                <button
                  type="button"
                  onClick={toggleFullscreen}
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
                <p className="text-sm font-bold text-white">{venueName}</p>
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
      </div>
    </>
  );
}
