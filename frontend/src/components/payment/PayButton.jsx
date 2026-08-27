import React from 'react';
import { Loader2, Lock, ArrowRight } from 'lucide-react';

export function PayButton({ 
  formattedAmount = '₹2,000', 
  disabled = false, 
  loading = false, 
  onClick,
  ariaLabel 
}) {
  const isButtonDisabled = disabled || loading;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isButtonDisabled}
      aria-disabled={isButtonDisabled}
      aria-label={ariaLabel || `Pay ${formattedAmount}`}
      className={`
        w-full sm:w-auto px-7 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 
        flex items-center justify-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900
        ${isButtonDisabled
          ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60 shadow-none'
          : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-[0.98] cursor-pointer'
        }
      `}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 text-white animate-spin" />
          <span>Processing Attempt...</span>
        </>
      ) : (
        <>
          <Lock className="h-3.5 w-3.5 text-cyan-200" />
          <span>Pay {formattedAmount}</span>
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </button>
  );
}
