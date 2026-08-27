import React from 'react';
import { Bot, Clock, Cpu } from 'lucide-react';

export function Agent() {
  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col items-center justify-center text-center p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
      <div className="h-16 w-16 rounded-2xl bg-blue-950/80 border border-blue-800/50 text-blue-400 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/10">
        <Bot className="h-8 w-8" />
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-semibold text-blue-400 mb-4">
        <Clock className="h-3.5 w-3.5" />
        Milestone Placeholder
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
        RecoverAI Agent Console — Coming Soon
      </h1>

      <p className="text-slate-400 text-sm max-w-md leading-relaxed">
        The autonomous AI agent monitoring and orchestration console will be implemented in a future milestone.
      </p>
    </div>
  );
}
