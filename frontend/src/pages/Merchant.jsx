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
  CheckCircle2
} from 'lucide-react';
import { 
  getMerchantRecoveryMetrics, 
  filterMerchantActivityLogs, 
  calculateCampaignPerformance 
} from '../services/merchantRecoveryAnalytics';

/**
 * Merchant Dashboard Component — RecoverAI M6 Page 1 Part 3
 * Displays aggregate revenue recovery metrics, AI decision breakdowns, priority distribution,
 * campaign performance analytics, interactive filters, and detailed activity inspection modal.
 * 
 * STRICT BOUNDARY:
 * - Restricted to MERCHANT role via ProtectedRoute.
 * - Pure simulation view driven by merchantRecoveryAnalytics service.
 * - 0 external side effects, 0 DB writes, 0 storage writes.
 */
export function Merchant() {
  const metrics = useMemo(() => getMerchantRecoveryMetrics(), []);
  const campaignPerf = useMemo(() => calculateCampaignPerformance(metrics), [metrics]);

  // Filter state in React memory
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [failureCodeFilter, setFailureCodeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 text-left">
      
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        {/* Badges */}
        <div className="flex items-center justify-between flex-wrap gap-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-400 border border-indigo-800/60">
              <Store className="h-3.5 w-3.5 text-indigo-400" />
              RecoverAI Merchant Dashboard
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-cyan-400 border border-slate-700">
              <Sparkles className="h-3.5 w-3.5" />
              Simulated Environment — Demo Analytics
            </span>
          </div>

          <span className="text-[11px] font-mono text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800">
            Merchant Workspace: Active
          </span>
        </div>

        {/* Title */}
        <div className="space-y-1 relative z-10">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Merchant Recovery Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Real-time revenue recovery performance, AI recovery agent decisions, and customer outreach campaign oversight.
          </p>
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
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
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
