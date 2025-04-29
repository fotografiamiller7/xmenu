import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import StorePage from './pages/Store';
import Checkout from './pages/Checkout';
import Admin from './pages/Admin';
import OrderDetails from './pages/OrderDetails';
import Home from './pages/Home';
import { CartProvider } from './contexts/CartContext';
import { supabase } from './lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);

      if (session && adminOnly) {
        const { data: userData, error: userDataError } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', session.user.id)
          .maybeSingle();

        if (userDataError) {
          console.error('Error fetching user data:', userDataError);
          setIsAdmin(false);
          return;
        }

        setIsAdmin(userData?.email === 'admin@admin.com');
      }
    };

    checkAuth();
  }, [adminOnly]);

  if (isAuthenticated === null || (adminOnly && isAdmin === null)) {
    return null; // Loading state
  }

  if (!isAuthenticated || (adminOnly && !isAdmin)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <CartProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/pedidos/:storeName" element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          } />
          <Route path="/store/:storeName" element={<StorePage />} />
          <Route path="/checkout/:storeName" element={<Checkout />} />
          <Route path="/admin" element={
            <ProtectedRoute adminOnly>
              <Admin />
            </ProtectedRoute>
          } />
          <Route path="/checkout/pedidos/:orderId" element={<OrderDetails />} />
        </Routes>
      </Router>
    </CartProvider>
  );
}

export default App;