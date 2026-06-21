import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '@goldensoft/core-schemas';
import { 
  ConciergeBell,
  ShoppingBasket,
  Truck,
  BarChart3,
  Wifi,
  Server,
  User,
  Maximize,
  LogOut,
  Phone,
  Settings,
  Sun,
  Moon
} from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';

function PosTile({ 
  label, 
  icon: Icon, 
  gradientColors, 
  shadowColor, 
  glowColor, 
  disabled, 
  onClick 
}: { 
  label: string; 
  icon: any; 
  gradientColors: string; 
  shadowColor: string; 
  glowColor: string;
  disabled: boolean; 
  onClick: () => void; 
}) {
  const baseClass = "group relative w-[13.5rem] h-[15.5rem] rounded-[2.5rem] border flex flex-col items-center justify-center gap-7 overflow-hidden touch-manipulation transition-all duration-300";
  
  if (disabled) {
    return (
      <button 
        disabled
        className={`${baseClass} bg-slate-100/40 dark:bg-[#14101c]/40 border-slate-200/50 dark:border-white/5 opacity-60 dark:opacity-40 cursor-not-allowed`}
      >
        <div className="relative">
          <div className={`relative w-[5.5rem] h-[5.5rem] rounded-[1.8rem] flex items-center justify-center bg-gradient-to-br ${gradientColors} shadow-xl ${shadowColor} grayscale`}>
            <Icon className="w-10 h-10 text-white/70" />
          </div>
        </div>
        <span className="text-xl font-bold text-slate-500 dark:text-white/70 tracking-wide z-10 transition-colors duration-300">{label}</span>
      </button>
    );
  }

  return (
    <button 
      onClick={onClick}
      className={`${baseClass} bg-white/80 dark:bg-[#14101c]/80 backdrop-blur-sm border-slate-200 dark:border-white/5 active:scale-95 hover:bg-slate-50 dark:hover:bg-[#1a1525] shadow-sm dark:shadow-none`}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/[0.03] dark:from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-105">
        <div className={`absolute inset-0 blur-2xl opacity-40 ${glowColor} group-hover:opacity-60 transition-opacity`} />
        <div className={`relative w-[5.5rem] h-[5.5rem] rounded-[1.8rem] flex items-center justify-center bg-gradient-to-br ${gradientColors} shadow-xl ${shadowColor}`}>
          <Icon className="w-10 h-10 text-white" />
        </div>
      </div>
      <span className="text-xl font-bold text-slate-800 dark:text-white tracking-wide z-10 transition-colors duration-300">{label}</span>
    </button>
  );
}

