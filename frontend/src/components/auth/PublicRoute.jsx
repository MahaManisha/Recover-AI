import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

export function PublicRoute({ children }) {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex flex-col items-center justify-center p-6 text-slate-400">
        <Loader2 className="h-8 w-8 text-cyan-400 animate-spin mb-3" />
        <p className="text-xs font-semibold uppercase tracking-wider">Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    if (role === 'CUSTOMER') {
      return <Navigate to="/customer" replace />;
    }
    if (role === 'MERCHANT') {
      return <Navigate to="/merchant" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
}
