import React from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { RefreshCw, CheckCircle2, ShieldAlert, Activity, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Home({ healthResult, loading, onRetry }) {
  const isConnected = Boolean(healthResult?.success && healthResult?.data?.status === 'ok');

  return (
    <div className="relative w-full flex-1 min-h-[calc(100vh-140px)] flex flex-col justify-between overflow-hidden bg-grid-pattern rounded-2xl border border-slate-800/50 p-6 sm:p-10">
      {/* Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-5xl mx-auto flex-1 flex flex-col items-center justify-center text-center py-6">
        
        {/* Status Pill */}
        <div className="mb-6">
          <StatusBadge 
            status={healthResult?.data?.status} 
            loading={loading}
            serviceName={healthResult?.data?.service} 
          />
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
          Recover<span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">AI</span>
        </h1>

        {/* Tagline */}
        <h2 className="text-lg sm:text-xl font-semibold text-cyan-300 mb-4 max-w-xl">
          Autonomous Revenue Recovery Agent
        </h2>

        {/* Short Description */}
        <p className="text-slate-400 text-sm sm:text-base max-w-xl leading-relaxed mb-8">
          An intelligent autonomous agent framework designed to recover lost revenue from failed payments, churn, and abandoned checkouts.
        </p>

        {/* System Connection Diagnostic Card */}
        <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl text-left shadow-xl mb-10">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              System Status
            </span>

            <button 
              onClick={onRetry}
              disabled={loading}
              className="text-xs font-medium text-slate-300 hover:text-cyan-400 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Checking...' : 'Retry Connection'}
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="py-2 text-center text-sm font-medium text-slate-400 animate-pulse">
                Checking backend connection...
              </div>
            ) : isConnected ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Connection State:</span>
                  <span className="font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Backend Connected ✓
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">RecoverAI Backend:</span>
                  <span className="font-mono text-xs text-cyan-300 bg-cyan-950/80 border border-cyan-800/50 px-2 py-0.5 rounded">
                    Online
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-800/50">
                  <span>Service Name:</span>
                  <span className="font-mono text-slate-400">{healthResult.data.service}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Connection State:</span>
                  <span className="font-semibold text-rose-400 flex items-center gap-1">
                    <ShieldAlert className="h-4 w-4" />
                    Backend Connection Failed
                  </span>
                </div>

                <p className="text-xs text-rose-300/90 bg-rose-950/40 border border-rose-900/40 rounded-lg p-2.5 leading-relaxed">
                  Unable to connect to the RecoverAI backend.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Navigation Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full max-w-3xl text-left">
          <Link to="/customer" className="group p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-900/80 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-300 group-hover:text-cyan-400 transition-colors">Customer Portal</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-xs text-slate-500">Customer payment recovery portal placeholder.</p>
          </Link>

          <Link to="/agent" className="group p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-900/80 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-300 group-hover:text-cyan-400 transition-colors">Agent Console</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-xs text-slate-500">Autonomous recovery agent console placeholder.</p>
          </Link>

          <Link to="/merchant" className="group p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-900/80 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-300 group-hover:text-cyan-400 transition-colors">Merchant Dashboard</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-xs text-slate-500">Merchant revenue metrics dashboard placeholder.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
