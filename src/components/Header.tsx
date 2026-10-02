import React from 'react';
import { Scale, Sparkles, RefreshCw, Zap } from 'lucide-react';
import { SAMPLE_PRESETS, SamplePreset } from '../data/samplePresets';

interface HeaderProps {
  onSelectPreset: (preset: SamplePreset) => void;
  onReset: () => void;
  hasAudited: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onSelectPreset, onReset, hasAudited }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                AuditSpec <span className="text-cyan-400 font-mono text-xs uppercase tracking-widest px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40">Audit Engine</span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Auditoria técnica direta e comparativo financeiro de e-commerce
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          {/* Presets dropdown */}
          <div className="relative group">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500/60 text-slate-200 hover:text-white transition-all shadow-sm"
              title="Carregar exemplo pronto"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Exemplos de Demonstração</span>
            </button>
            <div className="absolute right-0 mt-1 w-72 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl opacity-0 translate-y-1 invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible transition-all duration-150 z-50">
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                Selecione um comparativo real
              </div>
              {SAMPLE_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => onSelectPreset(preset)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-xs text-slate-300 hover:text-white flex flex-col gap-0.5 transition-colors"
                >
                  <span className="font-semibold text-slate-200 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-cyan-400" />
                    {preset.title.split(':')[0]}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate">{preset.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reset button */}
          <button
            onClick={onReset}
            type="button"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            title="Limpar todos os campos"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Limpar</span>
          </button>
        </div>
      </div>
    </header>
  );
};
