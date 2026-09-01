import React, { useMemo, useState } from 'react';
import { 
  BarChart3, 
  Sparkles, 
  Play, 
  RotateCcw, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  Zap, 
  Search, 
  Filter, 
  X, 
  Layers, 
  PieChart, 
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { getBenchmarkSummary } from '../services/batchRecoveryBenchmark';

/**
 * Benchmark Console Component — RecoverAI M7 Page 2 Part 2
 * Centralized enterprise recovery benchmarking dashboard executing multi-scenario
 * payment failure & recovery simulations deterministically in React memory.
 * 
 * STRICT BOUNDARY:
 * - Restricted to MERCHANT role via ProtectedRoute.
 * - Pure simulation engine operating strictly in React memory.
 * - 0 backend API calls, 0 DB writes, 0 storage writes, 0 real dispatches.
 */
export function BenchmarkConsole() {
  const [scenarioCount, setScenarioCount] = useState(50);
  
  // Benchmark execution state in React memory (starts null until user initiates benchmark)
  const [benchmarkData, setBenchmarkData] = useState(null);

  // Table filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [failureFilter, setFailureFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected scenario detail inspection modal
  const [selectedScenario, setSelectedScenario] = useState(null);

  const metrics = benchmarkData?.metrics;
  const results = benchmarkData?.results;

  const handleRunBenchmark = () => {
    const freshBenchmark = getBenchmarkSummary(scenarioCount);
    setBenchmarkData(freshBenchmark);
  };

  const handleScenarioCountChange = (newCount) => {
    setScenarioCount(newCount);
    if (benchmarkData !== null) {
      setBenchmarkData(getBenchmarkSummary(newCount));
    }
  };

  const handleResetBenchmark = () => {
    setScenarioCount(50);
    setBenchmarkData(null);
    setSearchQuery('');
    setFailureFilter('ALL');
    setStatusFilter('ALL');
  };

  // Filtered Scenario Results
  const filteredResults = useMemo(() => {
    if (!Array.isArray(results)) return [];
    
    const query = searchQuery.trim().toLowerCase();
    const failure = failureFilter.toUpperCase();
    const status = statusFilter.toUpperCase();

    return results.filter(s => {
      if (failure !== 'ALL' && s.failureCode !== failure) return false;
      if (status !== 'ALL' && s.recoveryStatus !== status) return false;

      if (query) {
        const matchesId = (s.scenarioId || '').toLowerCase().includes(query);
        const matchesCust = (s.customerId || '').toLowerCase().includes(query);
        const matchesProd = (s.productName || '').toLowerCase().includes(query);
        if (!matchesId && !matchesCust && !matchesProd) return false;
      }

      return true;
    });
  }, [results, searchQuery, failureFilter, statusFilter]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-rose-950/80 text-rose-400 border-rose-800/80';
      case 'HIGH':
        return 'bg-amber-950/80 text-amber-400 border-amber-800/80';
      case 'MEDIUM':
        return 'bg-cyan-950/80 text-cyan-400 border-cyan-800/80';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 text-left">
      
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        {/* Badges & Action Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
              <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
              Batch Recovery Benchmarking Engine
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-cyan-400 border border-slate-700">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              SIMULATED BENCHMARK ENVIRONMENT
            </span>
          </div>

          {/* Benchmark Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-semibold">Scenarios:</span>
              <select
                value={scenarioCount}
                onChange={(e) => handleScenarioCountChange(Number(e.target.value))}
                className="bg-transparent text-xs font-mono font-bold text-emerald-300 focus:outline-none cursor-pointer"
              >
                <option value={50} className="bg-slate-900 text-slate-200">50 Scenarios</option>
                <option value={100} className="bg-slate-900 text-slate-200">100 Scenarios</option>
                <option value={250} className="bg-slate-900 text-slate-200">250 Scenarios</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleRunBenchmark}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 hover:text-white text-xs font-extrabold border border-emerald-800/80 transition-all cursor-pointer shadow-md shadow-emerald-500/10"
            >
              <Play className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400" />
              <span>Run Benchmark</span>
            </button>

            <button
              type="button"
              onClick={handleResetBenchmark}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
              title="Reset Benchmark"
            >
              <RotateCcw className="h-3.5 w-3.5 text-cyan-400" />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1 relative z-10">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            RecoverAI Enterprise Recovery Benchmark
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Deterministic batch benchmarking engine evaluating multi-scenario payment failure recovery yields, strategy efficiency, and outreach channel conversion.
          </p>
        </div>
      </div>

      {/* Initial Idle State Card when Benchmark Has Not Run Yet */}
      {!benchmarkData && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 sm:p-12 shadow-2xl text-center space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="w-16 h-16 rounded-2xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
            <BarChart3 className="h-8 w-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Ready to Run Enterprise Benchmark
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Select your scenario batch size (<span className="text-emerald-400 font-bold">{scenarioCount} scenarios</span> selected) and click below to evaluate simulated payment failure recovery yields, priority scoring, and strategy efficiency.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleRunBenchmark}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-extrabold transition-all cursor-pointer shadow-lg shadow-emerald-500/25 hover:scale-105 active:scale-95"
            >
              <Play className="h-4 w-4 fill-slate-950" />
              <span>Run {scenarioCount} Scenario Benchmark</span>
            </button>
          </div>

          <div className="pt-4 flex items-center justify-center gap-6 text-[11px] font-semibold text-slate-500 flex-wrap">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-cyan-400" /> 100% In-Memory Simulation</span>
            <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-amber-400" /> Deterministic Recovery Scoring</span>
            <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-indigo-400" /> 0 Database / Network Side-Effects</span>
          </div>
        </div>
      )}

      {/* Render Calculated Benchmark Dashboard Results when benchmarkData is populated */}
      {benchmarkData && (
        <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Scenarios Evaluated</span>
          <span className="text-2xl font-extrabold text-white block">{metrics.totalScenarios}</span>
          <span className="text-[11px] text-slate-500 block">Deterministic Test Batch</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Revenue at Risk</span>
          <span className="text-2xl font-extrabold text-amber-300 block">{formatCurrency(metrics.totalRevenueAtRisk)}</span>
          <span className="text-[11px] text-slate-500 block">Total Failed Payment Volume</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Revenue Recovered</span>
          <span className="text-2xl font-extrabold text-emerald-400 block">{formatCurrency(metrics.totalRecoveredRevenue)}</span>
          <span className="text-[11px] text-slate-500 block">Financial Recovery Yield</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Recovery Rate (Financial)</span>
          <span className="text-2xl font-extrabold text-cyan-400 block">{metrics.recoveryRatePercentage}%</span>
          <span className="text-[11px] text-slate-500 block">Recovered / Risk Volume</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Scenario Conversion</span>
          <span className="text-2xl font-extrabold text-indigo-300 block">{metrics.scenarioConversionPercentage}%</span>
          <span className="text-[11px] text-slate-500 block">Recovered / Total Scenarios</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Average Recovery Time</span>
          <span className="text-2xl font-extrabold text-teal-300 block">{metrics.averageRecoveryTime}</span>
          <span className="text-[11px] text-slate-500 block">Simulated Average Speed</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Average Priority Score</span>
          <span className="text-2xl font-extrabold text-purple-400 block">{metrics.averagePriorityScore} <span className="text-xs text-slate-500">/ 100</span></span>
          <span className="text-[11px] text-slate-500 block">Batch Risk Priority</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Strategy Efficiency</span>
          <span className="text-2xl font-extrabold text-emerald-300 block">{metrics.strategyEfficiency}%</span>
          <span className="text-[11px] text-slate-500 block">Successful / Recommended Outreach</span>
        </div>

      </div>

      {/* Distribution Visualization Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Failure Distribution */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider block border-b border-slate-800 pb-2">
            Failure Distribution
          </span>
          <div className="space-y-2 text-xs font-mono">
            {Object.entries(metrics.failureDistribution).map(([code, count]) => (
              <div key={code} className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span className="text-[11px]">{code}</span>
                  <span className="font-bold text-cyan-300">{count}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-500 rounded-full" 
                    style={{ width: `${metrics.totalScenarios > 0 ? (count / metrics.totalScenarios) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider block border-b border-slate-800 pb-2">
            Priority Tiers
          </span>
          <div className="space-y-2 text-xs font-mono">
            {Object.entries(metrics.priorityDistribution).map(([tier, count]) => (
              <div key={tier} className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span className="text-[11px]">{tier}</span>
                  <span className="font-bold text-rose-300">{count}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 rounded-full" 
                    style={{ width: `${metrics.totalScenarios > 0 ? (count / metrics.totalScenarios) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Distribution */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block border-b border-slate-800 pb-2">
            Recommended Actions
          </span>
          <div className="space-y-2 text-xs font-mono">
            {Object.entries(metrics.actionDistribution).map(([act, count]) => (
              <div key={act} className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span className="text-[11px]">{act}</span>
                  <span className="font-bold text-indigo-300">{count}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full" 
                    style={{ width: `${metrics.totalScenarios > 0 ? (count / metrics.totalScenarios) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Channel Distribution */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block border-b border-slate-800 pb-2">
            Outreach Channels
          </span>
          <div className="space-y-2 text-xs font-mono">
            {Object.entries(metrics.channelDistribution).map(([ch, count]) => (
              <div key={ch} className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span className="text-[11px]">{ch}</span>
                  <span className="font-bold text-emerald-300">{count}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full" 
                    style={{ width: `${metrics.totalScenarios > 0 ? (count / metrics.totalScenarios) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Scenario Results Table & Filters Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        
        {/* Filter Controls Bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search scenario ID, customer ID, or product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Failure Code Filter */}
            <select
              value={failureFilter}
              onChange={(e) => setFailureFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
            >
              <option value="ALL">All Failures</option>
              <option value="SERVER_ERROR">SERVER_ERROR</option>
              <option value="NETWORK_ERROR">NETWORK_ERROR</option>
              <option value="TIMEOUT">TIMEOUT</option>
            </select>

            {/* Recovery Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="RECOVERED">RECOVERED</option>
              <option value="UNRECOVERED">UNRECOVERED</option>
            </select>

            {(searchQuery || failureFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setFailureFilter('ALL'); setStatusFilter('ALL'); }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
                title="Reset Table Filters"
              >
                <RotateCcw className="h-3.5 w-3.5 text-cyan-400" />
              </button>
            )}
          </div>
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          {filteredResults.length > 0 ? (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[10px]">
                <tr>
                  <th className="py-3 px-4">Scenario ID</th>
                  <th className="py-3 px-4">Failure Code</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Priority & Score</th>
                  <th className="py-3 px-4">Action & Channel</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Speed</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {filteredResults.map((s) => (
                  <tr key={s.scenarioId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-cyan-300">{s.scenarioId}</td>
                    <td className="py-3 px-4 font-sans font-semibold text-rose-300">{s.failureCode}</td>
                    <td className="py-3 px-4 font-sans text-slate-400">{s.paymentMethod}</td>
                    <td className="py-3 px-4 font-bold text-white">{formatCurrency(s.amount)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${getPriorityBadgeClass(s.priority)}`}>
                        {s.priority} ({s.priorityScore})
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-indigo-300 font-semibold">
                      {s.recommendedAction} ({s.channel})
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                        s.recoveryStatus === 'RECOVERED'
                          ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}>
                        {s.recoveryStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-teal-300">{s.formattedDuration}</td>
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        type="button"
                        onClick={() => setSelectedScenario(s)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white text-[11px] font-bold border border-slate-700 transition-all cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-10 text-center bg-slate-950/40 rounded-xl space-y-2">
              <Filter className="h-6 w-6 text-slate-500 mx-auto mb-1" />
              <p className="text-slate-300 text-xs font-semibold">No benchmark scenarios match your filter criteria</p>
              <p className="text-slate-500 text-[11px]">Try adjusting your search query, failure code, or status filter.</p>
            </div>
          )}
        </div>

        {/* Safety Disclaimer Banner */}
        <div className="pt-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 flex items-center gap-2 text-[11px] font-medium text-slate-400">
            <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-400" />
            <span>Benchmark simulation only — no real customer or payment transaction was processed.</span>
          </div>
        </div>

      </div>
      </>
      )}

      {/* Scenario Detail Inspection Modal */}
      {selectedScenario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full space-y-5 shadow-2xl relative text-left">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Benchmark Scenario Detail Inspection</h3>
                  <span className="text-[11px] font-mono text-cyan-400 block">ID: {selectedScenario.scenarioId}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScenario(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scenario Metadata Grid */}
            <div className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Customer Demo Ref</span>
                  <span className="font-mono font-bold text-cyan-300 text-xs block">{selectedScenario.customerId}</span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Product</span>
                  <span className="font-bold text-white text-xs block truncate" title={selectedScenario.productName}>{selectedScenario.productName}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Revenue at Risk</span>
                  <span className="font-bold text-white text-xs block">{formatCurrency(selectedScenario.amount)}</span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Failure Reason & Method</span>
                  <span className="font-bold text-rose-300 text-xs block">{selectedScenario.failureCode} ({selectedScenario.paymentMethod})</span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Priority & Score</span>
                  <span className="font-bold text-amber-300 text-xs block">{selectedScenario.priority} ({selectedScenario.priorityScore}/100)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Recommended Action & Channel</span>
                  <span className="font-bold text-indigo-300 text-xs block">{selectedScenario.recommendedAction} ({selectedScenario.channel})</span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Recovery Status</span>
                  <span className="font-extrabold text-emerald-400 text-xs block">{selectedScenario.recoveryStatus}</span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Simulated Recovery Duration</span>
                  <span className="font-bold text-teal-300 text-xs block">{selectedScenario.formattedDuration}</span>
                </div>
              </div>

              {/* Raw JSON Snapshot */}
              <div className="space-y-1 font-mono text-[11px]">
                <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-slate-400 block">Scenario Raw Snapshot (JSON)</span>
                <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-cyan-300 overflow-x-auto max-h-36 scrollbar-thin text-[10px] leading-relaxed">
                  {JSON.stringify(selectedScenario, null, 2)}
                </pre>
              </div>

              {/* Modal Audit Notice */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-400" />
                <span>Benchmark simulation only — no real customer or payment transaction was processed.</span>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedScenario(null)}
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
