import React from 'react';
import { Smartphone, CreditCard, Landmark, AlertCircle } from 'lucide-react';

export const DEMO_BANKS = [
  { id: 'demo_bank', name: 'Demo Bank' },
  { id: 'national_demo_bank', name: 'National Demo Bank' },
  { id: 'secure_demo_bank', name: 'Secure Demo Bank' },
  { id: 'city_demo_bank', name: 'City Demo Bank' }
];

export function SimulatedPaymentForm({ selectedMethod, formData, errors, onChange }) {
  if (!selectedMethod) return null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 sm:p-6 space-y-5 animate-fadeIn">
      
      {/* Form Section Header */}
      <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedMethod === 'UPI' && <Smartphone className="h-4 w-4 text-cyan-400" />}
          {selectedMethod === 'CARD' && <CreditCard className="h-4 w-4 text-cyan-400" />}
          {selectedMethod === 'NET_BANKING' && <Landmark className="h-4 w-4 text-cyan-400" />}
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            {selectedMethod === 'UPI' && 'Simulated UPI Flow'}
            {selectedMethod === 'CARD' && 'Simulated Card Details'}
            {selectedMethod === 'NET_BANKING' && 'Simulated Net Banking'}
          </h3>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          Demo Inputs Only
        </span>
      </div>

      {/* 1. UPI Form */}
      {selectedMethod === 'UPI' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label 
              htmlFor="upiId" 
              className="block text-xs font-semibold text-slate-300"
            >
              UPI ID <span className="text-rose-400">*</span>
            </label>
            <input
              id="upiId"
              name="upiId"
              type="text"
              autoComplete="off"
              value={formData.upiId || ''}
              onChange={(e) => onChange('upiId', e.target.value)}
              placeholder="name@upi"
              aria-invalid={Boolean(errors.upiId)}
              aria-describedby={errors.upiId ? 'upiId-error' : undefined}
              className={`
                w-full px-4 py-2.5 rounded-xl bg-slate-900 border text-sm text-white placeholder-slate-500
                transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950
                ${errors.upiId ? 'border-rose-500/80 bg-rose-950/20' : 'border-slate-800 hover:border-slate-700'}
              `}
            />
            {errors.upiId ? (
              <p id="upiId-error" className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{errors.upiId}</span>
              </p>
            ) : (
              <p className="text-[11px] text-slate-500">
                Example: <code className="text-slate-400">alex@okaxis</code> or <code className="text-slate-400">user@bank</code>
              </p>
            )}
          </div>
        </div>
      )}

      {/* 2. Card Form */}
      {selectedMethod === 'CARD' && (
        <div className="space-y-4">
          
          {/* Card Number */}
          <div className="space-y-1.5">
            <label 
              htmlFor="cardNumber" 
              className="block text-xs font-semibold text-slate-300"
            >
              Card Number <span className="text-rose-400">*</span>
            </label>
            <input
              id="cardNumber"
              name="cardNumber"
              type="text"
              autoComplete="off"
              maxLength={19}
              value={formData.cardNumber || ''}
              onChange={(e) => {
                // Allow digits and spaces
                const raw = e.target.value.replace(/[^\d]/g, '');
                const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
                onChange('cardNumber', formatted);
              }}
              placeholder="0000 0000 0000 0000"
              aria-invalid={Boolean(errors.cardNumber)}
              aria-describedby={errors.cardNumber ? 'cardNumber-error' : undefined}
              className={`
                w-full px-4 py-2.5 rounded-xl bg-slate-900 border text-sm text-white placeholder-slate-500 font-mono tracking-wider
                transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950
                ${errors.cardNumber ? 'border-rose-500/80 bg-rose-950/20' : 'border-slate-800 hover:border-slate-700'}
              `}
            />
            {errors.cardNumber && (
              <p id="cardNumber-error" className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{errors.cardNumber}</span>
              </p>
            )}
          </div>

          {/* Cardholder Name */}
          <div className="space-y-1.5">
            <label 
              htmlFor="cardholderName" 
              className="block text-xs font-semibold text-slate-300"
            >
              Cardholder Name <span className="text-rose-400">*</span>
            </label>
            <input
              id="cardholderName"
              name="cardholderName"
              type="text"
              autoComplete="off"
              value={formData.cardholderName || ''}
              onChange={(e) => onChange('cardholderName', e.target.value)}
              placeholder="Demo User"
              aria-invalid={Boolean(errors.cardholderName)}
              aria-describedby={errors.cardholderName ? 'cardholderName-error' : undefined}
              className={`
                w-full px-4 py-2.5 rounded-xl bg-slate-900 border text-sm text-white placeholder-slate-500
                transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950
                ${errors.cardholderName ? 'border-rose-500/80 bg-rose-950/20' : 'border-slate-800 hover:border-slate-700'}
              `}
            />
            {errors.cardholderName && (
              <p id="cardholderName-error" className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{errors.cardholderName}</span>
              </p>
            )}
          </div>

          {/* Expiry & CVV Grid */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Expiry Date */}
            <div className="space-y-1.5">
              <label 
                htmlFor="expiryDate" 
                className="block text-xs font-semibold text-slate-300"
              >
                Expiry Date <span className="text-rose-400">*</span>
              </label>
              <input
                id="expiryDate"
                name="expiryDate"
                type="text"
                autoComplete="off"
                maxLength={5}
                value={formData.expiryDate || ''}
                onChange={(e) => {
                  let val = e.target.value.replace(/[^\d]/g, '');
                  if (val.length >= 3) {
                    val = `${val.slice(0, 2)}/${val.slice(2, 4)}`;
                  }
                  onChange('expiryDate', val);
                }}
                placeholder="MM/YY"
                aria-invalid={Boolean(errors.expiryDate)}
                aria-describedby={errors.expiryDate ? 'expiryDate-error' : undefined}
                className={`
                  w-full px-4 py-2.5 rounded-xl bg-slate-900 border text-sm text-white placeholder-slate-500 font-mono text-center
                  transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950
                  ${errors.expiryDate ? 'border-rose-500/80 bg-rose-950/20' : 'border-slate-800 hover:border-slate-700'}
                `}
              />
              {errors.expiryDate && (
                <p id="expiryDate-error" className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.expiryDate}</span>
                </p>
              )}
            </div>

            {/* CVV */}
            <div className="space-y-1.5">
              <label 
                htmlFor="cvv" 
                className="block text-xs font-semibold text-slate-300"
              >
                CVV <span className="text-rose-400">*</span>
              </label>
              <input
                id="cvv"
                name="cvv"
                type="password"
                autoComplete="off"
                maxLength={4}
                value={formData.cvv || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d]/g, '');
                  onChange('cvv', val);
                }}
                placeholder="•••"
                aria-invalid={Boolean(errors.cvv)}
                aria-describedby={errors.cvv ? 'cvv-error' : undefined}
                className={`
                  w-full px-4 py-2.5 rounded-xl bg-slate-900 border text-sm text-white placeholder-slate-500 font-mono text-center tracking-widest
                  transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950
                  ${errors.cvv ? 'border-rose-500/80 bg-rose-950/20' : 'border-slate-800 hover:border-slate-700'}
                `}
              />
              {errors.cvv && (
                <p id="cvv-error" className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.cvv}</span>
                </p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 3. Net Banking Form */}
      {selectedMethod === 'NET_BANKING' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label 
              htmlFor="selectedBank" 
              className="block text-xs font-semibold text-slate-300"
            >
              Select Bank <span className="text-rose-400">*</span>
            </label>
            <select
              id="selectedBank"
              name="selectedBank"
              value={formData.selectedBank || ''}
              onChange={(e) => onChange('selectedBank', e.target.value)}
              aria-invalid={Boolean(errors.selectedBank)}
              aria-describedby={errors.selectedBank ? 'selectedBank-error' : undefined}
              className={`
                w-full px-4 py-2.5 rounded-xl bg-slate-900 border text-sm text-white
                transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950
                ${errors.selectedBank ? 'border-rose-500/80 bg-rose-950/20' : 'border-slate-800 hover:border-slate-700'}
              `}
            >
              <option value="">Select a demo bank...</option>
              {DEMO_BANKS.map((bank) => (
                <option key={bank.id} value={bank.name}>
                  {bank.name}
                </option>
              ))}
            </select>
            {errors.selectedBank ? (
              <p id="selectedBank-error" className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{errors.selectedBank}</span>
              </p>
            ) : (
              <p className="text-[11px] text-slate-500">
                Choose a simulated bank provider for testing the banking flow.
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
