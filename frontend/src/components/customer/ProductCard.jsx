import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ShoppingBag, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { useRecovery } from '../../context/RecoveryContext';
import { DEMO_PRODUCT } from '../../data/demoProduct';

export function ProductCard({ product = DEMO_PRODUCT, onBuyNow }) {
  const navigate = useNavigate();
  const { setSelectedProduct, clearRecoverySession } = useRecovery();

  const handleBuyNow = () => {
    if (setSelectedProduct) {
      setSelectedProduct(product);
    }
    // Explicitly clear any stale recovery session context when starting a fresh purchase
    if (clearRecoverySession) {
      clearRecoverySession();
    }
    if (onBuyNow) {
      onBuyNow(product);
    } else {
      navigate('/customer/checkout', {
        state: {
          isRetryAttempt: false,
          isRetry: false,
          isFreshPurchase: true
        }
      });
    }
  };

  const formattedPrice = product.formattedPrice || `₹${product.price?.toLocaleString('en-IN')}`;

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-xl transition-all duration-200 hover:border-slate-700/80 relative overflow-hidden group">
      {/* Decorative subtle background gradient blur */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-500" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-500" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        
        {/* Left Side: Product Details */}
        <div className="space-y-4 max-w-2xl">
          
          {/* Category Tag & Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
              <BookOpen className="h-3.5 w-3.5" />
              {product.category}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60">
              <Sparkles className="h-3 w-3 text-amber-400" />
              Featured Course
            </span>
          </div>

          {/* Product Name */}
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white group-hover:text-cyan-300 transition-colors">
            {product.name}
          </h3>

          {/* Product Description */}
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {product.description}
          </p>

          {/* Feature Highlights */}
          <div className="flex flex-wrap gap-y-1.5 gap-x-4 pt-1 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Instant Digital Access
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Industry Certification
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Lifetime Updates
            </span>
          </div>
        </div>

        {/* Right Side: Pricing & Buy Now CTA */}
        <div className="shrink-0 flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between md:justify-center gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-slate-800/80">
          
          <div className="text-left md:text-right">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
              Program Fee
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-baseline gap-1">
              <span>{formattedPrice}</span>
              <span className="text-xs font-normal text-slate-400">{product.currency}</span>
            </div>
          </div>

          {/* Buy Now Button */}
          <button
            type="button"
            onClick={handleBuyNow}
            aria-label={`Buy ${product.name} for ${formattedPrice}`}
            className="w-full sm:w-auto md:w-full px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Buy Now</span>
            <ArrowRight className="h-4 w-4" />
          </button>

        </div>

      </div>
    </div>
  );
}