export function PosTabletHome() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const { hasPermission: can } = usePermissions();
  
  const [time, setTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const { isDarkMode, toggleTheme } = useThemeStore();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(time);

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).format(time).toUpperCase();

  // RBAC Checks using strictly typed PERMISSIONS object
  const canDineIn = can(PERMISSIONS.DINING_OPEN);
  const canTakeaway = can(PERMISSIONS.TAKEAWAY_OPEN);
  const canDelivery = can(PERMISSIONS.DELIVERY_OPEN);
  const canReports = can(PERMISSIONS.REPORTS_TODAY_VIEW) || can(PERMISSIONS.REPORTS_PERIOD_VIEW);
  
  // Note: Profile and Settings don't have dedicated permissions in core-schemas yet, 
  // so we'll default them to true for now or you can define them in the schema!
  const canProfile = true; 
  const canSettings = true;

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#0a0710] bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-[#1c122b] dark:via-[#0d0914] dark:to-[#0a0710] text-slate-900 dark:text-white select-none overflow-hidden touch-manipulation flex flex-col font-sans transition-colors duration-300">
      
      {/* Top Bar */}
      <header className="m-6 p-3 px-4 rounded-full bg-white/80 dark:bg-[#15111d]/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 flex justify-between items-center shadow-lg dark:shadow-xl z-20 transition-colors duration-300">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <img 
            src="/images/logo/GSLOGO-icon.svg" 
            alt="Golden Soft Logo" 
            className="w-12 h-12 object-contain"
          />
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight tracking-wide text-slate-900 dark:text-white transition-colors duration-300">Golden Soft</span>
            <span className="text-slate-500 dark:text-gray-400 text-[0.65rem] font-bold tracking-[0.2em] transition-colors duration-300">POINT OF SALE</span>
          </div>
        </div>

        {/* Right: Status & User */}
        <div className="flex items-center gap-5">
          {/* Status Badges */}
          <div className="flex items-center gap-3 mr-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isOnline ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400' : 'border-red-500/20 bg-red-500/10 text-red-500 dark:text-red-400'}`}>
              <Wifi className="w-3.5 h-3.5" />
              <span className="text-[0.65rem] font-bold tracking-widest">{isOnline ? 'WEB ONLINE' : 'WEB OFFLINE'}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
              <Server className="w-3.5 h-3.5" />
              <span className="text-[0.65rem] font-bold tracking-widest">SERVER ONLINE</span>
            </div>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="font-bold text-sm leading-tight text-slate-900 dark:text-white transition-colors duration-300">{user?.username}</span>
              {canProfile ? (
                <button onClick={() => navigate('/profile')} className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors duration-300">View Profile</button>
              ) : (
                <span className="text-slate-500 dark:text-white/30 text-xs font-semibold transition-colors duration-300">Cashier</span>
              )}
            </div>
            <button 
              onClick={() => canProfile ? navigate('/profile') : null}
              disabled={!canProfile}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors touch-manipulation ${canProfile ? 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95' : 'bg-slate-100 dark:bg-white/5 opacity-50 cursor-not-allowed'}`}
            >
              <User className="w-5 h-5 text-slate-600 dark:text-gray-300 transition-colors duration-300" />
            </button>
          </div>

          <div className="w-px h-8 bg-slate-200 dark:bg-white/10 mx-1 transition-colors duration-300" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="w-11 h-11 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center transition-colors active:scale-95 touch-manipulation">
              {isDarkMode ? <Sun className="w-5 h-5 text-gray-300" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>
            <button onClick={toggleFullScreen} className="w-11 h-11 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center transition-colors active:scale-95 touch-manipulation">
              <Maximize className="w-5 h-5 text-slate-600 dark:text-gray-300 transition-colors duration-300" />
            </button>
            <button onClick={handleLogout} className="w-11 h-11 rounded-full bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 flex items-center justify-center transition-colors active:scale-95 touch-manipulation">
              <LogOut className="w-5 h-5 text-red-600 dark:text-red-400 transition-colors duration-300" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center pb-24 z-10">
        {/* Time and Date */}
        <div className="flex flex-col items-center mb-16 mt-[-4rem]">
          <h1 className="text-[7rem] font-light tracking-tight leading-none text-slate-800 dark:text-white/90 drop-shadow-sm dark:drop-shadow-2xl transition-colors duration-300">
            {formattedTime}
          </h1>
          <p className="text-slate-500 dark:text-gray-400/80 text-sm font-bold tracking-[0.4em] mt-4 ml-2 transition-colors duration-300">
            {formattedDate}
          </p>
        </div>

        {/* Tiles */}
        <div className="flex items-center justify-center gap-6">
          <PosTile 
            label="Dine In"
            icon={ConciergeBell}
            gradientColors="from-cyan-400 to-blue-600"
            shadowColor="shadow-blue-900/50"
            glowColor="bg-blue-500"
            disabled={!canDineIn}
            onClick={() => navigate('/dine-in')}
          />
          <PosTile 
            label="Takeaway"
            icon={ShoppingBasket}
            gradientColors="from-orange-400 to-rose-600"
            shadowColor="shadow-rose-900/50"
            glowColor="bg-orange-500"
            disabled={!canTakeaway}
            onClick={() => navigate('/order')}
          />
          <PosTile 
            label="Delivery"
            icon={Truck}
            gradientColors="from-fuchsia-400 to-purple-600"
            shadowColor="shadow-purple-900/50"
            glowColor="bg-fuchsia-500"
            disabled={!canDelivery}
            onClick={() => navigate('/order')}
          />
          <PosTile 
            label="Reports"
            icon={BarChart3}
            gradientColors="from-teal-400 to-emerald-600"
            shadowColor="shadow-emerald-900/50"
            glowColor="bg-teal-500"
            disabled={!canReports}
            onClick={() => navigate('/reports')}
          />
        </div>
      </main>

      {/* Bottom Bar */}
      <footer className="absolute bottom-6 left-6 right-6 p-4 px-6 rounded-full bg-white/80 dark:bg-[#15111d]/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 flex justify-between items-center shadow-lg dark:shadow-xl z-20 transition-colors duration-300">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center shadow-sm dark:shadow-inner transition-colors duration-300">
            <Phone className="w-5 h-5 text-slate-600 dark:text-gray-400 transition-colors duration-300" />
          </div>
          <div className="flex flex-col">
            <span className="text-slate-900 dark:text-white font-bold text-sm tracking-wide transition-colors duration-300">Customer Service</span>
            <span className="text-slate-500 dark:text-gray-500 text-xs font-semibold mt-0.5 transition-colors duration-300">Golden Soft POS • Standard Edition</span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex flex-col text-right">
            <span className="text-slate-900 dark:text-white font-bold text-sm tracking-wide transition-colors duration-300">{user?.username ? `${user.username} Branch` : 'Aspero Giza'}</span>
            <span className="text-slate-500 dark:text-gray-500 text-xs font-semibold mt-0.5 transition-colors duration-300">Active Branch</span>
          </div>
          <button 
            onClick={() => canSettings ? navigate('/settings') : null} 
            disabled={!canSettings}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors touch-manipulation shadow-sm dark:shadow-inner ${canSettings ? 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95' : 'bg-slate-100 dark:bg-white/5 opacity-50 cursor-not-allowed'}`}
          >
            <Settings className="w-5 h-5 text-slate-600 dark:text-gray-400 transition-colors duration-300" />
          </button>
        </div>
      </footer>
    </div>
  );
}
