import React from 'react';
import { FinancialComparison, Platform } from '../types/audit';
import { DollarSign, CheckCircle2, TrendingDown, ArrowRightLeft, ShieldCheck, Tag } from 'lucide-react';

interface FinancialSummaryCardProps {
  financial: FinancialComparison;
  product1: { name: string; platform: Platform };
  product2: { name: string; platform: Platform };
}

export const FinancialSummaryCard: React.FC<FinancialSummaryCardProps> = ({
  financial,
  product1,
  product2,
}) => {
  const {
    p1Base,
    p1Ship,
    p1Total,
    p2Base,
    p2Ship,
    p2Total,
    diffNominal,
    diffPercent,
    cheaperSlot,
    summaryText,
  } = financial;

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const isP1Cheaper = cheaperSlot === 'p1';
  const isP2Cheaper = cheaperSlot === 'p2';
  const isEqual = cheaperSlot === 'equal';

  return (
    <div className="bg-slate-900/95 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
      {/* Top Banner with Direct Verdict */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-semibold">
              Auditoria Financeira Direta
            </span>
            <h3 className="text-base font-bold text-white">Resumo de Preço e Desembolso Total</h3>
          </div>
        </div>

        {/* Global summary badge */}
        {!isEqual ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-inner">
            <TrendingDown className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {isP1Cheaper ? 'Produto 1' : 'Produto 2'} é {formatCurrency(diffNominal)} ({diffPercent}%) mais barato
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
            <ArrowRightLeft className="w-4 h-4 text-slate-400" />
            <span>Valores Finais Idênticos</span>
          </div>
        )}
      </div>

      {/* Main Grid: Slot A vs Slot B Cards */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        {/* Slot A Card */}
        <div
          className={`relative rounded-xl p-5 border transition-all ${
            isP1Cheaper
              ? 'bg-emerald-950/20 border-emerald-500/50 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/20'
              : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          {/* Best Value Badge */}
          {isP1Cheaper && (
            <div className="absolute -top-3 right-4 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-bold shadow-md uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Menor Custo na Porta
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[11px] font-mono font-bold uppercase rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Produto 1
              </span>
              <span className="text-xs text-slate-400 font-medium">({product1.platform})</span>
            </div>
          </div>

          <h4 className="text-sm font-semibold text-slate-100 line-clamp-1 mb-4" title={product1.name}>
            {product1.name || 'Produto 1'}
          </h4>

          {/* Pricing breakdown */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80 font-mono text-xs text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Preço do Anúncio:</span>
              <span className="font-semibold text-slate-200">{formatCurrency(p1Base)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Frete Estimado:</span>
              <span className={p1Ship === 0 ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
                {p1Ship === 0 ? 'Grátis (R$ 0,00)' : formatCurrency(p1Ship)}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-baseline justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">Desembolso Total:</span>
              <span className={`text-xl font-bold ${isP1Cheaper ? 'text-emerald-400' : 'text-white'}`}>
                {formatCurrency(p1Total)}
              </span>
            </div>
          </div>
        </div>

        {/* Slot B Card */}
        <div
          className={`relative rounded-xl p-5 border transition-all ${
            isP2Cheaper
              ? 'bg-emerald-950/20 border-emerald-500/50 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/20'
              : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          {/* Best Value Badge */}
          {isP2Cheaper && (
            <div className="absolute -top-3 right-4 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-bold shadow-md uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Menor Custo na Porta
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[11px] font-mono font-bold uppercase rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Produto 2
              </span>
              <span className="text-xs text-slate-400 font-medium">({product2.platform})</span>
            </div>
          </div>

          <h4 className="text-sm font-semibold text-slate-100 line-clamp-1 mb-4" title={product2.name}>
            {product2.name || 'Produto 2'}
          </h4>

          {/* Pricing breakdown */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80 font-mono text-xs text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Preço do Anúncio:</span>
              <span className="font-semibold text-slate-200">{formatCurrency(p2Base)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Frete Estimado:</span>
              <span className={p2Ship === 0 ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
                {p2Ship === 0 ? 'Grátis (R$ 0,00)' : formatCurrency(p2Ship)}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-baseline justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">Desembolso Total:</span>
              <span className={`text-xl font-bold ${isP2Cheaper ? 'text-emerald-400' : 'text-white'}`}>
                {formatCurrency(p2Total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Direct takeaway footer */}
      <div className="bg-slate-950/70 px-6 py-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-cyan-400" />
          <span>{summaryText}</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Cálculo com frete incluso</span>
        </div>
      </div>
    </div>
  );
};
