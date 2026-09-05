import React, { useMemo, useState } from 'react';
import { 
  Store, 
  TrendingUp, 
  DollarSign, 
  ShieldCheck, 
  Activity, 
  Sparkles, 
  ArrowUpRight, 
  Zap,
  AlertTriangle,
  Filter,
  Search,
  PieChart,
  BarChart3,
  X,
  Mail,
  Clock,
  Eye,
  Download,
  FileSpreadsheet,
  FileCode,
  Award,
  Sliders,
  RotateCcw,
  Check,
  Layers,
  Smartphone,
  MessageSquare,
  Webhook,
  Send,
  Terminal,
  Radio,
  Package,
  PlusCircle
} from 'lucide-react';
import { 
  getMerchantRecoveryMetrics, 
  filterMerchantActivityLogs, 
  calculateCampaignPerformance 
} from '../services/merchantRecoveryAnalytics';
import { 
  generateMerchantCSVReport, 
  generateMerchantJSONReport 
} from '../services/merchantReportExporter';
import { 
  getMerchantRuleConfig, 
  updateMerchantRuleConfig, 
  evaluateCustomRules 
} from '../services/merchantRuleEngine';
import { 
  generateWebhookPayload, 
  simulateWebhookDispatch, 
  formatCustomOutreachMessage 
} from '../services/webhookDeliverySimulator';
import { DEFAULT_DEMO_MERCHANT_ID } from '../data/demoProduct';
import { finalizeRecoveryLifecycle, evaluateAgentDecision } from '../services/agentConsoleStream';

import { useRecovery } from '../context/RecoveryContext';
import { useAuth } from '../context/AuthContext';
import { fetchBackendRecoveryEvents } from '../services/api';

/**
 * Merchant Dashboard Component — RecoverAI M6 Page 1 Part 4
 * Complete Merchant Dashboard with KPI cards, Decision breakdowns, Campaign performance,
 * Activity inspection modal, Interactive filters, Executive Recovery Summary, and Client-Side Exporters (CSV/JSON).
 * 
 * STRICT BOUNDARY:
 * - Restricted to MERCHANT role via ProtectedRoute.
 * - Pure simulation view driven by merchant services.
 * - 0 backend file calls, 0 DB writes, 0 storage writes.
 */
function getEventTimestamp(e) {
  if (!e) return 0;
  const ts = e.updated_at || e.updatedAt || e.created_at || e.createdAt || e.timestamp || e.lastUpdated;
  if (!ts) return 0;
  const t = new Date(ts).getTime();
  return isNaN(t) ? 0 : t;
}

