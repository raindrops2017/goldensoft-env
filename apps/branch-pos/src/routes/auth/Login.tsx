import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  type UserPinLogin,
  type LoginResponse,
  type ActiveUser,
} from "@goldensoft/core-schemas";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/useAuthStore";
import { PinPad } from "../../components/auth/PinPad";
import { EmployeeGrid } from "../../components/auth/EmployeeGrid";
import { Sun, Moon, Maximize, Minimize } from "lucide-react";
import { useThemeStore } from "../../store/useThemeStore";
import { useFullscreenStore } from "../../store/useFullscreenStore";

type LoginStep = "select-user" | "enter-pin";

export function LoginRoute() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const user = useAuthStore((state) => state.user);
  const [step, setStep] = useState<LoginStep>("select-user");
  const [selectedUser, setSelectedUser] = useState<ActiveUser | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { isDarkMode, toggleTheme } = useThemeStore();
  const { isFullscreen, toggleFullscreen } = useFullscreenStore();

  const loginMutation = useMutation({
    mutationFn: async (credentials: UserPinLogin) => {
      const response = await api.post<LoginResponse>(
        "/auth/login",
        credentials,
      );
      if (!response.data.success) {
        throw new Error(response.data.error || "Login failed");
      }
      return response.data.data;
    },
    onSuccess: (data) => {
      if (data.user) {
        setAuth(data.accessToken, data.user);
        navigate("/");
      } else {
        setLoginError("User data not received from server");
      }
    },
    onError: (error: any) => {
      setLoginError(
        error.response?.data?.error ||
          error.message ||
          "An unexpected error occurred",
      );
    },
  });

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleUserSelect = (user: ActiveUser) => {
    setSelectedUser(user);
    setLoginError(null);
    setStep("enter-pin");
  };

  const handlePinSubmit = (pin: string) => {
    if (!selectedUser) return;
    setLoginError(null);
    loginMutation.mutate({ userId: selectedUser.id, pin });
  };

  const handleBack = () => {
    setStep("select-user");
    setSelectedUser(null);
    setLoginError(null);
    loginMutation.reset();
  };

  return (
    <div className="h-screen w-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex overflow-hidden select-none transition-colors duration-200 font-outfit">
      {/* SaaS Split Screen Layout */}
      <div className="flex w-full h-full">
        {/* LEFT HALF: Branding & Ambient Background (Hidden on Mobile) */}
        <div className="hidden md:flex md:w-1/3 h-full relative flex-col justify-between p-10 text-white select-none">
          {/* Background Image with blur cover */}
          <div
            className="absolute inset-0 bg-cover bg-center z-0"
            style={{ backgroundImage: 'url("/images/login-bg.jpg")' }}
          />
          {/* Dark Glassy Overlay for text legibility */}
          <div className="absolute inset-0 bg-slate-950/65 dark:bg-slate-950/75 z-10" />

          {/* Branding Content */}
          <div className="relative z-20 flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 border border-white/20 backdrop-blur-md">
              <img
                src="/images/logo/GSLOGO-icon.svg"
                alt="Golden Soft Logo"
                className="w-6 h-6 invert dark:invert-0"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight leading-tight">
                Golden Soft
              </span>
              <span className="text-[10px] text-white/60 font-semibold tracking-widest uppercase font-mono">
                Branch POS Terminal
              </span>
            </div>
          </div>

          <div className="relative z-20 max-w-md my-auto">
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
              Gastronomy meets efficiency.
            </h1>
            <p className="text-white/70 text-sm mt-3 leading-relaxed">
              Unlock the local terminal node to coordinate shifts, manage
              tables, transmit tickets, and process customer receipts instantly.
            </p>
          </div>

          {/* Operational Signatures */}
          <div className="relative z-20 flex items-center justify-between text-xs text-white/50 border-t border-white/10 pt-4 font-mono uppercase tracking-wider">
            <span>Branch Connected</span>
            <span>Cairo, Egypt Local</span>
          </div>
        </div>

        {/* RIGHT HALF: Interactive Sign-in Desk */}
        <div className="w-full md:w-2/3 h-full bg-white dark:bg-slate-900 flex flex-col justify-center items-center p-6 sm:p-12 relative overflow-hidden transition-colors duration-200">
          {/* Top Right Floating Theme/Fullscreen Switchers */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-800 dark:hover:text-slate-250 transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              aria-label="Toggle fullscreen"
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-800 dark:hover:text-slate-250 transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          {/* Centered Panel Content Box */}
          <div className="w-full flex flex-col h-full justify-between relative z-10">
            {/* Header Banner - Hidden when Numpad/PIN steps in */}
            {step === "select-user" && (
              <div className="flex flex-col shrink-0 text-center sm:text-left mb-6 transition-all duration-200">
                <div className="flex md:hidden items-center justify-center gap-3 mb-4">
                  <img
                    src="/images/logo/GSLOGO-icon.svg"
                    alt="Golden Soft Logo"
                    className="w-8 h-8"
                  />
                  <div className="flex flex-col text-left">
                    <span className="text-base font-extrabold text-slate-900 dark:text-white leading-none">
                      Golden Soft
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase font-mono mt-0.5">
                      Terminal
                    </span>
                  </div>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Operator Sign In
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  Select your profile from the roster to enter authorization
                  code.
                </p>
              </div>
            )}

            {/* Portal Body Slot */}
            <div className="flex-1 flex flex-col min-h-0 relative justify-center">
              {step === "select-user" ? (
                <div className="flex flex-col h-full min-h-0 animate-in fade-in duration-150">
                  <div className="flex-1 min-h-0">
                    <EmployeeGrid
                      selectedUser={selectedUser}
                      onSelect={handleUserSelect}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full min-h-0 animate-in fade-in slide-in-from-right-4 duration-150">
                  <PinPad
                    selectedUser={selectedUser}
                    onSubmit={handlePinSubmit}
                    onBack={handleBack}
                    isLoading={loginMutation.isPending}
                    error={loginError}
                  />
                </div>
              )}
            </div>

            {/* Server Status Badge - Hidden when Numpad/PIN steps in */}
            {step === "select-user" && (
              <div className="shrink-0 flex items-center justify-center md:justify-start gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6 transition-all duration-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider font-mono">
                  LAN Node Active &bull; Connection Encrypted
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
