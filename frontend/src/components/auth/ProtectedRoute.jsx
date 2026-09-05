import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex flex-col items-center justify-center p-6 text-slate-400">
        <Loader2 className="h-8 w-8 text-cyan-400 animate-spin mb-3" />
        <p className="text-xs font-semibold uppercase tracking-wider">Verifying session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve requested return URL safely
    const returnTo = location.pathname !== '/' ? location.pathname : undefined;
    return (
      <Navigate 
        to="/login" 
        state={{ from: location, returnTo }} 
        replace 
      />
    );
  }

  if (requiredRole) {
    const reqRole = requiredRole.toUpperCase();
    const isAllowed = 
      role === reqRole || 
      (role === 'ADMIN' && (reqRole === 'MERCHANT' || reqRole === 'AGENT')) ||
      (role === 'MERCHANT' && reqRole === 'AGENT');

    if (!isAllowed) {
      // Unauthorized role -> redirect to user's default role area
      if (role === 'CUSTOMER') {
        return <Navigate to="/customer" replace />;
      }
      if (role === 'MERCHANT' || role === 'ADMIN') {
        return <Navigate to="/merchant" replace />;
      }
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
