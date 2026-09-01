import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CreditCard, 
  UserCheck, 
  Mail, 
  BookOpen, 
  ShieldCheck, 
  ShoppingBag,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRecovery } from '../../context/RecoveryContext';
import { DEMO_PRODUCT } from '../../data/demoProduct';

export function PurchaseSummary({ product: propProduct, onContinue, onBack }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedProduct } = useRecovery();

  const product = propProduct || selectedProduct || DEMO_PRODUCT;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/customer');
    }
  };

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    } else {
      navigate('/customer/payment');
    }
  };

  // Programmatic amount calculation: quantity = 1
  const quantity = 1;
  const unitPrice = Number(product?.price) || 2000;
  const totalAmount = quantity * unitPrice;

  // Format currency values consistently (INR)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: product?.currency || 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const customerName = user?.full_name || 'Customer Account';
  const customerEmail = user?.email || 'customer@example.com';

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      
      {/* Navigation Header / Back Button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Return to customer portal product selection"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-xs sm:text-sm font-medium text-slate-300 hover:text-white border border-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 text-cyan-400" />
          <span>Back to Products</span>
        </button>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
          <Sparkles className="h-3.5 w-3.5" />
          Checkout Step 1 of 2
        </span>
      </div>

      {/* Main Purchase Summary Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-8">
        
        {/* Card Title Section */}
        <div className="border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1">
            <ShoppingBag className="h-4 w-4" />
            Order Confirmation Review
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Review your purchase
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Please double-check your order details and customer account information before proceeding to payment options.
          </p>
        </div>

        {/* 1. Itemized Product Summary Box */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 sm:p-6 space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400">
                <BookOpen className="h-3.5 w-3.5" />
                {product.category}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {product.name}
              </h2>
              {product.description && (
                <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
                  {product.description}
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-4 space-y-3 text-xs sm:text-sm">
            {/* Quantity */}
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Quantity</span>
              <span className="font-semibold text-white bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                {quantity}
              </span>
            </div>

            {/* Unit Price */}
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Unit price</span>
              <span className="font-medium text-slate-200">
                {formatCurrency(unitPrice)}
              </span>
            </div>

            {/* Total Amount Divider & Display */}
            <div className="border-t border-slate-800/80 pt-4 flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold text-white block">Total Amount</span>
                <span className="text-[11px] text-slate-500">Calculated programmatically (1 × {formatCurrency(unitPrice)})</span>
              </div>
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400 tracking-tight">
                  {formatCurrency(totalAmount)}
                </div>
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                  Non-editable Demo Price
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Customer Account Information Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/60 pb-2">
            <UserCheck className="h-4 w-4 text-cyan-400" />
            Customer Information
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm pt-1">
            <div>
              <span className="text-slate-500 text-xs block mb-0.5">Full Name</span>
              <span className="font-semibold text-white flex items-center gap-1.5">
                {customerName}
              </span>
            </div>

            <div>
              <span className="text-slate-500 text-xs block mb-0.5">Email Address</span>
              <span className="font-medium text-slate-300 flex items-center gap-1.5 truncate">
                <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{customerEmail}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Back & Continue to Payment */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-2">
          
          <button
            type="button"
            onClick={handleBack}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-xs sm:text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer"
          >
            Back
          </button>

          <button
            type="button"
            onClick={handleContinue}
            aria-label="Continue to payment placeholder experience"
            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer"
          >
            <CreditCard className="h-4 w-4" />
            <span>Continue to Payment</span>
            <ArrowRight className="h-4 w-4" />
          </button>

        </div>

      </div>
    </div>
  );
}
