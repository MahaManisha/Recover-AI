import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ArrowLeft, ShieldAlert, Sparkles, Clock } from 'lucide-react';

export function PaymentPlaceholder() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      
      {/* Top Navigation Back Action */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/customer')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-xs sm:text-sm font-medium text-slate-300 hover:text-white border border-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          <ArrowLeft className="h-4 w-4 text-cyan-400" />
          <span>Back to Customer Portal</span>
        </button>
      </div>

      {/* Main Placeholder Container */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-8 sm:p-12 text-center shadow-xl space-y-6">
        
        <div className="relative inline-flex items-center justify-center">
          <div className="h-16 w-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <CreditCard className="h-8 w-8" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500"></span>
          </span>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/60 text-amber-400 border border-amber-800/60 mx-auto">
            <Clock className="h-3.5 w-3.5" />
            Milestone 2 Under Construction
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Payment Experience — Coming Soon
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            The simulated payment checkout, payment processing, transaction creation, and autonomous recovery flows will be activated in upcoming milestones.
          </p>
        </div>

        {/* Safety Banner */}
        <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-left flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Simulated Environment</p>
            <p>No real money, real payment gateways, or financial credentials will be used in RecoverAI.</p>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => navigate('/customer')}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-medium transition-all inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span>Return to Product Selection</span>
          </button>
        </div>

      </div>

    </div>
  );
}