export function Merchant() {
  const { user } = useAuth();
  const { activeRecoverySession, recoveryEvents, merchantProducts, addMerchantProduct, activeMerchantId, setActiveMerchantId } = useRecovery();

  const currentMerchantId = user?.merchantId || activeMerchantId || DEFAULT_DEMO_MERCHANT_ID;

  React.useEffect(() => {
    if (currentMerchantId && setActiveMerchantId) {
      setActiveMerchantId(currentMerchantId);
    }
  }, [currentMerchantId, setActiveMerchantId]);

  const ownedProducts = useMemo(() => {
    return (merchantProducts || []).filter((p) => p.merchantId === currentMerchantId);
  }, [merchantProducts, currentMerchantId]);

  // Session MUST belong to current authenticated merchant
  const isMerchantSession = Boolean(
    activeRecoverySession &&
    (!activeRecoverySession.merchantId || activeRecoverySession.merchantId === currentMerchantId)
  );

  const hasValidActiveSession = Boolean(
    isMerchantSession && activeRecoverySession.currentStatus
  );

  const [dbEvents, setDbEvents] = useState([]);
  const [dbLoading, setDbLoading] = useState(true);

  const refreshMerchantRecoveryEvents = React.useCallback(async (showLoading = false) => {
    if (!currentMerchantId) return;
    if (showLoading) setDbLoading(true);
    try {
      const result = await fetchBackendRecoveryEvents(currentMerchantId);
      const events = (result && result.success && Array.isArray(result.data))
        ? result.data
        : (Array.isArray(result) ? result : []);

      console.log('[MERCHANT DEBUG] Backend recovery events:', events);
      setDbEvents(events);
    } catch (error) {
      console.error('[Merchant] Failed to refresh recovery events:', error);
    } finally {
      if (showLoading) setDbLoading(false);
    }
  }, [currentMerchantId]);

  React.useEffect(() => {
    if (!currentMerchantId) return;

    refreshMerchantRecoveryEvents(true);

    const intervalId = setInterval(() => {
      refreshMerchantRecoveryEvents(false);
    }, 1500);

    return () => clearInterval(intervalId);
  }, [currentMerchantId, refreshMerchantRecoveryEvents]);

  React.useEffect(() => {
    if (!currentMerchantId) return;

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        refreshMerchantRecoveryEvents(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [currentMerchantId, refreshMerchantRecoveryEvents]);

  const merchantRecoveryEvents = useMemo(() => {
    const rawEvents = [];

    const isMerchantMatch = (e) => {
      if (!e) return false;
      if (!e.merchantId) return true;
      if (e.merchantId === currentMerchantId) return true;
      if (e.merchantId === DEFAULT_DEMO_MERCHANT_ID) return true;
      if (user?.id && e.merchantId === user.id) return true;
      return false;
    };

    if (activeRecoverySession && isMerchantMatch(activeRecoverySession)) {
      rawEvents.push(activeRecoverySession);
    }

    (recoveryEvents || []).forEach((e) => {
      if (isMerchantMatch(e)) {
        rawEvents.push(e);
      }
    });

    (dbEvents || []).forEach((e) => {
      if (isMerchantMatch(e)) {
        rawEvents.push(e);
      }
    });

    if (rawEvents.length === 0) {
      return [];
    }

    const eventMap = new Map();

    rawEvents.forEach((e) => {
      const key = e.activityId || e.id || e.paymentAttemptId;
      if (key) {
        const existing = eventMap.get(key);
        if (!existing) {
          eventMap.set(key, { ...e });
        } else {
          // Canonical lifecycle rule: RECOVERED status overrides FAILED
          if (e.status === 'RECOVERED' || existing.status === 'RECOVERED') {
            existing.status = 'RECOVERED';
            existing.recommendedAction = 'RECOVERED';
            existing.recoveredAmount = Number(e.recoveredAmount || existing.recoveredAmount || e.amount || existing.amount) || 0;
          }
          if (getEventTimestamp(e) > getEventTimestamp(existing)) {
            const wasRecovered = existing.status === 'RECOVERED' || e.status === 'RECOVERED';
            Object.assign(existing, e);
            if (wasRecovered) {
              existing.status = 'RECOVERED';
              existing.recommendedAction = 'RECOVERED';
              existing.recoveredAmount = Number(e.recoveredAmount || existing.recoveredAmount || e.amount || existing.amount) || 0;
            }
          }
        }
      }
    });

    const canonicalEvents = Array.from(eventMap.values());
    canonicalEvents.sort((a, b) => getEventTimestamp(b) - getEventTimestamp(a));

    return canonicalEvents;
  }, [dbEvents, recoveryEvents, activeRecoverySession, currentMerchantId]);

  console.log('[Merchant] merchantRecoveryEvents', merchantRecoveryEvents);

  const metrics = useMemo(() => {
    if (Array.isArray(merchantRecoveryEvents) && merchantRecoveryEvents.length > 0) {
      return getMerchantRecoveryMetrics(merchantRecoveryEvents);
    }
    return getMerchantRecoveryMetrics([]);
  }, [merchantRecoveryEvents]);

  const campaignPerf = useMemo(() => calculateCampaignPerformance(metrics), [metrics]);

  // Tab navigation state ('ANALYTICS' | 'PRODUCTS' | 'RULE_CONFIG' | 'WEBHOOK_SIMULATOR')
  const [activeTab, setActiveTab] = useState('ANALYTICS');

  // Product Creation Form state
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('Education / Online Program');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductCurrency, setNewProductCurrency] = useState('INR');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [productFormSuccess, setProductFormSuccess] = useState('');
  const [productFormError, setProductFormError] = useState('');

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setProductFormError('');
    setProductFormSuccess('');

    if (!newProductName.trim()) {
      setProductFormError('Product Name is required.');
      return;
    }
    const priceNum = Number(newProductPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setProductFormError('Price must be greater than 0.');
      return;
    }

    const created = await addMerchantProduct({
      merchantId: currentMerchantId,
      name: newProductName.trim(),
      category: newProductCategory.trim(),
      price: priceNum,
      currency: newProductCurrency.trim(),
      description: newProductDescription.trim(),
      active: true
    });

    if (created) {
      setProductFormSuccess(`Successfully created product: "${created.name}" (${created.formattedPrice || `₹${created.price}`})`);
      setNewProductName('');
      setNewProductPrice('');
      setNewProductDescription('');
    } else {
      setProductFormError('Failed to create product in backend database. Please check server logs and inputs.');
    }
  };

  // M7 Rule Engine state in React memory
  const [ruleConfig, setRuleConfig] = useState(() => getMerchantRuleConfig());

  // M7 Webhook Simulator state in React memory
  const [selectedEventType, setSelectedEventType] = useState('RECOVERY_TRIGGERED');
  const [selectedOutreachChannel, setSelectedOutreachChannel] = useState('EMAIL');
  const [webhookDispatchResult, setWebhookDispatchResult] = useState(null);

  // Filter state in React memory
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [failureCodeFilter, setFailureCodeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Fallback sample opportunity for live rule evaluation preview & webhook generation
  const sampleOpportunity = useMemo(() => ({
    amount: 2000,
    currency: 'INR',
    failureCode: 'SERVER_ERROR',
    paymentMethod: 'CARD',
    productId: 'ai-fullstack-program',
    productName: 'AI & Full-Stack Development Program'
  }), []);

  // Dynamic active opportunity deriving authoritatively from latest active backend recovery event (M10.7 authority)
  const activeOpportunity = useMemo(() => {
    if (!Array.isArray(merchantRecoveryEvents) || merchantRecoveryEvents.length === 0) {
      return null;
    }

    // merchantRecoveryEvents are sorted newest first.
    // Find the newest event whose lifecycle is NON-TERMINAL ACTIVE according to M10.7 (finalizeRecoveryLifecycle)
    const activeEvent = merchantRecoveryEvents.find(e => {
      const targetMId = e.merchantId || currentMerchantId;
      const finalization = finalizeRecoveryLifecycle(null, e, targetMId);
      const rawSt = (e.status || e.currentStatus || '').toUpperCase();
      return finalization.terminal === false && (finalization.active === true || rawSt === 'FAILED');
    });

    if (!activeEvent) {
      return null;
    }

    // Evaluate agent decision for recommendation (M9.4 strategy authority)
    const decision = evaluateAgentDecision(activeEvent, null, dbEvents, merchantRecoveryEvents, currentMerchantId);

    const amt = Number(activeEvent.amount) || 0;
    const recommendedActionLabel = decision?.actionLabel || (
      activeEvent.recommendedAction === 'RECOVERY_OUTREACH' || activeEvent.recommendedAction === 'RETRY_PAYMENT'
        ? 'Retry Payment'
        : (activeEvent.recommendedAction || 'Retry Payment')
    );

    return {
      ...activeEvent,
      activityId: activeEvent.activityId || activeEvent.id,
      customerId: activeEvent.customerId || 'Customer',
      paymentAttemptId: activeEvent.paymentAttemptId || activeEvent.activityId,
      paymentResultId: activeEvent.paymentResultId,
      amount: amt,
      recoveredAmount: 0,
      netRevenueSaved: 0,
      efficiency: 0,
      currency: activeEvent.currency || 'INR',
      failureCode: activeEvent.failureCode || 'SERVER_ERROR',
      paymentMethod: activeEvent.paymentMethod || 'CARD',
      productId: activeEvent.productId,
      productName: activeEvent.productName || 'Selected Product',
      priority: activeEvent.priority || 'CRITICAL',
      priorityScore: activeEvent.priorityScore || 85,
      recommendedAction: recommendedActionLabel,
      status: activeEvent.status || 'FAILED',
      retryCount: Number(activeEvent.retryCount) || 0,
      recoveryOutcome: null,
      isRuntime: true
    };
  }, [merchantRecoveryEvents, currentMerchantId, dbEvents]);

  // Fallback opportunity ONLY for policy preview / webhook simulator when no active runtime opportunity exists
  const previewOpportunity = useMemo(() => {
    return activeOpportunity || sampleOpportunity;
  }, [activeOpportunity, sampleOpportunity]);

  // Live evaluated result preview
  const liveEvaluation = useMemo(() => {
    return evaluateCustomRules(previewOpportunity, ruleConfig);
  }, [previewOpportunity, ruleConfig]);

  // Live active webhook payload
  const activeWebhookPayload = useMemo(() => {
    return generateWebhookPayload(selectedEventType, previewOpportunity);
  }, [selectedEventType, previewOpportunity]);

  // Live active outreach preview
  const activeOutreachMessage = useMemo(() => {
    return formatCustomOutreachMessage(selectedOutreachChannel, previewOpportunity);
  }, [selectedOutreachChannel, previewOpportunity]);

  const handleRuleUpdate = (updates) => {
    setRuleConfig(prev => updateMerchantRuleConfig(prev, updates));
  };

  const handleResetRules = () => {
    setRuleConfig(getMerchantRuleConfig());
  };

  const handleSimulateWebhook = () => {
    const res = simulateWebhookDispatch(activeWebhookPayload, {
      endpoint: 'https://merchant.example.com/webhooks/recoverai'
    });
    setWebhookDispatchResult(res);
  };

  const handleResetWebhookSimulator = () => {
    setSelectedEventType('RECOVERY_TRIGGERED');
    setSelectedOutreachChannel('EMAIL');
    setWebhookDispatchResult(null);
  };

  // Selected activity record state for Detail Modal inspection
  const [selectedActivity, setSelectedActivity] = useState(null);

  // Filtered activity logs
  const filteredActivity = useMemo(() => {
    return filterMerchantActivityLogs(metrics.recentActivity, {
      statusFilter,
      failureCodeFilter,
      searchQuery
    });
  }, [metrics.recentActivity, statusFilter, failureCodeFilter, searchQuery]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: metrics.currency || 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Primary Failure Mode derived dynamically
  const primaryFailureMode = useMemo(() => {
    const entries = Object.entries(metrics.failureBreakdown || {});
    const nonZero = entries.filter(([_, count]) => count > 0);
    if (nonZero.length === 0) return 'NONE';
    nonZero.sort((a, b) => b[1] - a[1]);
    return nonZero[0][0];
  }, [metrics.failureBreakdown]);

  // Primary AI Strategy derived dynamically
  const primaryAIStrategy = useMemo(() => {
    const entries = Object.entries(metrics.actionBreakdown || {});
    const nonZero = entries.filter(([_, count]) => count > 0);
    if (nonZero.length === 0) return 'NO_ACTIVE_RECOVERY';
    nonZero.sort((a, b) => b[1] - a[1]);
    return nonZero[0][0];
  }, [metrics.actionBreakdown]);

  // Client-side CSV Download Handler
  const handleExportCSV = () => {
    const csvContent = generateMerchantCSVReport(metrics, filteredActivity);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'recoverai_merchant_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Client-side JSON Download Handler
  const handleExportJSON = () => {
    const jsonReportObj = generateMerchantJSONReport(metrics, filteredActivity);
    const blob = new Blob([JSON.stringify(jsonReportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'recoverai_merchant_report.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-6 text-left">
      
      {/* Header Banner & Export Action Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        {/* Badges & Actions */}
        <div className="flex items-center justify-between flex-wrap gap-3 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-400 border border-indigo-800/60">
              <Store className="h-3.5 w-3.5 text-indigo-400" />
              RecoverAI Merchant Dashboard
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-cyan-400 border border-slate-700">
              <Sparkles className="h-3.5 w-3.5" />
              Simulated Environment — Demo Analytics
            </span>
          </div>

          {/* Export Action Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 hover:text-white text-xs font-bold border border-emerald-800/60 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-md"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              <span>Export CSV Report</span>
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 hover:text-white text-xs font-bold border border-cyan-800/60 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-md"
            >
              <FileCode className="h-3.5 w-3.5 text-cyan-400" />
              <span>Export JSON Report</span>
            </button>
          </div>
        </div>

        {/* Title */}
        {/* Title */}
        <div className="space-y-1 relative z-10">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Merchant Recovery Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Real-time revenue recovery performance, AI agent decisions, and custom rule policy configuration.
          </p>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-800 relative z-10 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('ANALYTICS')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
              activeTab === 'ANALYTICS'
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Recovery Overview & Analytics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PRODUCTS')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
              activeTab === 'PRODUCTS'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Package className="h-4 w-4 text-cyan-400" />
            <span>Merchant Products</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('RULE_CONFIG')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
              activeTab === 'RULE_CONFIG'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Policy & Custom Rule Engine</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('WEBHOOK_SIMULATOR')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
              activeTab === 'WEBHOOK_SIMULATOR'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Webhook className="h-4 w-4 text-emerald-400" />
            <span>Webhook & Outreach Simulator</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ANALYTICS VIEW */}
      {activeTab === 'ANALYTICS' && (
        <>
      {/* Active Customer Recovery Session Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 flex-wrap gap-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Radio className="h-4 w-4 text-cyan-400 animate-pulse" />
            Active Customer Recovery Session
          </span>
          {activeOpportunity ? (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-extrabold border ${
              activeOpportunity.status === 'RECOVERED'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800/80'
                : 'bg-amber-950 text-amber-300 border-amber-800/80'
            }`}>
              {activeOpportunity.status}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-extrabold border bg-slate-950 text-slate-400 border-slate-800">
              NO_ACTIVE_SESSION
            </span>
          )}
        </div>

        {activeOpportunity ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs pt-1">
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Active Customer</span>
              <span className="font-mono font-bold text-cyan-300 text-xs block truncate">{activeOpportunity.customerId}</span>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Product</span>
              <span className="font-bold text-white text-xs block truncate">{activeOpportunity.productName}</span>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Volume & Failure</span>
              <span className="font-bold text-white text-xs block">{formatCurrency(activeOpportunity.amount)} ({activeOpportunity.failureCode})</span>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Current Recommendation</span>
              <span className={`font-extrabold text-xs block ${activeOpportunity.status === 'RECOVERED' ? 'text-emerald-300' : 'text-indigo-300'}`}>
                {activeOpportunity.recommendedAction}
              </span>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Current Net Revenue Saved</span>
              <span className={`font-extrabold text-xs block ${activeOpportunity.status === 'RECOVERED' ? 'text-emerald-300' : 'text-amber-300'}`}>
                {formatCurrency(activeOpportunity.netRevenueSaved)}
              </span>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Current Efficiency</span>
              <span className={`font-extrabold text-xs block ${activeOpportunity.status === 'RECOVERED' ? 'text-emerald-300' : 'text-rose-400'}`}>
                {activeOpportunity.efficiency}%
              </span>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center bg-slate-950/40 rounded-xl border border-slate-800/60 space-y-1">
            <p className="text-slate-300 text-xs font-semibold">No Active Recovery Session</p>
            <p className="text-slate-500 text-[11px]">No active payment failure or live recovery opportunity currently in progress.</p>
          </div>
        )}
      </div>

      {/* M6 Page 1 Part 4 — Executive Recovery Summary Panel */}
      <div className="bg-slate-900/90 border border-amber-900/60 bg-gradient-to-r from-amber-950/20 via-slate-900/90 to-slate-900/90 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-amber-900/40 pb-2.5 flex-wrap gap-2">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Award className="h-4 w-4 text-amber-400" />
            Executive Recovery Summary
          </span>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
            Audit Overview
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Net Revenue Saved</span>
            <span className="font-extrabold text-amber-300 text-xs sm:text-sm block">{formatCurrency(metrics.totalRecoveredRevenue)}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Overall Recovery Efficiency</span>
            <span className="font-extrabold text-emerald-300 text-xs sm:text-sm block">{metrics.recoveryRatePercentage}%</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Primary Failure Mode</span>
            <span className="font-extrabold text-cyan-300 text-xs sm:text-sm block">{primaryFailureMode}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">AI Strategy</span>
            <span className="font-extrabold text-indigo-300 text-xs sm:text-sm block">{primaryAIStrategy}</span>
          </div>
        </div>

        <div className="rounded-lg border border-amber-900/60 bg-amber-950/40 p-2.5 flex items-center gap-2 text-[11px] font-semibold text-amber-300">
          <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400" />
          <span>Simulated Export Exporter — Data generated purely from in-memory session state.</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Total Revenue at Risk */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-2 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Revenue at Risk</span>
            <div className="h-8 w-8 rounded-lg bg-rose-950/80 border border-rose-800/60 flex items-center justify-center text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-1">
            <span className="text-xl sm:text-2xl font-extrabold text-white tracking-tight block truncate">
              {formatCurrency(metrics.totalRevenueAtRisk)}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block font-medium">
              Across {metrics.totalFailedAttempts} failed attempt{metrics.totalFailedAttempts === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* KPI 2: Recovered Revenue */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-2 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Recovered Revenue</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-1">
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-300 tracking-tight block truncate">
              {formatCurrency(metrics.totalRecoveredRevenue)}
            </span>
            <span className="text-[11px] text-emerald-400/90 mt-0.5 block font-medium flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" />
              100% recovered in simulation
            </span>
          </div>
        </div>

        {/* KPI 3: Recovery Rate */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-2 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Recovery Rate</span>
            <div className="h-8 w-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-1">
            <span className="text-xl sm:text-2xl font-extrabold text-cyan-300 tracking-tight block">
              {metrics.recoveryRatePercentage}%
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block font-medium">
              {metrics.totalRecoveredCount} of {metrics.totalFailedAttempts} opportunities
            </span>
          </div>
        </div>

        {/* KPI 4: Active Recovery Outreach */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-2 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Active Recovery Outreach</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-1">
            <span className="text-xl sm:text-2xl font-extrabold text-indigo-300 tracking-tight block">
              {metrics.totalOutreachCount} Campaign{metrics.totalOutreachCount === 1 ? '' : 's'}
            </span>
            <span className="text-[11px] text-indigo-400/90 mt-0.5 block font-medium">
              Rule-based agent active
            </span>
          </div>
        </div>

      </div>

      {/* M6 Page 1 Part 3 — Campaign Outreach Performance Analytics Panel */}
      <div className="bg-slate-900/90 border border-indigo-900/60 bg-gradient-to-r from-indigo-950/20 via-slate-900/90 to-slate-900/90 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-indigo-900/40 pb-2.5 flex-wrap gap-2">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-indigo-400" />
            Campaign Outreach Performance
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-950 text-indigo-300 border border-indigo-800/80">
            Efficiency: {campaignPerf.outreachSuccessRate}%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Top Channel</span>
            <span className="font-extrabold text-white text-xs sm:text-sm flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-indigo-400" />
              {campaignPerf.topPerformingChannel} (100% success)
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Outreach Conversion</span>
            <span className="font-extrabold text-emerald-300 text-xs sm:text-sm flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              {campaignPerf.channelBreakdown.EMAIL.recovered} of {campaignPerf.channelBreakdown.EMAIL.sent} converted
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Average Recovery Speed</span>
            <span className="font-extrabold text-cyan-300 text-xs sm:text-sm flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-cyan-400" />
              {campaignPerf.averageRecoveryTime}
            </span>
          </div>
        </div>
      </div>

      {/* M6 Page 1 Part 2 — AI Recovery Decision & Distribution Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Failure Breakdown Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <BarChart3 className="h-4 w-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Failure Distribution</h3>
          </div>
          <div className="space-y-2 text-xs pt-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">SERVER_ERROR</span>
              <span className="font-extrabold text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {metrics.failureBreakdown.SERVER_ERROR}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">NETWORK_ERROR</span>
              <span className="font-extrabold text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {metrics.failureBreakdown.NETWORK_ERROR}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">TIMEOUT</span>
              <span className="font-extrabold text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {metrics.failureBreakdown.TIMEOUT}
              </span>
            </div>
          </div>
        </div>

        {/* Priority Breakdown Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <PieChart className="h-4 w-4 text-rose-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Priority Distribution</h3>
          </div>
          <div className="space-y-2 text-xs pt-1">
            <div className="flex items-center justify-between">
              <span className="text-rose-400 font-bold">CRITICAL</span>
              <span className="font-extrabold text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-900/60">
                {metrics.priorityBreakdown.CRITICAL}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-400 font-semibold">HIGH</span>
              <span className="font-extrabold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-900/60">
                {metrics.priorityBreakdown.HIGH}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">MEDIUM / LOW</span>
              <span className="font-extrabold text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {metrics.priorityBreakdown.MEDIUM + metrics.priorityBreakdown.LOW}
              </span>
            </div>
          </div>
        </div>

        {/* Action Breakdown Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <Zap className="h-4 w-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Agent Decisions</h3>
          </div>
          <div className="space-y-2 text-xs pt-1">
            <div className="flex items-center justify-between">
              <span className="text-indigo-300 font-bold">RECOVERY_OUTREACH</span>
              <span className="font-extrabold text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900/60">
                {metrics.actionBreakdown.RECOVERY_OUTREACH}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">MONITOR</span>
              <span className="font-extrabold text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {metrics.actionBreakdown.MONITOR}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">NO_ACTION</span>
              <span className="font-extrabold text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {metrics.actionBreakdown.NO_ACTION}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Recent Recovery Activity Log Section with Interactive Filters & Clickable Row Selection */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl space-y-4">
        
        {/* Section Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-tight">Recent Recovery Activity Log</h2>
          </div>
          <span className="text-[11px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 font-mono">
            Showing {filteredActivity.length} of {metrics.recentActivity.length} events
          </span>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          
          {/* Search Query Input */}
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search customer ID or product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>

          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-slate-400 text-xs font-semibold shrink-0">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-cyan-300 focus:outline-none w-full cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">All Statuses</option>
              <option value="RECOVERED" className="bg-slate-900 text-emerald-400">RECOVERED</option>
              <option value="PENDING" className="bg-slate-900 text-amber-400">PENDING</option>
            </select>
          </div>

          {/* Failure Code Filter Dropdown */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-slate-400 text-xs font-semibold shrink-0">Failure:</span>
            <select
              value={failureCodeFilter}
              onChange={(e) => setFailureCodeFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-cyan-300 focus:outline-none w-full cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">All Failure Types</option>
              <option value="SERVER_ERROR" className="bg-slate-900 text-white">SERVER_ERROR</option>
              <option value="NETWORK_ERROR" className="bg-slate-900 text-white">NETWORK_ERROR</option>
              <option value="TIMEOUT" className="bg-slate-900 text-white">TIMEOUT</option>
            </select>
          </div>

        </div>

        {/* Responsive Activity Log Table */}
        <div className="overflow-x-auto">
          {filteredActivity.length > 0 ? (
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-800/80 text-slate-400 uppercase text-[10px] font-semibold tracking-wider bg-slate-950/60">
                  <th className="py-3 px-3">Customer ID</th>
                  <th className="py-3 px-3">Product</th>
                  <th className="py-3 px-3">Failure Reason</th>
                  <th className="py-3 px-3">Priority Score</th>
                  <th className="py-3 px-3">Action Recommended</th>
                  <th className="py-3 px-3">Recovery Status</th>
                  <th className="py-3 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filteredActivity.map((activity) => (
                  <tr key={activity.activityId} className="hover:bg-slate-800/40 transition-colors cursor-pointer" onClick={() => setSelectedActivity(activity)}>
                    <td className="py-3 px-3 font-mono text-cyan-300 font-medium">
                      {activity.customerId}
                    </td>
                    <td className="py-3 px-3 font-medium text-white max-w-[180px] truncate" title={activity.productName}>
                      {activity.productName}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px]">
                        {activity.failureCode}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 font-bold text-[11px] ${
                        activity.priority === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'
                      }`}>
                        {activity.priority} ({activity.priorityScore}/100)
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-extrabold text-teal-300 tracking-tight">
                        {activity.recommendedAction}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-extrabold ${
                        activity.status === 'RECOVERED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                          : 'bg-amber-950 text-amber-300 border border-amber-800/80'
                      }`}>
                        {activity.status} ({formatCurrency(activity.recoveredAmount)})
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedActivity(activity);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold border border-slate-700 transition-all cursor-pointer"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/60 space-y-2">
              <Filter className="h-6 w-6 text-slate-500 mx-auto mb-1" />
              <p className="text-slate-300 text-xs font-semibold">No recovery activity matches your filter criteria</p>
              <p className="text-slate-500 text-[11px]">Try selecting different status, failure type, or search terms.</p>
            </div>
          )}
        </div>

        {/* Safety Disclaimer Banner */}
        <div className="pt-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 flex items-center gap-2 text-[11px] font-medium text-slate-400">
            <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-400" />
            <span>Simulated Merchant Analytics — No real merchant bank account or payment provider connected.</span>
          </div>
        </div>

      </div>
      </>
      )}

      {/* TAB: MERCHANT PRODUCTS MANAGEMENT & CREATION */}
      {activeTab === 'PRODUCTS' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-cyan-400" />
              Merchant Product Management & Ownership
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Create and manage products owned by merchant (<span className="font-mono text-cyan-300">{currentMerchantId}</span>). Customers view only products belonging to their active merchant.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create Product Form */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Add New Merchant Product
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {currentMerchantId}
                </span>
              </div>

              {productFormError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs font-semibold">
                  {productFormError}
                </div>
              )}

              {productFormSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-semibold">
                  {productFormSuccess}
                </div>
              )}

              <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Advanced AI Microservices & Agents"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Price (₹ INR) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 3500"
                      value={newProductPrice}
                      onChange={(e) => setNewProductPrice(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Education / Online Program"
                      value={newProductCategory}
                      onChange={(e) => setNewProductCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Provide a detailed overview of the program or service..."
                    value={newProductDescription}
                    onChange={(e) => setNewProductDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Create Merchant Product</span>
                </button>
              </form>
            </div>

            {/* Owned Products Catalog List */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Owned Products ({merchantProducts.filter(p => p.merchantId === currentMerchantId).length})
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  Active Products
                </span>
              </div>

              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {merchantProducts
                  .filter((p) => p.merchantId === currentMerchantId)
                  .map((prod) => (
                    <div key={prod.id} className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{prod.name}</span>
                          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/60">
                            {prod.id}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{prod.description}</p>
                        <span className="text-[10px] text-slate-500 font-semibold block">{prod.category}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-base font-extrabold text-white block">{prod.formattedPrice || `₹${prod.price}`}</span>
                        <span className="text-[10px] text-emerald-400 font-bold uppercase">ACTIVE</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RECOVERY POLICY & RULE CONFIGURATOR VIEW */}
      {activeTab === 'RULE_CONFIG' && (
        <div className="space-y-6">
          
          {/* Configurator Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Panel 1: RECOVERY THRESHOLDS & ENGINE SETTINGS */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <Sliders className="h-4 w-4" />
                  Recovery Policy Controls
                </span>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  React Memory State
                </span>
              </div>

              {/* Control 1: Min Revenue Threshold */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="text-slate-300 font-medium">Min Revenue-at-Risk Threshold</label>
                  <span className="font-mono text-cyan-400 font-extrabold text-sm">
                    ₹{ruleConfig.minRevenueThreshold.toLocaleString('en-IN')} INR
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="500"
                  value={ruleConfig.minRevenueThreshold}
                  onChange={(e) => handleRuleUpdate({ minRevenueThreshold: Number(e.target.value) })}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>₹0 (All Payments)</span>
                  <span>₹5,000</span>
                  <span>₹10,000 (High Value)</span>
                </div>
              </div>

              {/* Control 2: Min Priority Threshold */}
              <div className="space-y-2">
                <label className="text-xs text-slate-300 font-medium block">Minimum Required Priority Tier</label>
                <select
                  value={ruleConfig.minPriorityThreshold}
                  onChange={(e) => handleRuleUpdate({ minPriorityThreshold: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
                >
                  <option value="LOW">LOW (Qualify Low, Medium, High, Critical)</option>
                  <option value="MEDIUM">MEDIUM (Qualify Medium, High, Critical)</option>
                  <option value="HIGH">HIGH (Qualify High & Critical)</option>
                  <option value="CRITICAL">CRITICAL (Qualify Critical Only)</option>
                </select>
              </div>

              {/* Control 3: Preferred Outreach Channel */}
              <div className="space-y-2">
                <label className="text-xs text-slate-300 font-medium block">Preferred Outreach Channel</label>
                <div className="grid grid-cols-3 gap-2">
                  {['EMAIL', 'SMS', 'WHATSAPP'].map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => handleRuleUpdate({ preferredChannel: ch })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        ruleConfig.preferredChannel === ch
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              {/* Control 4: Auto-Outreach Engine Toggle */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">Automated Outreach Engine</span>
                  <button
                    type="button"
                    onClick={() => handleRuleUpdate({ autoOutreachEnabled: !ruleConfig.autoOutreachEnabled })}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                      ruleConfig.autoOutreachEnabled
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800/80 shadow-sm shadow-emerald-500/10'
                        : 'bg-rose-950 text-rose-300 border-rose-800/80 shadow-sm shadow-rose-500/10'
                    }`}
                  >
                    {ruleConfig.autoOutreachEnabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
              </div>
            </div>

            {/* Panel 2: SCORING WEIGHTS & RULE FACTORS */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Priority Scoring Weight Allocations
                </span>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  Rule Scoring Engine
                </span>
              </div>

              {/* Revenue Weight */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Revenue Value Weight</span>
                  <span className="font-mono text-indigo-400 font-bold">{ruleConfig.revenueWeight} pts</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="5"
                  value={ruleConfig.revenueWeight}
                  onChange={(e) => handleRuleUpdate({ revenueWeight: Number(e.target.value) })}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                />
              </div>

              {/* Failure Severity Weight */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Failure Severity Weight</span>
                  <span className="font-mono text-indigo-400 font-bold">{ruleConfig.failureWeight} pts</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="5"
                  value={ruleConfig.failureWeight}
                  onChange={(e) => handleRuleUpdate({ failureWeight: Number(e.target.value) })}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                />
              </div>

              {/* Payment Context Weight */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Payment Context Weight</span>
                  <span className="font-mono text-indigo-400 font-bold">{ruleConfig.paymentMethodWeight} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="5"
                  value={ruleConfig.paymentMethodWeight}
                  onChange={(e) => handleRuleUpdate({ paymentMethodWeight: Number(e.target.value) })}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                />
              </div>

              {/* Action Controls */}
              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={handleResetRules}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer shadow-md"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Reset to Default Policy</span>
                </button>
              </div>
            </div>

          </div>

          {/* Live Evaluation Preview Box */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Live Rule Evaluation Preview
              </span>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
                Sample: ₹2,000 CARD Payment (SERVER_ERROR)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <div>
                <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider block">Eligibility Status</span>
                <span className={`text-base font-extrabold block mt-0.5 ${liveEvaluation.isEligible ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {liveEvaluation.isEligible ? 'QUALIFIED FOR OUTREACH' : 'NON-QUALIFIED'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider block">Evaluated Action</span>
                <span className="text-base font-extrabold text-indigo-300 block mt-0.5">
                  {liveEvaluation.recommendedAction}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider block">Evaluated Priority & Score</span>
                <span className="text-base font-extrabold text-cyan-400 block mt-0.5">
                  {liveEvaluation.evaluatedPriority} ({liveEvaluation.evaluatedScore}/100)
                </span>
              </div>
            </div>

            {/* Decision Reason & Applied Rules */}
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-300 leading-relaxed font-medium">
                <span className="font-semibold text-cyan-400">Evaluation Reason: </span>
                {liveEvaluation.decisionReason}
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Applied Policy Rules:</span>
                <div className="flex flex-wrap gap-1.5">
                  {liveEvaluation.appliedRules.map((rule, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded bg-slate-950 text-[11px] font-mono text-cyan-300 border border-slate-800">
                      {rule}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Safety Disclaimer */}
          <p className="text-[11px] text-slate-500 text-center italic">
            Simulation only — rule updates operate in React memory and do not persist to database or localStorage.
          </p>

        </div>
      )}

      {/* TAB 3: M7 PAGE 1 PART 2 — WEBHOOK EVENT & OUTREACH SIMULATOR VIEW */}
      {activeTab === 'WEBHOOK_SIMULATOR' && (
        <div className="space-y-6">
          
          {/* Control Bar & Action Header */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                Enterprise Webhook Event & Custom Outreach Simulator
              </span>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
                React Memory Simulator
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              {/* Selector 1: Event Type */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium block">Simulated Event Type</label>
                <select
                  value={selectedEventType}
                  onChange={(e) => setSelectedEventType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
                >
                  <option value="RECOVERY_TRIGGERED">RECOVERY_TRIGGERED (Outreach Initiated)</option>
                  <option value="PAYMENT_RECOVERED">PAYMENT_RECOVERED (Customer Payment Success)</option>
                  <option value="RECOVERY_EXPIRED">RECOVERY_EXPIRED (Opportunity Timed Out)</option>
                </select>
              </div>

              {/* Selector 2: Outreach Channel */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium block">Outreach Channel Preview</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['EMAIL', 'SMS', 'WHATSAPP'].map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setSelectedOutreachChannel(ch)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        selectedOutreachChannel === ch
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSimulateWebhook}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-xs font-bold border border-emerald-800 transition-all cursor-pointer shadow-md shadow-emerald-500/10"
                >
                  <Send className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Simulate Dispatch</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetWebhookSimulator}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
                  title="Reset Simulator"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-cyan-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Simulator Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Column 1: JSON Payload & Header Inspector */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Live Webhook Payload & Headers
                </span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80">
                  POST (Simulated)
                </span>
              </div>

              {/* Header Configuration Inspector */}
              <div className="space-y-1.5 font-mono text-[11px]">
                <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-slate-400 block">Simulated Request Headers</span>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Content-Type:</span>
                    <span className="text-cyan-300">application/json</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">X-RecoverAI-Event:</span>
                    <span className="text-emerald-300 font-bold">{selectedEventType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">X-RecoverAI-Environment:</span>
                    <span className="text-slate-400">demo-simulation</span>
                  </div>
                </div>
              </div>

              {/* Endpoint Inspector */}
              <div className="space-y-1 font-mono text-[11px]">
                <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-slate-400 block">Simulated Endpoint</span>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-300 truncate">
                  https://merchant.example.com/webhooks/recoverai
                </div>
              </div>

              {/* JSON Payload Viewer */}
              <div className="space-y-1 font-mono text-[11px]">
                <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-slate-400 block">JSON Event Payload</span>
                <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-cyan-300 overflow-x-auto max-h-64 scrollbar-thin text-[11px] leading-relaxed">
                  {JSON.stringify(activeWebhookPayload, null, 2)}
                </pre>
              </div>

              {/* Dispatch Result Card */}
              {webhookDispatchResult && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-xl space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-emerald-400" />
                      Delivery Status: {webhookDispatchResult.responseCode} OK ({webhookDispatchResult.deliveryStatus})
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{new Date(webhookDispatchResult.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[11px] text-emerald-200/90 font-medium leading-relaxed">
                    {webhookDispatchResult.notice}
                  </p>
                </div>
              )}
            </div>

            {/* Column 2: Channel-Specific Outreach Preview */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {selectedOutreachChannel} Outreach Preview
                </span>
                <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/80">
                  Preview Mode
                </span>
              </div>

              {/* Sender & Recipient Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Sender Identifier</span>
                  <span className="font-mono text-slate-200 font-bold text-[11px] truncate block">{activeOutreachMessage.sender}</span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Target Recipient</span>
                  <span className="font-mono text-slate-200 font-bold text-[11px] truncate block">{activeOutreachMessage.recipient}</span>
                </div>
              </div>

              {/* Subject Line if EMAIL */}
              {activeOutreachMessage.subject && (
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Subject Line</span>
                  <span className="font-semibold text-cyan-300 text-xs block">{activeOutreachMessage.subject}</span>
                </div>
              )}

              {/* Message Body Box */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-semibold text-slate-400 uppercase tracking-wider">Simulated Message Body</span>
                  <span className="font-mono text-slate-500">{activeOutreachMessage.characterCount} characters</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-200 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                  {activeOutreachMessage.messageText}
                </div>
              </div>

              {/* Safety Note */}
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>Simulated preview — no actual email, SMS, or WhatsApp message is sent.</span>
              </div>
            </div>

          </div>

          {/* Safety Disclaimer */}
          <p className="text-[11px] text-slate-500 text-center italic">
            Simulation environment — 0 external HTTP POST requests performed, 0 real emails/SMS sent.
          </p>

        </div>
      )}

      {/* M6 Page 1 Part 3 — Interactive Activity Detail Inspection Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full space-y-5 shadow-2xl relative text-left">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-950 text-indigo-400 flex items-center justify-center border border-indigo-800">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Recovery Activity Inspection</h3>
                  <span className="text-[11px] font-mono text-cyan-400 block">ID: {selectedActivity.activityId}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Grid Properties */}
            <div className="space-y-4 text-xs">
              
              {/* Product & Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Customer ID</span>
                  <span className="font-mono font-bold text-cyan-300 text-xs block">{selectedActivity.customerId}</span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Program</span>
                  <span className="font-bold text-white text-xs block truncate" title={selectedActivity.productName}>{selectedActivity.productName}</span>
                </div>
              </div>

              {/* Financial & Priority Context */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Revenue at Risk</span>
                  <span className="font-bold text-white text-xs block">{formatCurrency(selectedActivity.amount)}</span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Recovered Revenue</span>
                  <span className="font-extrabold text-emerald-300 text-xs block">{formatCurrency(selectedActivity.recoveredAmount)}</span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">AI Priority Score</span>
                  <span className="font-bold text-rose-400 text-xs block">{selectedActivity.priority} ({selectedActivity.priorityScore}/100)</span>
                </div>
              </div>

              {/* Action Plan & Failure Reason */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Failure Reason</span>
                  <span className="font-semibold text-slate-200 text-xs block">{selectedActivity.failureCode}: {selectedActivity.failureReason}</span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Recommended Action & Channel</span>
                  <span className="font-extrabold text-teal-300 text-xs block">{selectedActivity.recommendedAction} ({selectedActivity.channel || 'EMAIL'})</span>
                </div>
              </div>

              {/* Simulated Outreach Message Draft Preview */}
              <div className="bg-slate-950/80 p-4 rounded-lg border border-indigo-900/40 space-y-1 font-mono text-[11px]">
                <span className="text-[10px] font-sans font-semibold text-indigo-400 uppercase tracking-wide block mb-1">Simulated Recovery Message Draft</span>
                <p className="text-slate-300 leading-relaxed font-sans font-normal text-xs">
                  "Your payment for {selectedActivity.productName} was not completed due to a temporary server issue. Your purchase is still available. Please try again when ready."
                </p>
              </div>

              {/* Modal Audit Notice */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-400" />
                <span>Simulated Merchant Audit Record — No external emails, SMS, or payment gateways contacted.</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer shadow-lg"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
