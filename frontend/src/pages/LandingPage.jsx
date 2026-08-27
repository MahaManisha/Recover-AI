import React, { useEffect, useState } from 'react';
import { fetchBackendHealth } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { ShieldAlert, RefreshCw, CheckCircle2, ArrowRight, Zap, Database, Bot } from 'lucide-react';

export function LandingPage() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    const res = await fetchBackendHealth();
    if (res.success) {
      setHealthData(res.data);
    } else {
      setError(res.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex flex-col justify-between overflow-hidden bg-grid-pattern">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

      <main className="relative max-w-5xl mx-auto px-6 pt-16 pb-20 flex-1 flex flex-col items-center justify-center text-center">
        
        {/* Status Pill */}
        <div className="mb-8">
          <StatusBadge 
            status={healthData?.status} 
            serviceName={healthData?.service || 'backend'} 
            isLive={Boolean(healthData?.status === 'ok')}
          />
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6">
          Recover<span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">AI</span>
        </h1>

        {/* Tagline */}
        <h2 className="text-xl sm:text-2xl font-semibold text-cyan-300 mb-6 max-w-2xl">
          Autonomous Revenue Recovery Agent
        </h2>

        {/* Description */}
        <p className="text-slate-400 text-base sm:text-lg max-w-2xl leading-relaxed mb-12">
          An intelligent autonomous agent framework built to automatically identify, analyze, and recover failed payments and abandoned customer checkouts for digital businesses.
        </p>

        {/* System Diagnostics Card */}
        <div className="w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl text-left shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Zap className="h-4 w-4 text-cyan-400" />
              Backend Connection
            </span>
            <button 
              onClick={checkHealth}
              disabled={loading}
              className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Endpoint:</span>
              <code className="text-xs font-mono bg-slate-950 px-2 py-1 rounded text-cyan-300">
                GET /api/health
              </code>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Status Response:</span>
              {loading ? (
                <span className="text-slate-500 text-xs font-mono animate-pulse">Checking...</span>
              ) : healthData ? (
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {JSON.stringify(healthData)}
                </span>
              ) : (
                <span className="text-xs font-mono text-rose-400 flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {error || 'Offline'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Structural Placeholders Overview */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl text-left">
          <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/60 backdrop-blur-sm">
            <div className="h-8 w-8 rounded-lg bg-cyan-950/80 text-cyan-400 flex items-center justify-center mb-3">
              <Bot className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">AI Agents</h3>
            <p className="text-xs text-slate-500">Structural placeholder ready for autonomous recovery workflows.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/60 backdrop-blur-sm">
            <div className="h-8 w-8 rounded-lg bg-blue-950/80 text-blue-400 flex items-center justify-center mb-3">
              <Zap className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">FastAPI Backend</h3>
            <p className="text-xs text-slate-500">High-performance async API foundation with CORS support.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/60 backdrop-blur-sm">
            <div className="h-8 w-8 rounded-lg bg-indigo-950/80 text-indigo-400 flex items-center justify-center mb-3">
              <Database className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">Database Layer</h3>
            <p className="text-xs text-slate-500">Deferred to future milestone phase per architectural design.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-900 text-center text-xs text-slate-600">
        <p>RecoverAI Project Foundation &bull; Milestone 1</p>
      </footer>
    </div>
  );
}
