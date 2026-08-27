import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Loader2, 
  Clock, 
  CreditCard, 
  BookOpen, 
  ShieldCheck, 
  ArrowLeft, 
  Sparkles,
  Smartphone,
  Landmark,
  Info
} from 'lucide-react';

const METHOD_LABELS = {
  UPI: 'UPI',
  CARD: 'Card',
  NET_BANKING: 'Net Banking'
};

export function PaymentProcessing({ 
  status = 'PROCESSING', // 'PROCESSING' | 'WAITING_FOR_RESULT'
  formattedAmount = '₹2,000',
  currency = 'INR',
  paymentMethod = 'UPI',
  attemptId,
  productName = 'AI & Full-Stack Development Program',
  paymentOutcome = null,
  paymentResultEvent = null,
  onReturnPortal
}) {
  const navigate = useNavigate();

  const handleReturn = () => {
    if (onReturnPortal) {
      onReturnPortal();
    } else {
      navigate('/customer');
    }
  };

  const methodLabel = METHOD_LABELS[paymentMethod] || paymentMethod;

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 animate-fadeIn">
      
      {/* Container Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl text-center space-y-8 relative overflow-hidden">
        
        {/* Decorative background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* 1. Active Processing State UI */}
        {status === 'PROCESSING' && (
          <div className="space-y-6 relative z-10">
            {/* Animated Loading Spinner */}
            <div className="relative inline-flex items-center justify-center">
              <div className="h-20 w-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Loader2 className="h-10 w-10 animate-spin" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500"></span>
              </span>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                <Sparkles className="h-3.5 w-3.5" />
                Simulated Payment Gateway
              </span>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Processing payment...
              </h2>

              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                Please wait while we process your payment. Do not close or refresh this page.
              </p>
            </div>
          </div>
        )}

        {/* 2. Neutral Waiting State UI */}
        {status === 'WAITING_FOR_RESULT' && (
          <div className="space-y-6 relative z-10">
            {/* Waiting Pulse Hourglass / Clock Icon */}
            <div className="relative inline-flex items-center justify-center">
              <div className="h-20 w-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Clock className="h-10 w-10 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/60">
                <Clock className="h-3.5 w-3.5" />
                Awaiting Outcome
              </span>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Payment attempt received.
              </h2>

              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                Waiting for payment result...
              </p>
            </div>
          </div>
        )}

        {/* Payment Metadata Display Box */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5 text-left space-y-3 relative z-10">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-cyan-400" />
              Program
            </span>
            <span className="text-xs font-medium text-white truncate max-w-[200px]">
              {productName}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Payment Amount</span>
            <span className="text-base font-bold text-white tracking-tight">
              {formattedAmount} <span className="text-xs font-normal text-slate-400">{currency}</span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Payment Method</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-900 text-cyan-400 border border-slate-800">
              {paymentMethod === 'UPI' && <Smartphone className="h-3 w-3" />}
              {paymentMethod === 'CARD' && <CreditCard className="h-3 w-3" />}
              {paymentMethod === 'NET_BANKING' && <Landmark className="h-3 w-3" />}
              {methodLabel}
            </span>
          </div>

          {attemptId && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
              <span className="text-[11px] text-slate-500">Attempt ID</span>
              <span className="text-[11px] font-mono text-cyan-400 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
                {attemptId}
              </span>
            </div>
          )}
        </div>

        {/* Outcome Simulator Notice Banner */}
        {status === 'WAITING_FOR_RESULT' && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-left flex items-start gap-3 relative z-10">
            <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-amber-300">Simulation Status</p>
              <p className="text-slate-400">
                Your payment attempt is queued. The payment outcome engine and autonomous recovery simulator will be connected in upcoming milestones.
              </p>
            </div>
          </div>
        )}

        {/* Action Button for WAITING_FOR_RESULT */}
        {status === 'WAITING_FOR_RESULT' && (
          <div className="pt-2 relative z-10">
            <button
              type="button"
              onClick={handleReturn}
              className="w-full px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold transition-all inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 text-cyan-400" />
              <span>Return to Customer Portal</span>
            </button>
          </div>
        )}

        {/* Safety Notice */}
        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5 relative z-10">
          <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
          <span>Simulated Environment — No financial transaction or payment provider contacted.</span>
        </div>

      </div>

    </div>
  );
}
