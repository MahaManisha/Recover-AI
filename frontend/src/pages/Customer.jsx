import React from 'react';
import { Cpu, Loader2, ShoppingBag, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CustomerProfileCard } from '../components/customer/CustomerProfileCard';
import { ProductCard } from '../components/customer/ProductCard';
import { DEMO_PRODUCT } from '../data/demoProduct';

export function Customer() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex flex-col items-center justify-center p-6 text-slate-400">
        <Loader2 className="h-8 w-8 text-cyan-400 animate-spin mb-3" />
        <p className="text-xs font-semibold uppercase tracking-wider">Loading Customer Portal...</p>
      </div>
    );
  }

  const customerName = user?.full_name ? user.full_name.split(' ')[0] : 'Customer';

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      
      {/* 1. Customer Portal Top Header & Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1">
            <Cpu className="h-4 w-4" />
            RecoverAI Customer Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Welcome back, {customerName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your account profile and browse available programs and services.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 self-start md:self-auto">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          <span>Secured by RecoverAI Agent Engine</span>
        </div>
      </div>

      {/* 2. Customer Profile Card */}
      <section aria-labelledby="profile-section-heading">
        <h2 id="profile-section-heading" className="sr-only">Customer Profile</h2>
        <CustomerProfileCard />
      </section>

      {/* 3. Available Product/Service Section */}
      <section aria-labelledby="product-section-heading" className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
          <div>
            <h2 id="product-section-heading" className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-cyan-400" />
              Choose what you'd like to purchase
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Select an available program or service to continue to purchase options.
            </p>
          </div>
        </div>

        {/* Render Product Card */}
        <ProductCard product={DEMO_PRODUCT} />
      </section>

    </div>
  );
}
