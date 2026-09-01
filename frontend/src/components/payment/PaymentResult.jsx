import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  ArrowLeft, 
  ShieldCheck, 
  BookOpen, 
  CreditCard, 
  Smartphone, 
  Landmark,
  Sparkles,
  AlertOctagon,
  Activity,
  FileText,
  Bot,
  ClipboardList,
  Mail,
  Zap,
  Play,
  RefreshCw
} from 'lucide-react';

import { CustomerRecoveryNotification } from '../customer/CustomerRecoveryNotification';

const FAILURE_LABELS = {
  SERVER_ERROR: 'Server Error',
  NETWORK_ERROR: 'Network Error',
  TIMEOUT: 'Payment Timeout'
};

const METHOD_LABELS = {
  UPI: 'UPI',
  CARD: 'Card',
  NET_BANKING: 'Net Banking'
};

export function PaymentResult({ 
  paymentResultEvent,
  productName = 'AI & Full-Stack Development Program',
  customerRecoverySignals,
  recoveryAssessment,
  recoveryDecision,
  recoveryActionPlan,
  recoveryOutreachMessage,
  recoveryExecution,
  customerNotification,
  recoveryOutcome,
  onSimulateExecution,
  onRetryPayment,
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

  if (!paymentResultEvent) {
    return null;
  }

  const isSuccess = paymentResultEvent.type === 'PAYMENT_SUCCESS';
  const amount = typeof paymentResultEvent.amount === 'number' ? paymentResultEvent.amount : (Number(paymentResultEvent.amount) || 0);
  const displayProductName = paymentResultEvent.productName || productName;
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: paymentResultEvent.currency || 'INR',
    maximumFractionDigits: 0
  }).format(amount);

  const methodLabel = METHOD_LABELS[paymentResultEvent.paymentMethod] || paymentResultEvent.paymentMethod || 'Simulated Method';
  const failureReason = FAILURE_LABELS[paymentResultEvent.failureCode] || 'Payment Failure';

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fadeIn px-4 sm:px-6 lg:px-8">
      
      {/* Result Container Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 lg:p-10 shadow-2xl backdrop-blur-xl text-center space-y-8 relative overflow-hidden">
        
        {/* Decorative ambient background glows */}
        {isSuccess ? (
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        ) : (
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        )}
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-slate-800/20 rounded-full blur-3xl pointer-events-none" />

        {/* 1. SUCCESS RESULT VIEW */}
        {isSuccess ? (
          <div className="space-y-6 relative z-10">
            {/* Success Icon */}
            <div className="relative inline-flex items-center justify-center">
              <div className="h-20 w-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/40">
                <CheckCircle2 className="h-10 w-10" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                <Sparkles className="h-3.5 w-3.5" />
                Simulated Transaction Complete
              </span>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Payment Successful
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                Your payment was completed successfully.
              </p>
            </div>
          </div>
        ) : (
          /* 2. FAILED RESULT VIEW */
          <div className="space-y-6 relative z-10">
            {/* Failure Icon */}
            <div className="relative inline-flex items-center justify-center">
              <div className="h-20 w-20 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-950/40">
                <XCircle className="h-10 w-10" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-800/60">
                <AlertOctagon className="h-3.5 w-3.5" />
                Simulated Transaction Failed
              </span>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Payment Failed
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                Your payment was not completed.
              </p>
            </div>

            {/* Failure Reason Badge Box */}
            <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-3.5 flex items-center justify-center gap-2 text-xs font-medium text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>Failure Reason: <strong className="font-bold text-white">{failureReason}</strong></span>
            </div>
          </div>
        )}

        {/* Safe Payment Metadata Box */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5 text-left space-y-3 relative z-10">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-cyan-400" />
              Program
            </span>
            <span className="text-xs font-medium text-white truncate max-w-[220px]">
              {displayProductName}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Payment Amount</span>
            <span className="text-base font-bold text-white tracking-tight">
              {formattedAmount} <span className="text-xs font-normal text-slate-400">{paymentResultEvent.currency || 'INR'}</span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Payment Method</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-900 text-cyan-400 border border-slate-800">
              {paymentResultEvent.paymentMethod === 'UPI' && <Smartphone className="h-3 w-3" />}
              {paymentResultEvent.paymentMethod === 'CARD' && <CreditCard className="h-3 w-3" />}
              {paymentResultEvent.paymentMethod === 'NET_BANKING' && <Landmark className="h-3 w-3" />}
              {methodLabel}
            </span>
          </div>

          {/* Payment Attempt ID (for failed payments) */}
          {!isSuccess && paymentResultEvent.attemptId && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
              <span className="text-[11px] text-slate-400">Payment Attempt ID</span>
              <span className="text-[11px] font-mono text-slate-300 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
                {paymentResultEvent.attemptId}
              </span>
            </div>
          )}

          {/* Payment Result ID */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              {isSuccess ? 'Payment ID' : 'Payment Result ID'}
            </span>
            <span className="text-[11px] font-mono text-cyan-400 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
              {paymentResultEvent.id}
            </span>
          </div>
        </div>

        {/* M5 Page 2 Part 3 — Recovery Outcome Section */}
        {isSuccess && recoveryOutcome && recoveryOutcome.recoveryStatus === 'RECOVERED' && (
          <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-5 text-left space-y-4 relative z-10">
            <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2.5 flex-wrap gap-2">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                Recovery Outcome
              </span>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-800/80">
                  Status: {recoveryOutcome.recoveryStatus}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-900 text-slate-400 border border-slate-800">
                  {recoveryOutcome.source}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 min-w-0">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Recovered Revenue</span>
                  <span className="font-extrabold text-emerald-300 text-xs sm:text-sm tracking-tight whitespace-nowrap block">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: recoveryOutcome.currency || 'INR', maximumFractionDigits: 0 }).format(recoveryOutcome.recoveredRevenue)}
                  </span>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 min-w-0">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Retry Attempt</span>
                  <span className="font-extrabold text-white text-xs sm:text-sm whitespace-nowrap block">#{recoveryOutcome.retryCount}</span>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 min-w-0">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Original Payment</span>
                  <span className="font-bold text-rose-400 text-xs sm:text-sm whitespace-nowrap block">FAILED</span>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 min-w-0" title={`Original Attempt: ${recoveryOutcome.originalPaymentAttemptId}`}>
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Ref Attempt ID</span>
                  <span className="font-mono font-bold text-slate-300 text-xs block truncate">{recoveryOutcome.originalPaymentAttemptId}</span>
                </div>
              </div>

              <div className="bg-emerald-950/40 p-3 rounded-lg border border-emerald-800/50 space-y-1">
                <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wide block">Explanation</span>
                <p className="text-emerald-200 leading-relaxed font-medium text-xs">
                  RecoverAI successfully recovered the failed payment opportunity through a customer retry.
                </p>
              </div>

              <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/40 p-2.5 flex items-center gap-2 text-[11px] font-semibold text-emerald-300">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>Simulation result — no real financial transaction was processed.</span>
              </div>
            </div>
          </div>
        )}

        {/* M4 Page 1 Part 3 — Simulated Customer Recovery Signals Context */}
        {!isSuccess && customerRecoverySignals && (
          <div className="rounded-xl border border-cyan-900/60 bg-cyan-950/20 p-5 text-left space-y-3 relative z-10">
            <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2.5">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-cyan-400" />
                Simulated Recovery Signals
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/80">
                Demo Customer History
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 text-xs pt-1">
              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-cyan-950/60 min-w-0">
                <span className="text-slate-400 text-[11px] block">Previous Successes</span>
                <span className="font-semibold text-emerald-400 text-sm">{customerRecoverySignals.previousSuccessfulPayments}</span>
              </div>
              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-cyan-950/60 min-w-0">
                <span className="text-slate-400 text-[11px] block">Previous Failures</span>
                <span className="font-semibold text-slate-300 text-sm">{customerRecoverySignals.previousFailedPayments}</span>
              </div>
              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-cyan-950/60 min-w-0">
                <span className="text-slate-400 text-[11px] block">Total Attempts</span>
                <span className="font-semibold text-slate-200 text-sm">{customerRecoverySignals.totalPreviousAttempts}</span>
              </div>
              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-cyan-950/60 min-w-0">
                <span className="text-slate-400 text-[11px] block">Success Rate</span>
                <span className="font-semibold text-cyan-300 text-sm">{customerRecoverySignals.successfulPaymentRate}%</span>
              </div>
              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-cyan-950/60 min-w-0">
                <span className="text-slate-400 text-[11px] block">Recent Failures</span>
                <span className="font-semibold text-slate-300 text-sm">{customerRecoverySignals.recentFailureCount}</span>
              </div>
              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-cyan-950/60 min-w-0">
                <span className="text-slate-400 text-[11px] block">Current Retry Count</span>
                <span className="font-semibold text-slate-300 text-sm">{customerRecoverySignals.currentRetryCount}</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 pt-2 border-t border-cyan-900/30 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-cyan-400 shrink-0" />
              <span>Simulated recovery signals for demo decision context. No persistent database queried.</span>
            </p>
          </div>
        )}

        {/* M4 Page 1 Part 4 — Recovery Assessment Section */}
        {!isSuccess && recoveryAssessment && (
          <div className="rounded-xl border border-indigo-900/60 bg-indigo-950/20 p-5 text-left space-y-4 relative z-10">
            <div className="flex items-center justify-between border-b border-indigo-900/40 pb-2.5">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-indigo-400" />
                Recovery Assessment Context
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-950/90 text-rose-400 border border-rose-800/80">
                Priority: {recoveryAssessment.priority} ({recoveryAssessment.priorityScore}/100)
              </span>
            </div>

            {/* Opportunity & Summaries */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 font-medium">Recovery Opportunity</span>
                {recoveryAssessment.assessment.recoveryOpportunity ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Actionable Opportunity
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium">None</span>
                )}
              </div>

              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 space-y-1.5">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block">Failure Context</span>
                  <span className="text-slate-300 font-medium">{recoveryAssessment.assessment.failureSummary}</span>
                </div>
                <div className="pt-1.5 border-t border-slate-800/50">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block">Customer Track Record</span>
                  <span className="text-slate-300 font-medium">{recoveryAssessment.assessment.customerHistorySummary}</span>
                </div>
              </div>

              {/* Assessment Overview */}
              <div className="bg-indigo-950/40 p-3 rounded-lg border border-indigo-800/50">
                <span className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wide block mb-1">Normalized Decision Summary</span>
                <p className="text-indigo-200 leading-relaxed font-medium">
                  {recoveryAssessment.assessment.assessmentSummary}
                </p>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 pt-2 border-t border-indigo-900/30 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-indigo-400 shrink-0" />
              <span>Normalized decision context for future RecoverAI agent layer. No autonomous actions taken.</span>
            </p>
          </div>
        )}

        {/* M5 Page 1 Part 1 — Recovery Agent Decision Section */}
        {!isSuccess && recoveryDecision && (
          <div className="rounded-xl border border-purple-900/60 bg-purple-950/20 p-5 text-left space-y-4 relative z-10">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-2.5">
              <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Bot className="h-4 w-4 text-purple-400" />
                Recovery Agent Decision
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800/80">
                Rule-Based Agent Decision
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Recommended Action, Priority & Revenue Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 min-w-0">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Recommended Action</span>
                  <span className="font-extrabold text-purple-300 text-[11px] sm:text-xs md:text-sm tracking-tight whitespace-nowrap block">{recoveryDecision.recommendedAction}</span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 min-w-0">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Priority</span>
                  <span className="font-bold text-rose-400 text-[11px] sm:text-xs md:text-sm whitespace-nowrap block">{recoveryDecision.priority} ({recoveryDecision.priorityScore}/100)</span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 min-w-0">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Revenue at Risk</span>
                  <span className="font-bold text-white text-[11px] sm:text-xs md:text-sm whitespace-nowrap block">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: recoveryDecision.currency || 'INR', maximumFractionDigits: 0 }).format(recoveryDecision.revenueAtRisk)}
                  </span>
                </div>
              </div>

              {/* Decision Reason */}
              <div className="bg-purple-950/40 p-3 rounded-lg border border-purple-800/50 space-y-1">
                <span className="text-[10px] font-semibold text-purple-300 uppercase tracking-wide block">Reason</span>
                <p className="text-purple-200 leading-relaxed font-medium">
                  {recoveryDecision.reason}
                </p>
              </div>

              {/* CRITICAL SAFETY NOTICE */}
              <div className="rounded-lg border border-amber-900/60 bg-amber-950/30 p-2.5 flex items-center gap-2 text-[11px] font-semibold text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                <span>Decision only — no recovery action executed.</span>
              </div>
            </div>
          </div>
        )}

        {/* M5 Page 1 Part 2 — Recovery Action Plan Section */}
        {!isSuccess && recoveryActionPlan && (
          <div className="rounded-xl border border-teal-900/60 bg-teal-950/20 p-5 text-left space-y-4 relative z-10">
            <div className="flex items-center justify-between border-b border-teal-900/40 pb-2.5">
              <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardList className="h-4 w-4 text-teal-400" />
                Recovery Action Plan
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-slate-900 text-amber-400 border border-amber-800/80">
                Status: {recoveryActionPlan.executionStatus}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Grid of Key Properties */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 min-w-0">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Action Type</span>
                  <span className="font-extrabold text-teal-300 text-[11px] sm:text-xs md:text-sm tracking-tight whitespace-nowrap block">{recoveryActionPlan.actionType}</span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 min-w-0">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Recommended Channel</span>
                  <span className="font-extrabold text-white text-[11px] sm:text-xs md:text-sm tracking-tight whitespace-nowrap block">{recoveryActionPlan.channel}</span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 min-w-0">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Priority</span>
                  <span className="font-bold text-rose-400 text-[11px] sm:text-xs md:text-sm whitespace-nowrap block">{recoveryActionPlan.priority}</span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 min-w-0">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Revenue at Risk</span>
                  <span className="font-bold text-slate-200 text-[11px] sm:text-xs md:text-sm whitespace-nowrap block">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: recoveryActionPlan.currency || 'INR', maximumFractionDigits: 0 }).format(recoveryActionPlan.revenueAtRisk)}
                  </span>
                </div>
              </div>

              {/* Objective & Reason */}
              <div className="bg-teal-950/40 p-3 rounded-lg border border-teal-800/50 space-y-2">
                <div>
                  <span className="text-[10px] font-semibold text-teal-300 uppercase tracking-wide block">Objective</span>
                  <p className="text-teal-200 font-medium">{recoveryActionPlan.objective}</p>
                </div>
                <div className="pt-2 border-t border-teal-900/40">
                  <span className="text-[10px] font-semibold text-teal-300 uppercase tracking-wide block">Planning Rationale</span>
                  <p className="text-teal-200/90 font-medium text-[11px]">{recoveryActionPlan.reason}</p>
                </div>
              </div>

              {/* SAFETY NOTICE BADGES */}
              <div className="space-y-1.5 pt-1">
                <div className="rounded-lg border border-teal-900/60 bg-teal-950/40 p-2.5 flex items-center gap-2 text-[11px] font-semibold text-teal-300">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-teal-400" />
                  <span>Planned action only — no outreach has been sent.</span>
                </div>

                <div className="rounded-lg border border-amber-900/60 bg-amber-950/30 p-2.5 flex items-center gap-2 text-[11px] font-semibold text-amber-400">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>Agent recommendation does not execute external actions.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* M5 Page 1 Part 3 — Recovery Outreach Message Section */}
        {!isSuccess && recoveryOutreachMessage && (
          <div className="rounded-xl border border-sky-900/60 bg-sky-950/20 p-5 text-left space-y-4 relative z-10">
            <div className="flex items-center justify-between border-b border-sky-900/40 pb-2.5 flex-wrap gap-2">
              <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-sky-400" />
                Recovery Outreach Message
              </span>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-800/80">
                  Generated Draft
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-slate-900 text-amber-400 border border-amber-800/80">
                  Status: {recoveryOutreachMessage.executionStatus}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* Channel & Subject Header */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 min-w-0">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Channel</span>
                  <span className="font-extrabold text-sky-300 text-[11px] sm:text-xs md:text-sm whitespace-nowrap block">{recoveryOutreachMessage.channel}</span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 min-w-0 sm:col-span-2">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Subject</span>
                  <span className="font-bold text-white text-xs sm:text-sm block truncate">{recoveryOutreachMessage.subject}</span>
                </div>
              </div>

              {/* Message Body Preview */}
              <div className="bg-slate-950/80 p-4 rounded-lg border border-sky-900/40 space-y-1.5 font-mono text-[11px]">
                <span className="text-[10px] font-sans font-semibold text-sky-400 uppercase tracking-wide block mb-1">Message Body</span>
                <pre className="whitespace-pre-wrap font-sans text-slate-200 leading-relaxed font-normal">
                  {recoveryOutreachMessage.message}
                </pre>
              </div>

              {/* SAFETY NOTICE BADGES */}
              <div className="space-y-1.5 pt-1">
                <div className="rounded-lg border border-sky-900/60 bg-sky-950/40 p-2.5 flex items-center gap-2 text-[11px] font-semibold text-sky-300">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-sky-400" />
                  <span>Draft only — no message has been sent.</span>
                </div>

                <div className="rounded-lg border border-amber-900/60 bg-amber-950/30 p-2.5 flex items-center gap-2 text-[11px] font-semibold text-amber-400">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>This recommendation does not execute external communication.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* M5 Page 1 Part 4 — Recovery Action Execution Simulator Section */}
        {!isSuccess && recoveryActionPlan && recoveryActionPlan.actionType === 'RECOVERY_OUTREACH' && (
          <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-5 text-left space-y-4 relative z-10">
            <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2.5 flex-wrap gap-2">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-emerald-400" />
                Recovery Action Execution
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-extrabold ${
                recoveryExecution 
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80' 
                  : 'bg-slate-900 text-amber-400 border border-amber-800/80'
              }`}>
                Status: {recoveryExecution ? recoveryExecution.executionStatus : 'NOT EXECUTED'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {!recoveryExecution ? (
                /* BEFORE EXECUTION VIEW */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 min-w-0">
                      <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Action Type</span>
                      <span className="font-extrabold text-emerald-300 text-[11px] sm:text-xs md:text-sm tracking-tight whitespace-nowrap block">RECOVERY_OUTREACH</span>
                    </div>
                    <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 min-w-0">
                      <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Channel</span>
                      <span className="font-extrabold text-white text-[11px] sm:text-xs md:text-sm tracking-tight whitespace-nowrap block">EMAIL</span>
                    </div>
                    <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 min-w-0">
                      <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Execution Mode</span>
                      <span className="font-extrabold text-amber-400 text-[11px] sm:text-xs md:text-sm whitespace-nowrap block">MANUAL_TRIGGER</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onSimulateExecution}
                    className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-lg transition-all inline-flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <Play className="h-4 w-4 text-white fill-white" />
                    <span>Simulate Execution</span>
                  </button>

                  <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/40 p-2.5 flex items-center gap-2 text-[11px] font-semibold text-emerald-300">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>Simulation only — no external action will be performed.</span>
                  </div>
                </div>
              ) : (
                /* AFTER EXECUTION VIEW */
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 min-w-0">
                      <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Execution Status</span>
                      <span className="font-extrabold text-emerald-400 text-xs sm:text-sm whitespace-nowrap block">{recoveryExecution.executionStatus}</span>
                    </div>

                    <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 min-w-0">
                      <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Outcome</span>
                      <span className="font-extrabold text-emerald-300 text-xs sm:text-sm tracking-tight whitespace-nowrap block">{recoveryExecution.outcome}</span>
                    </div>

                    <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 min-w-0" title={recoveryExecution.executionId}>
                      <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Execution ID</span>
                      <span className="font-mono font-bold text-slate-300 text-xs block truncate">{recoveryExecution.executionId}</span>
                    </div>

                    <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 min-w-0">
                      <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Channel</span>
                      <span className="font-extrabold text-white text-xs sm:text-sm whitespace-nowrap block">{recoveryExecution.channel}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/40 p-2.5 flex items-center gap-2 text-[11px] font-semibold text-emerald-300">
                      <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span>Simulated execution only — no email was sent.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* M5 Page 2 Part 1 — Customer Recovery Notification Section */}
        {!isSuccess && (
          customerNotification ? (
            <CustomerRecoveryNotification 
              notification={customerNotification} 
              onRetryPayment={onRetryPayment} 
            />
          ) : (
            <div className="pt-2 relative z-10">
              <button
                type="button"
                onClick={onRetryPayment}
                className="w-full px-5 py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 to-orange-500 text-white text-xs sm:text-sm font-bold shadow-lg transition-all inline-flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <RefreshCw className="h-4 w-4 text-white" />
                <span>Retry Payment</span>
              </button>
            </div>
          )
        )}

        {/* Action Button: Return to Customer Portal */}
        <div className="pt-2 relative z-10">
          <button
            type="button"
            onClick={handleReturn}
            className="w-full px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold transition-all inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer shadow-lg"
          >
            <ArrowLeft className="h-4 w-4 text-cyan-400" />
            <span>Return to Customer Portal</span>
          </button>
        </div>

        {/* Safety & Demo Environment Notice */}
        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5 relative z-10">
          <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
          <span>Simulated Environment — No financial transaction or payment provider contacted.</span>
        </div>

      </div>

    </div>
  );
}
