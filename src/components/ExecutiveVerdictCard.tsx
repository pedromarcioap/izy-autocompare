import React, { useState } from 'react';
import { ExecutiveVerdict, FinancialComparison, SpecItem } from '../types/audit';
import {
  Award,
  ThumbsUp,
  Check,
  Copy,
  CheckCheck,
  Share2,
  Sparkles,
  TrendingUp,
  Scale,
  HelpCircle,
} from 'lucide-react';

interface ExecutiveVerdictCardProps {
  verdict: ExecutiveVerdict;
  financial: FinancialComparison;
  product1: { name: string; platform: string; totalPrice: number };
  product2: { name: string; platform: string; totalPrice: number };
  specs: SpecItem[];
}

export const ExecutiveVerdictCard: React.FC<ExecutiveVerdictCardProps> = ({
  verdict,
  financial,
  product1,
  product2,
  specs,
}) => {
  const [copied, setCopied] = useState(false);

  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleCopyReport = () => {
    const divergentSpecs = specs.filter(s => s.status === 'divergent');
    const identicalSpecs = specs.filter(s => s.status === 'identical');

    const report = `📊 *AUDITORIA TÉCNICA E FINANCEIRA DE PRODUTOS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 *PRODUTO 1:* ${product1.name || 'Produto 1'} (${product1.platform})
💰 *Valor Total:* ${formatBRL(financial.p1Total)} (Base: ${formatBRL(financial.p1Base)} | Frete: ${formatBRL(financial.p1Ship)})

📦 *PRODUTO 2:* ${product2.name || 'Produto 2'} (${product2.platform})
💰 *Valor Total:* ${formatBRL(financial.p2Total)} (Base: ${formatBRL(financial.p2Base)} | Frete: ${formatBRL(financial.p2Ship)})

💵 *ANÁLISE DE PREÇO:*
- ${financial.summaryText}

🏆 *VANTAGENS EXCLUSIVAS DO PRODUTO 1:*
${verdict.strengthsP1.map(s => `- ${s}`).join('\n')}

🏆 *VANTAGENS EXCLUSIVAS DO PRODUTO 2:*
${verdict.strengthsP2.map(s => `- ${s}`).join('\n')}

⚖️ *VEREDITO TÉCNICO EXECUTIVO:*
${verdict.costBenefitVerdict}

🔍 *PRINCIPAIS DIVERGÊNCIAS TÉCNICAS (${divergentSpecs.length}):*
${divergentSpecs.map(d => `- *${d.label}:* ${d.val1} vs ${d.val2} (${d.diffNote || 'Divergente'})`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Gerado via AuditSpec`;

    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getWinnerBadge = () => {
    if (verdict.recommendation === 'p1') {
      return {
        label: 'Recomendação: Escolher Produto 1',
        style: 'bg-cyan-500 text-slate-950 font-bold',
      };
    }
    if (verdict.recommendation === 'p2') {
      return {
        label: 'Recomendação: Escolher Produto 2',
        style: 'bg-indigo-500 text-slate-950 font-bold',
      };
    }
    return {
      label: 'Decisão Situacional / Empate Técnico',
      style: 'bg-amber-500 text-slate-950 font-bold',
    };
  };

  const winnerBadge = getWinnerBadge();

  return (
    <div className="bg-slate-900/95 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
      {/* Card Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-semibold">
              Conclusão e Tomada de Decisão
            </span>
            <h3 className="text-base font-bold text-white">Veredito Técnico Executivo</h3>
          </div>
        </div>

        {/* Copy Report Action */}
        <button
          onClick={handleCopyReport}
          type="button"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-slate-200 border border-slate-700 hover:border-cyan-500/60 transition-all shadow-sm"
        >
          {copied ? (
            <>
              <CheckCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">Relatório Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-cyan-400" />
              <span>Copiar Relatório Completo</span>
            </>
          )}
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Recommendation highlight card */}
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 rounded-xl p-5 border border-slate-800/80 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <span className={`px-3 py-1 rounded-full text-xs uppercase tracking-wider ${winnerBadge.style}`}>
              {winnerBadge.label}
            </span>
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-cyan-400" />
              Análise Racional de Custo x Entrega
            </span>
          </div>

          <h4 className="text-base font-bold text-white mb-2">{verdict.verdictTitle}</h4>
          <p className="text-sm text-slate-300 leading-relaxed font-sans">{verdict.costBenefitVerdict}</p>
        </div>

        {/* Strengths Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Strengths P1 */}
          <div className="bg-slate-950/60 rounded-xl p-5 border border-cyan-900/30">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-800/80">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              <h5 className="text-xs font-bold font-mono uppercase text-cyan-300 tracking-wider">
                O que o Produto 1 tem de melhor
              </h5>
            </div>
            <ul className="space-y-2">
              {verdict.strengthsP1.map((strength, idx) => (
                <li key={idx} className="text-xs text-slate-200 flex items-start gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Strengths P2 */}
          <div className="bg-slate-950/60 rounded-xl p-5 border border-indigo-900/30">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-800/80">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
              <h5 className="text-xs font-bold font-mono uppercase text-indigo-300 tracking-wider">
                O que o Produto 2 tem de melhor
              </h5>
            </div>
            <ul className="space-y-2">
              {verdict.strengthsP2.map((strength, idx) => (
                <li key={idx} className="text-xs text-slate-200 flex items-start gap-2">
                  <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Decision Rule Formula */}
        <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>
              <strong>Diferença de Desembolso:</strong>{' '}
              <span className="text-slate-200 font-mono font-semibold">{formatBRL(financial.diffNominal)}</span> ({financial.diffPercent}%)
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Auditado em {new Date().toLocaleDateString('pt-BR')}
          </div>
        </div>
      </div>
    </div>
  );
};
