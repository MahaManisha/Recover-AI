import React from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PurchaseSummary } from '../components/customer/PurchaseSummary';

export function Checkout() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex flex-col items-center justify-center p-6 text-slate-400">
        <Loader2 className="h-8 w-8 text-cyan-400 animate-spin mb-3" />
        <p className="text-xs font-semibold uppercase tracking-wider">Loading Checkout Summary...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 sm:p-6 md:p-8">
      <PurchaseSummary />
    </div>
  );
}
