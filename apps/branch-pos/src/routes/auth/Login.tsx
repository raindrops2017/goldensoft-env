import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { type PinLogin, type LoginResponse } from '@goldensoft/core-schemas';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { PinPad } from '../../components/auth/PinPad';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';

export function LoginRoute() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const user = useAuthStore((state) => state.user);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { isDarkMode, toggleTheme } = useThemeStore();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const loginMutation = useMutation({
    mutationFn: async (credentials: PinLogin) => {
      const response = await api.post<LoginResponse>('/auth/login', credentials);
      if (!response.data.success) {
        throw new Error(response.data.error || 'Login failed');
      }
      return response.data.data;
    },
    onSuccess: (data) => {
      if (data.user) {
        setAuth(data.accessToken, data.user);
        navigate('/');
      } else {
        setLoginError('User data not received from server');
      }
    },
    onError: (error: any) => {
      setLoginError(error.response?.data?.error || error.message || 'An unexpected error occurred');
    },
  });

  const handleSubmit = (data: PinLogin) => {
    setLoginError(null);
    loginMutation.mutate(data);
  };

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row overflow-hidden transition-colors duration-300">
      {/* Left Side: Art & Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-100 dark:bg-slate-900 items-center justify-center overflow-hidden transition-colors duration-300">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-80 dark:opacity-80 mix-blend-multiply dark:mix-blend-overlay transition-opacity duration-300"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1934&auto=format&fit=crop)' }}
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-100 via-slate-100/80 dark:from-slate-950 dark:via-slate-950/60 to-transparent transition-colors duration-300" />
        
        {/* Content */}
        <div className="relative z-10 p-12 text-center max-w-2xl">
          <img 
            src="/images/logo/GSLOGO-icon.svg" 
            alt="Golden Soft Logo" 
            className="w-24 h-24 object-contain mx-auto mb-8 drop-shadow-[0_0_40px_rgba(245,158,11,0.3)]"
          />
          <h1 className="text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tight transition-colors duration-300">Golden Soft</h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 font-medium leading-relaxed transition-colors duration-300">
            The next-generation, offline-first restaurant management system. 
            Built for speed, reliability, and seamless operations.
          </p>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 relative h-full">
        {/* Subtle decorative background blur for mobile */}
        <div className="absolute inset-0 lg:hidden overflow-hidden pointer-events-none">
           <div 
             className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-cover bg-center opacity-10 blur-xl" 
             style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1934&auto=format&fit=crop)' }} 
           />
           <div className="absolute inset-0 bg-slate-50/90 dark:bg-slate-950/80 transition-colors duration-300" />
        </div>
        
        <div className="w-full relative z-10">
          <div className="lg:hidden text-center mb-8 mt-8">
             <img 
                src="/images/logo/GSLOGO-icon.svg" 
                alt="Golden Soft Logo" 
                className="w-16 h-16 object-contain mx-auto mb-4 drop-shadow-lg"
             />
             <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight transition-colors duration-300">Golden Soft</h1>
          </div>
          
          <PinPad
            onSubmit={handleSubmit}
            isLoading={loginMutation.isPending}
            error={loginError}
          />
        </div>
      </div>

      {/* Dark Mode Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed bottom-6 right-6 w-14 h-14 bg-white dark:bg-boxdark rounded-full shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 transition-transform active:scale-95 focus:outline-none z-50 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
      </button>
    </div>
  );
}
