import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

export function StatusBadge({ status, loading, serviceName }) {
  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs shadow-inner backdrop-blur-md">
        <Loader2 className="h-3.5 w-3.5 text-cyan-400 animate-spin" />
        <span className="font-semibold text-slate-300">
          Checking backend connection...
        </span>
      </div>
    );
  }

  const isConnected = status === 'ok';

  return (
    <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs shadow-inner backdrop-blur-md">
      <span className="relative flex h-2.5 w-2.5">
        {isConnected && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
      </span>
      
      <span className={`font-semibold ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isConnected ? 'Backend Connected ✓' : 'Backend Connection Failed'}
      </span>

      {serviceName && isConnected && (
        <span className="text-[11px] text-slate-500 font-mono border-l border-slate-800 pl-2">
          {serviceName}
        </span>
      )}
    </div>
  );
}
