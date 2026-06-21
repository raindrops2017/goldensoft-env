import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginRoute } from './routes/auth/Login';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PosTabletHome } from './routes/pos/PosTabletHome';
import { FloorPlan } from './routes/pos/din-in/FloorPlan';
import { TableOrderMock } from './pages/TableOrderMock';
import { useThemeStore } from './store/useThemeStore';
import { useEffect } from 'react';

const queryClient = new QueryClient();

const routes = createBrowserRouter([
  {
    path: "",
    element: <ProtectedRoute />,
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
        path: "/table/:id",
        element: <TableOrderMock />
      }
    ]
  },
  {
    path: "/login",
    element: <LoginRoute />
  }
])

function App() {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);

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

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={routes} />
    </QueryClientProvider>
  );
}

export default App;
