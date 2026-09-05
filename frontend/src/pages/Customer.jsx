import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Loader2, ShoppingBag, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRecovery } from '../context/RecoveryContext';
import { CustomerProfileCard } from '../components/customer/CustomerProfileCard';
import { ProductCard } from '../components/customer/ProductCard';
import { CustomerRecoveryNotification } from '../components/customer/CustomerRecoveryNotification';

export function Customer() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { merchantProducts, activeMerchantId, productsLoading, productsError, activeRecoverySession } = useRecovery();

  const visibleProducts = useMemo(() => {
    const targetMerchantId = activeMerchantId;
    if (!targetMerchantId) {
      return [];
    }
    return (merchantProducts || []).filter(
      (p) => p.merchantId === targetMerchantId && p.active !== false
    );
  }, [merchantProducts, activeMerchantId]);

  const handlePortalRetry = () => {
    if (!activeRecoverySession) return;
    const retryPayload = {
      isRetryAttempt: true,
      isRetry: true,
      isFreshPurchase: false,
      activityId: activeRecoverySession.activityId,
      paymentAttemptId: activeRecoverySession.attemptEvent?.id || activeRecoverySession.paymentAttemptId,
      paymentResultId: activeRecoverySession.resultEvent?.id || activeRecoverySession.paymentResultId,
      merchantId: activeRecoverySession.merchantId,
      customerId: activeRecoverySession.customerId || user?.id || user?.email || 'customer_demo',
      productId: activeRecoverySession.productId,
      productName: activeRecoverySession.productName,
      amount: activeRecoverySession.amount,
      failureCode: activeRecoverySession.failureCode || 'SERVER_ERROR'
    };

    console.log('[RETRY FLOW] Retry button clicked');
    console.log('[RETRY FLOW] Navigation state:', retryPayload);

    navigate('/customer/payment', {
      state: retryPayload
    });
  };

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
    <div className="min-h-[calc(100vh-140px)] w-full space-y-8">
      
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

      {/* Active Failed Payment Recovery Notification Banner */}
      {activeRecoverySession && activeRecoverySession.currentStatus === 'FAILED' && (
        <section aria-label="Failed Payment Recovery Notification">
          <CustomerRecoveryNotification 
            notification={activeRecoverySession.recoveryNotification || {
              title: 'Action Required: Retry Failed Payment',
              message: `Your payment of ₹${activeRecoverySession.amount} for "${activeRecoverySession.productName}" failed due to a server error. Click below to retry and complete your order.`,
              recommendedAction: 'RETRY_PAYMENT',
              reason: 'SERVER_ERROR',
              productName: activeRecoverySession.productName,
              amount: activeRecoverySession.amount,
              currency: activeRecoverySession.currency || 'INR'
            }}
            onRetryPayment={handlePortalRetry}
          />
        </section>
      )}

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

        {/* Render Merchant-Owned Product Cards */}
        <div className="space-y-4">
          {productsLoading ? (
            <div className="p-8 text-center bg-slate-900/80 rounded-2xl border border-slate-800 text-slate-400 text-sm flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 text-cyan-400 animate-spin" />
              <span>Loading products from database...</span>
            </div>
          ) : productsError ? (
            <div className="p-8 text-center bg-rose-950/40 rounded-2xl border border-rose-800/60 text-rose-300 text-sm font-semibold">
              Unable to load merchant products from database.
            </div>
          ) : visibleProducts.length > 0 ? (
            visibleProducts.map((product) => (
              <ProductCard key={product.id || product.productId} product={product} />
            ))
          ) : (
            <div className="p-8 text-center bg-slate-900/80 rounded-2xl border border-slate-800 text-slate-400 text-sm">
              No products currently available from this merchant.
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
