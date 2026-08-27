import React from 'react';
import { Smartphone, CreditCard, Landmark, Check } from 'lucide-react';

export const PAYMENT_METHODS = [
  {
    id: 'UPI',
    label: 'UPI',
    description: 'Pay using a simulated UPI flow',
    icon: Smartphone
  },
  {
    id: 'CARD',
    label: 'Card',
    description: 'Pay using a simulated card flow',
    icon: CreditCard
  },
  {
    id: 'NET_BANKING',
    label: 'Net Banking',
    description: 'Pay using a simulated banking flow',
    icon: Landmark
  }
];

export function PaymentMethodSelector({ selectedMethod, onSelectMethod }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <span>Choose Payment Method</span>
        </h2>
        <span className="text-xs text-slate-400">
          Simulated choices
        </span>
      </div>

      <div 
        role="radiogroup" 
        aria-label="Choose Payment Method"
        className="space-y-3"
      >
        {PAYMENT_METHODS.map((method) => {
          const isSelected = selectedMethod === method.id;
          const Icon = method.icon;

          return (
            <div
              key={method.id}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onSelectMethod(method.id)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  onSelectMethod(method.id);
                }
              }}
              className={`
                relative flex items-center justify-between p-4 sm:p-5 rounded-xl border transition-all duration-200 cursor-pointer select-none
                focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900
                ${isSelected 
                  ? 'border-cyan-500 bg-cyan-950/40 shadow-lg shadow-cyan-950/30' 
                  : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60'
                }
              `}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Radio Circle Indicator */}
                <div className={`
                  h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-colors
                  ${isSelected ? 'border-cyan-400 bg-cyan-500' : 'border-slate-600 bg-slate-900'}
                `}>
                  {isSelected && (
                    <div className="h-2 w-2 rounded-full bg-slate-950" />
                  )}
                </div>

                {/* Method Icon Badge */}
                <div className={`
                  h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border transition-colors
                  ${isSelected ? 'border-cyan-500/50 bg-cyan-900/50 text-cyan-300' : 'border-slate-800 bg-slate-900 text-slate-400'}
                `}>
                  <Icon className="h-5 w-5" />
                </div>

                {/* Method Details */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm sm:text-base text-white tracking-tight">
                      {method.label}
                    </span>
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-800/60">
                        <Check className="h-2.5 w-2.5" /> Selected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {method.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
