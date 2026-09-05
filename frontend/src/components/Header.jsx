import React from 'react';
import { Cpu } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { Link } from 'react-router-dom';

export function Header({ healthResult, loading }) {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50 w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Cpu className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              RecoverAI
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                v0.1.0
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Autonomous Revenue Recovery</p>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <StatusBadge 
            status={healthResult?.data?.status} 
            loading={loading}
            serviceName={healthResult?.data?.service} 
          />
        </div>
      </div>
    </header>
  );
}
