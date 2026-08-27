import React from 'react';
import { FlaskConical, CheckCircle2, AlertTriangle, WifiOff, Clock, Sparkles } from 'lucide-react';
import { PAYMENT_SCENARIOS, DEFAULT_SCENARIO } from '../../data/paymentScenarios';

const SCENARIO_ICONS = {
  SUCCESS: CheckCircle2,
  SERVER_ERROR: AlertTriangle,
  NETWORK_ERROR: WifiOff,
  TIMEOUT: Clock,
};

export function PaymentScenarioSelector({
  selectedScenario = DEFAULT_SCENARIO,
  onSelectScenario,
  disabled = false
}) {
  const handleSelect = (scenarioId) => {
    if (disabled) return;
    if (onSelectScenario) {
      onSelectScenario(scenarioId);
    }
  };

  return (
    <div className="rounded-xl border border-indigo-900/60 bg-slate-950/70 p-5 space-y-4 shadow-lg backdrop-blur-md">
      
      {/* Header Section — Clear Demo/Simulation Labeling */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400 mb-0.5">
            <FlaskConical className="h-4 w-4" />
            <span>Demo Payment Scenario</span>
          </div>
          <p className="text-xs text-slate-400">
            Choose the simulated outcome for the next payment attempt.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 self-start sm:self-auto">
          <Sparkles className="h-3 w-3 text-indigo-400" />
          <span>Demo Controller</span>
        </span>
      </div>

      {/* Accessible Radio Card Group */}
      <div 
        role="radiogroup" 
        aria-label="Demo Payment Scenario"
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {PAYMENT_SCENARIOS.map((scenario) => {
          const isSelected = selectedScenario === scenario.id;
          const IconComponent = SCENARIO_ICONS[scenario.id] || FlaskConical;

          return (
            <label
              key={scenario.id}
              onClick={() => handleSelect(scenario.id)}
              className={`
                relative flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none
                focus-within:ring-2 focus-within:ring-indigo-400 focus-within:ring-offset-2 focus-within:ring-offset-slate-950
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-500/50 hover:bg-slate-900/80'}
                ${isSelected 
                  ? 'border-indigo-500 bg-gradient-to-r from-indigo-950/40 via-slate-900/90 to-slate-900/90 text-white shadow-md shadow-indigo-950/30' 
                  : 'border-slate-800 bg-slate-900/40 text-slate-300'}
              `}
            >
              {/* Native Radio Input for Accessibility */}
              <input
                type="radio"
                name="payment_demo_scenario"
                value={scenario.id}
                checked={isSelected}
                disabled={disabled}
                onChange={() => handleSelect(scenario.id)}
                className="sr-only"
                aria-checked={isSelected}
              />

              {/* Custom Radio Indicator Dot */}
              <div className="pt-0.5 shrink-0">
                <div 
                  className={`
                    h-4 w-4 rounded-full border flex items-center justify-center transition-all
                    ${isSelected 
                      ? 'border-indigo-400 bg-indigo-500 ring-2 ring-indigo-400/30' 
                      : 'border-slate-600 bg-slate-800'}
                  `}
                >
                  {isSelected && (
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </div>
              </div>

              {/* Scenario Info */}
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs sm:text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
                    <IconComponent className={`h-3.5 w-3.5 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span>{scenario.label}</span>
                  </span>

                  {isSelected && (
                    <span className="text-[10px] uppercase font-bold text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800/80">
                      Active
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-snug">
                  {scenario.description}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
