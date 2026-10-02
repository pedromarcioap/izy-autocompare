import React from 'react';
import { SAMPLE_PRESETS, SamplePreset } from '../data/samplePresets';
import { Sparkles, Headphones, BatteryCharging, Watch, Zap } from 'lucide-react';

interface PresetBarProps {
  onSelectPreset: (preset: SamplePreset) => void;
  activePresetId?: string;
}

export const PresetBar: React.FC<PresetBarProps> = ({ onSelectPreset, activePresetId }) => {
  const getIcon = (id: string) => {
    switch (id) {
      case 'tws-earbuds':
        return <Headphones className="w-3.5 h-3.5 text-cyan-400" />;
      case 'power-bank':
        return <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />;
      case 'smartwatch':
        return <Watch className="w-3.5 h-3.5 text-amber-400" />;
      case 'charger-gan':
        return <Zap className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 sm:p-4 shadow-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-300">
            Exemplos Prontos para Teste Instantâneo:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {SAMPLE_PRESETS.map(preset => {
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/50 shadow-sm ring-1 ring-cyan-500/20 font-semibold'
                    : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                {getIcon(preset.id)}
                <span>{preset.title.split(':')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
