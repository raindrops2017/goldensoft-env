
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { LogOut } from 'lucide-react';

export function DashboardRoute() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Branch POS Dashboard</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-6 py-4 bg-secondary text-secondary-foreground rounded-2xl font-semibold transition-all active:scale-95"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </header>

      <main>
        <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Welcome back!</h2>
          <div className="space-y-2">
            <p className="text-muted-foreground">User ID: <span className="font-mono text-foreground">{user?.id}</span></p>
            <p className="text-muted-foreground">Role ID: <span className="font-mono text-foreground">{user?.roleId || 'None'}</span></p>
            <p className="text-muted-foreground">Permissions: <span className="font-mono text-foreground">{user?.permissions.join(', ') || 'None'}</span></p>
          </div>
        </div>
      </main>
    </div>
  );
}
