import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { 
  RotateCcw, 
  Home, 
  Copy, 
  Sparkles,
  ShieldCheck,
  Terminal,
  Settings,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface RootErrorBoundaryProps {
  error?: any;
}

export function RootErrorBoundary({ error: propsError }: RootErrorBoundaryProps) {
  const navigate = useNavigate();
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Retrieve route error if no error was passed as a prop
  let routeError: any = null;
  try {
    // eslint-disable-next-line react-hooks-rules-of-hooks
    routeError = useRouteError();
  } catch (e) {
    // Fallback if rendered outside react-router context
  }

  const error = propsError ?? routeError;

  let errorTitle = "Application Error";
  let errorStatus = "";
  let errorMessage = "An unexpected error occurred inside the system.";
  let errorStack = "";

  if (error) {
    if (isRouteErrorResponse(error)) {
      errorTitle = `Navigation Error (${error.status})`;
      errorStatus = `${error.status} ${error.statusText}`;
      errorMessage = typeof error.data === 'string' 
        ? error.data 
        : (error.data?.message || JSON.stringify(error.data) || "Route not found or failed to load data.");
    } else if (error instanceof Error) {
      errorTitle = error.name || "Runtime Exception";
      errorMessage = error.message;
      errorStack = error.stack || "";
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = error.message || JSON.stringify(error);
    } else {
      errorMessage = String(error);
    }
  }

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate("/");
  };

  const handleCopyDetails = () => {
    const details = `Title: ${errorTitle}
Status: ${errorStatus}
Message: ${errorMessage}
Stack: ${errorStack || 'N/A'}`;
    
    navigator.clipboard.writeText(details)
      .then(() => {
        toast.success("Diagnostics details copied to clipboard!");
      })
      .catch(() => {
        toast.error("Failed to copy details.");
      });
  };

  const handleResetCache = async () => {
    if (confirm("Are you sure you want to clear local storage and reset the app? You may need to log in again.")) {
      try {
        await fetch(import.meta.env.VITE_API_BASE_URL + '/auth/logout', { method: 'POST', credentials: 'include' });
      } catch (e) {
        // ignore
      }
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 select-none font-outfit">
      {/* Premium background styling */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-brand-200/20 dark:bg-brand-900/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-success-200/20 dark:bg-success-900/10 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-lg bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 sm:gap-7 text-center">
        
        {/* Soft, non-scary visual element (floating sparkles/coffee) */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-md">
            <Sparkles className="w-10 h-10 animate-[bounce_2s_infinite]" />
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
            Taking a quick breather!
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-zinc-400 font-medium max-w-sm mx-auto leading-relaxed">
            The app encountered a temporary glitch, but <strong className="text-slate-800 dark:text-zinc-200">your draft order and transaction data are safe</strong>. Let's get you back to order taking!
          </p>
        </div>

        {/* Action Buttons: Tall, friendly touch targets (h-16) with active scaling state */}
        <div className="flex flex-col gap-3.5">
          <button
            onClick={handleReload}
            className="h-16 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-600/15 active:scale-[0.97] active:brightness-95 transition-all duration-75 select-none cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            Resume Operations
          </button>

          <button
            onClick={handleGoHome}
            className="h-16 w-full rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-white font-bold text-base flex items-center justify-center gap-2.5 hover:bg-slate-50 dark:hover:bg-zinc-750 active:scale-[0.97] active:brightness-95 transition-all duration-75 select-none cursor-pointer"
          >
            <Home className="w-5 h-5" />
            Go to Main Screen
          </button>
        </div>

        {/* Offline & Security assurance badge */}
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 py-2.5 px-4 rounded-xl border border-emerald-100 dark:border-emerald-900/20">
          <ShieldCheck className="w-4 h-4" />
          Offline Sync Enabled & System Safeguarded
        </div>

        {/* Technician Section at bottom: subtle, unobtrusive, fully functional */}
        <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-4 flex flex-col gap-3 text-left">
          <div className="flex items-center justify-center">
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              {showDiagnostics ? "Hide Support Diagnostics" : "Support & Diagnostics"}
            </button>
          </div>

          {showDiagnostics && (
            <div className="w-full animate-[fadeIn_0.2s_ease-out] flex flex-col gap-3 pt-1">
              {/* Technician Info box */}
              <div className="bg-slate-100 dark:bg-zinc-800/50 border border-slate-200/50 dark:border-zinc-700/60 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    Diagnostics Logs
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyDetails}
                      className="h-8 px-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 font-semibold text-xs flex items-center gap-1 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                    
                    <button
                      onClick={handleResetCache}
                      className="h-8 px-2.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/10 font-semibold text-xs flex items-center gap-1 hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Reset App
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-500 dark:text-zinc-400">Class:</span>
                    <span className="font-mono text-red-600 dark:text-red-400 font-bold select-text break-all">{errorTitle}</span>
                  </div>
                  {errorStatus && (
                    <div className="flex gap-2">
                      <span className="font-bold text-slate-500 dark:text-zinc-400">Status:</span>
                      <span className="font-mono text-slate-700 dark:text-zinc-300 select-text">{errorStatus}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-500 dark:text-zinc-400">Message:</span>
                    <span className="font-mono text-slate-700 dark:text-zinc-300 select-text break-words">{errorMessage}</span>
                  </div>
                </div>

                {/* Technical Stack Trace console */}
                <div className="w-full max-h-36 bg-slate-950 text-emerald-400 p-3 rounded-xl overflow-auto text-[10px] font-mono border border-slate-800 select-text leading-relaxed">
                  {errorStack ? (
                    <pre className="whitespace-pre-wrap">{errorStack}</pre>
                  ) : (
                    <div>
                      <span className="text-zinc-500">// No trace available, raw error details:</span>
                      <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(error, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
