import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginRoute } from './routes/auth/Login';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { FloorPlan } from './routes/pos/din-in/FloorPlan';
import TableOrder from './routes/pos/din-in/TableOrder';
import TakeawayOrder from './routes/pos/takeaway/TakeawayOrder';
import DeliveryOrder from './routes/pos/delivery/DeliveryOrder';
import DeliveryDashboard from './routes/pos/delivery/DeliveryDashboard';
import DeliveryDispatch from './routes/pos/delivery/DeliveryDispatch';
import NewCustomerPage from './routes/pos/delivery/NewCustomerPage';
import { useThemeStore } from './store/useThemeStore';
import { useFullscreenStore } from './store/useFullscreenStore';
import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { LanSocketProvider } from './hooks/useLanSocket';
import { PosTabletHome } from './routes/pos/home/PosTabletHome';
import { RootErrorBoundary } from './components/error/RootErrorBoundary';

const queryClient = new QueryClient();

const routes = createBrowserRouter([
  {
    path: "",
    element: <ProtectedRoute />,
    errorElement: <RootErrorBoundary />,
    children: [
      {
        path: "/",
        element: <PosTabletHome />
      },
      {
        path: "/dine-in",
        element: <FloorPlan />
      },
      {
        path: "/table/:tableNo",
        element: <TableOrder />
      },
      {
        path: "/takeaway",
        element: <TakeawayOrder />
      },
      {
        path: "/delivery",
        element: <DeliveryDashboard />
      },
      {
        path: "/delivery/dispatch",
        element: <DeliveryDispatch />
      },
      {
        path: "/delivery/order",
        element: <DeliveryOrder />
      },
      {
        path: "/delivery/customer/new",
        element: <NewCustomerPage />
      }
    ]
  },
  {
    path: "/login",
    element: <LoginRoute />,
    errorElement: <RootErrorBoundary />
  }
])

function App() {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const setIsFullscreen = useFullscreenStore((state) => state.setIsFullscreen);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      // Sync body as well to ensure full compatibility with Tailwind v4 & Shadcn
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [setIsFullscreen]);

  return (
    <QueryClientProvider client={queryClient}>
      <LanSocketProvider>
        <RouterProvider router={routes} />
        <Toaster richColors />
      </LanSocketProvider>
    </QueryClientProvider>
  );
}

export default App;
