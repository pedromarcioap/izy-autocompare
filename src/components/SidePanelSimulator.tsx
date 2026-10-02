import React, { useState, useEffect, useMemo } from 'react';
import { SlotsState, ProductSlot, DynamicComparisonResult, ComparisonStatus } from '../types/extension';
import { performAIAudit } from '../services/aiAuditService';
import {
  Zap,
  Trash2,
  Copy,
  CheckCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Award,
  Sparkles,
  RefreshCw,
  Cpu,
  Layers,
} from 'lucide-react';

interface SidePanelSimulatorProps {
  slots: SlotsState;
  onCaptureToFreeSlot: () => void;
  onCaptureToSlot: (slotIndex: number) => void;
  onClearSlot: (slotIndex: number) => void;
  onClearAllSlots: () => void;
}

export const SidePanelSimulator: React.FC<SidePanelSimulatorProps> = ({
  slots,
  onCaptureToFreeSlot,
  onCaptureToSlot,
  onClearSlot,
  onClearAllSlots,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'divergent' | 'equal' | 'missing'>('all');
  const [copied, setCopied] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [aiResult, setAiResult] = useState<DynamicComparisonResult | null>(null);

  const activeProducts = useMemo(
    () => slots.filter((s): s is ProductSlot => s !== null),
    [slots]
  );
  const activeCount = activeProducts.length;

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Run AI Audit whenever active products change
  const triggerAIAudit = async () => {
    if (activeCount < 2) {
      setAiResult(null);
      return;
    }
    setIsAuditing(true);
    try {
      const res = await performAIAudit(slots);
      setAiResult(res);
    } catch (e) {
      console.error('Audit failed:', e);
    } finally {
      setIsAuditing(false);
    }
  };

  useEffect(() => {
    triggerAIAudit();
  }, [slots]);

  // Financial calculations
  const minTotal = useMemo(() => {
    if (activeProducts.length === 0) return 0;
    return Math.min(...activeProducts.map(p => (p.price || 0) + (p.shipping || 0)));
  }, [activeProducts]);

  const cheapestProduct = useMemo(() => {
    return activeProducts.find(p => (p.price || 0) + (p.shipping || 0) === minTotal);
  }, [activeProducts, minTotal]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    if (!aiResult) return [];
    return aiResult.comparison_matrix.filter(row => {
      // Query search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = row.attribute_name.toLowerCase().includes(q);
        const matchesS1 = row.slot_1_value.toLowerCase().includes(q);
        const matchesOther = Object.values(row.comparisons).some(c =>
          c?.value.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesS1 && !matchesOther) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const hasStatus = Object.values(row.comparisons).some(
          c => c?.status === statusFilter
        );
        if (!hasStatus) return false;
      }

      return true;
    });
  }, [aiResult, searchQuery, statusFilter]);

  // Status Badge Renderer
  const renderStatusBadge = (status: ComparisonStatus) => {
    switch (status) {
      case 'equal':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            [Idêntico]
          </span>
        );
      case 'divergent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/40">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            [Divergência]
          </span>
        );
      case 'missing':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700">
            <HelpCircle className="w-3 h-3 text-slate-500" />
            [Não informado]
          </span>
        );
    }
  };

  // Copy Full Comparison Report
  const handleCopyReport = () => {
    if (activeProducts.length < 2 || !aiResult) return;

    let report = `📊 *AUTOCOMPARE MULTI-MARKETPLACE (AUDITORIA IA)*\n`;
    report += `🏷️ *Categoria Detectada:* ${aiResult.detected_category}\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    activeProducts.forEach(p => {
      const total = (p.price || 0) + (p.shipping || 0);
      report += `📦 *Slot ${p.id} (${p.platform}):* ${p.title}\n`;
      report += `💰 *Total:* ${formatCurrency(total)} (Base: ${formatCurrency(p.price)} | Frete: ${formatCurrency(p.shipping)})\n`;
    });
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `⚖️ *VEREDITO EXECUTIVO:*\n${aiResult.executive_summary}\n\n`;
    report += `🔍 *MATRIZ DE CONFRONTO TÉCNICO (BASE: SLOT 1):*\n`;
    aiResult.comparison_matrix.forEach(row => {
      report += `• *${row.attribute_name}:* Slot 1 = "${row.slot_1_value}"`;
      for (let i = 2; i <= 5; i++) {
        const comp = row.comparisons[`slot_${i}`];
        if (comp && slots[i - 1]) {
          report += ` | Slot ${i} = "${comp.value}" [${comp.status}]`;
        }
      }
      report += `\n`;
    });
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `Gerado via AutoCompare Chrome Extension`;

    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-sans">
      {/* SidePanel Chrome Header */}
      <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black text-sm shadow-md">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-extrabold text-white tracking-tight">AutoCompare</h3>
                <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800/50 flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  IA Dinâmica
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">EXTRAÇÃO UNIVERSAL & AGNÓSTICA</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={triggerAIAudit}
              disabled={isAuditing || activeCount < 2}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-cyan-950/70 text-cyan-300 hover:bg-cyan-900/80 border border-cyan-800/50 transition-colors disabled:opacity-40"
              title="Re-auditar atributos com IA"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline">{isAuditing ? 'Processando...' : 'Re-auditar IA'}</span>
            </button>

            <button
              type="button"
              onClick={onClearAllSlots}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 border border-slate-700 hover:border-rose-700/50 transition-colors"
              title="Limpar todos os 5 slots"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          </div>
        </div>

        {/* Master Capture Button */}
        <button
          type="button"
          onClick={onCaptureToFreeSlot}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs tracking-wide uppercase shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/40 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <span>📥 Capturar Aba Atual para o Slot Livre</span>
        </button>

        {/* Slot Selector Direct Bar */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
          <span>Ou capture para slot específico:</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map(idx => (
              <button
                key={idx}
                type="button"
                onClick={() => onCaptureToSlot(idx)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all ${
                  slots[idx] !== null
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                }`}
              >
                Slot {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SidePanel Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* 5-Slot Cards Grid */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>📦 Slots de Produtos Ativos ({activeCount}/5)</span>
            </span>
            <span className="text-[11px] text-slate-500">
              {5 - activeCount} {5 - activeCount === 1 ? 'slot livre' : 'slots livres'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {slots.map((slot, idx) => {
              if (slot) {
                const isShopee = slot.platform === 'Shopee';
                const total = (slot.price || 0) + (slot.shipping || 0);
                const isBaseSlot = idx === 0;

                return (
                  <div
                    key={idx}
                    className={`relative bg-slate-900 rounded-xl p-3 flex flex-col justify-between gap-2 shadow-md transition-all border ${
                      isBaseSlot
                        ? 'border-cyan-500/50 ring-1 ring-cyan-500/20 bg-gradient-to-b from-cyan-950/20 to-slate-900'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded ${
                            isShopee
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          Slot {idx + 1} • {slot.platform}
                          {isBaseSlot && ' (Base)'}
                        </span>
                        <button
                          type="button"
                          onClick={() => onClearSlot(idx)}
                          className="text-slate-500 hover:text-rose-400 p-0.5 transition-colors"
                          title="Limpar este slot"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="flex items-center gap-2 my-1">
                        {slot.image ? (
                          <img
                            src={slot.image}
                            alt=""
                            className="w-9 h-9 object-cover rounded-md border border-slate-800 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 bg-slate-800 rounded-md flex items-center justify-center text-sm">
                            📦
                          </div>
                        )}
                        <div className="overflow-hidden flex-1">
                          <h4
                            className="text-xs font-semibold text-slate-200 truncate"
                            title={slot.title}
                          >
                            {slot.title}
                          </h4>
                          <span className="text-xs font-bold text-cyan-400 font-mono">
                            {formatCurrency(total)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                      <span>{Object.keys(slot.specs).length} specs</span>
                      <button
                        type="button"
                        onClick={() => onCaptureToSlot(idx)}
                        className="text-cyan-400 hover:text-cyan-300 font-medium"
                      >
                        Recapturar
                      </button>
                    </div>
                  </div>
                );
              }

              // Empty slot placeholder
              return (
                <div
                  key={idx}
                  className="bg-slate-950/60 border border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center text-center gap-1.5 transition-all"
                >
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                    Slot {idx + 1} Livre {idx === 0 && '(Base)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onCaptureToSlot(idx)}
                    className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/50 hover:bg-cyan-900/60 px-2.5 py-1 rounded-lg border border-cyan-800/40 transition-colors"
                  >
                    + Capturar Aba
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Comparison Section (Rendered when >= 2 slots active) */}
        {activeCount >= 2 ? (
          <div className="space-y-5 pt-2">
            {/* Dynamic Inferred Category Banner */}
            {aiResult && (
              <div className="p-3 bg-gradient-to-r from-cyan-950/70 via-slate-900 to-cyan-950/70 border border-cyan-800/40 rounded-xl flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-xs text-slate-300">
                    <strong className="text-white">Categoria Detectada pela IA:</strong>{' '}
                    <span className="text-cyan-300 font-semibold font-mono bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/50">
                      {aiResult.detected_category}
                    </span>
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                  Extração 100% Dinâmica & Agnóstica
                </span>
              </div>
            )}

            {/* Block 1: Financial Matrix */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>💰 Matriz Financeira ({activeCount} Produtos)</span>
                </h4>
                <span className="text-[11px] text-emerald-400 font-semibold">
                  ★ Menor Desembolso: Slot {cheapestProduct?.id} ({formatCurrency(minTotal)})
                </span>
              </div>

              <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-[11px] font-mono uppercase text-slate-400 border-b border-slate-800">
                      <th className="py-2.5 px-3 min-w-[130px] font-semibold">Indicador</th>
                      {activeProducts.map(p => (
                        <th key={p.id} className="py-2.5 px-3 min-w-[130px] font-semibold">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px]">
                              Slot {p.id}
                              {p.id === 1 && ' (Base)'}
                            </span>
                            <span className="truncate max-w-[80px]">{p.platform}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-400">Preço Anunciado</td>
                      {activeProducts.map(p => (
                        <td key={p.id} className="py-2 px-3 font-mono text-slate-200">
                          {formatCurrency(p.price)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-400">Frete Estimado</td>
                      {activeProducts.map(p => (
                        <td
                          key={p.id}
                          className={`py-2 px-3 font-mono ${
                            p.shipping === 0 ? 'text-emerald-400 font-semibold' : 'text-slate-300'
                          }`}
                        >
                          {p.shipping === 0 ? 'Grátis' : formatCurrency(p.shipping)}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-slate-950/70 font-bold">
                      <td className="py-2.5 px-3 text-slate-100 uppercase tracking-wide">
                        DESEMBOLSO TOTAL
                      </td>
                      {activeProducts.map(p => {
                        const total = (p.price || 0) + (p.shipping || 0);
                        const isCheapest = total === minTotal;

                        return (
                          <td key={p.id} className="py-2.5 px-3 font-mono">
                            <div className="flex flex-col">
                              <span
                                className={`text-sm ${
                                  isCheapest ? 'text-emerald-400 font-extrabold' : 'text-slate-100'
                                }`}
                              >
                                {formatCurrency(total)}
                              </span>
                              {isCheapest && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.2 rounded mt-0.5 w-fit">
                                  ★ Mais Económico
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-400">Diferença vs Menor</td>
                      {activeProducts.map(p => {
                        const total = (p.price || 0) + (p.shipping || 0);
                        const diff = total - minTotal;
                        const percent = minTotal > 0 ? Math.round((diff / minTotal) * 100) : 0;

                        if (diff === 0) {
                          return (
                            <td key={p.id} className="py-2 px-3 text-emerald-400 font-semibold text-[11px]">
                              ✓ Referência (0%)
                            </td>
                          );
                        }

                        return (
                          <td key={p.id} className="py-2 px-3 font-mono text-rose-400 text-[11px]">
                            + {formatCurrency(diff)} (+{percent}%)
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Block 2: Dynamic Confrontation Matrix (Slot 1 as Parameter) */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Confronto Cruzado Dinâmico (Parâmetro: Slot 1)</span>
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status filter tabs */}
                  <div className="flex items-center gap-1 text-xs">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-2 py-0.5 rounded text-[11px] transition-all ${
                        statusFilter === 'all'
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setStatusFilter('divergent')}
                      className={`px-2 py-0.5 rounded text-[11px] transition-all ${
                        statusFilter === 'divergent'
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Divergências
                    </button>
                    <button
                      onClick={() => setStatusFilter('equal')}
                      className={`px-2 py-0.5 rounded text-[11px] transition-all ${
                        statusFilter === 'equal'
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Idênticos
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Buscar atributo..."
                      className="pl-7 pr-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-36"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl shadow-lg max-h-[460px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-950 text-[11px] font-mono uppercase text-slate-400 border-b border-slate-800">
                      <th className="py-2.5 px-3 min-w-[150px] font-semibold bg-slate-950">
                        Atributo Normalizado
                      </th>
                      <th className="py-2.5 px-3 min-w-[140px] font-semibold bg-slate-950 text-cyan-300">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                          <span>Slot 1 (Base Referência)</span>
                        </div>
                      </th>
                      {slots.slice(1).map((s, idx) => {
                        const slotNum = idx + 2;
                        if (!s) return null;
                        return (
                          <th
                            key={slotNum}
                            className="py-2.5 px-3 min-w-[140px] font-semibold bg-slate-950"
                          >
                            <div className="font-bold text-slate-200">Slot {slotNum}</div>
                            <div className="text-[10px] text-slate-500 font-normal truncate max-w-[100px]">
                              {s.title}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {isAuditing ? (
                      <tr>
                        <td
                          colSpan={activeCount + 1}
                          className="py-12 text-center text-slate-400 text-xs"
                        >
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-2" />
                          <p className="font-semibold text-white">
                            A IA está minerando e normalizando os atributos dos anúncios...
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Executando etapas de mineração, fusão semântica e confronto com o Slot 1.
                          </p>
                        </td>
                      </tr>
                    ) : filteredRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={activeCount + 1}
                          className="py-8 text-center text-slate-500 text-xs"
                        >
                          Nenhum atributo encontrado para os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                          {/* Col 1: Attribute Name */}
                          <td className="py-2.5 px-3 font-semibold text-slate-200 bg-slate-950/60 align-top">
                            {row.attribute_name}
                          </td>

                          {/* Col 2: Slot 1 (Base) */}
                          <td className="py-2.5 px-3 font-mono text-slate-100 bg-cyan-950/20 border-r border-cyan-900/30 align-top">
                            <span
                              className={
                                row.slot_1_value === 'Não informado'
                                  ? 'text-slate-500 italic'
                                  : 'font-semibold text-cyan-200'
                              }
                            >
                              {row.slot_1_value}
                            </span>
                          </td>

                          {/* Cols 3 to 6: Slot 2 to 5 Comparisons */}
                          {slots.slice(1).map((s, idx) => {
                            const slotNum = idx + 2;
                            if (!s) return null;
                            const comp = row.comparisons[`slot_${slotNum}`];

                            if (!comp) {
                              return (
                                <td key={slotNum} className="py-2.5 px-3 font-mono text-slate-600 text-center">
                                  —
                                </td>
                              );
                            }

                            return (
                              <td
                                key={slotNum}
                                className={`py-2.5 px-3 font-mono leading-relaxed align-top ${
                                  comp.status === 'divergent'
                                    ? 'bg-amber-950/15'
                                    : comp.status === 'equal'
                                    ? 'bg-emerald-950/10'
                                    : ''
                                }`}
                              >
                                <div className="flex flex-col gap-1">
                                  <span
                                    className={
                                      comp.value === 'Não informado'
                                        ? 'text-slate-500 italic text-[11px]'
                                        : 'text-slate-200'
                                    }
                                  >
                                    {comp.value}
                                  </span>
                                  <div>{renderStatusBadge(comp.status)}</div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Block 3: Executive Summary & Copy Report */}
            {aiResult && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    <span>Veredito Técnico Executivo da IA</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 hover:border-cyan-500 transition-colors shadow-sm"
                  >
                    {copied ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Copiar Relatório</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3.5 rounded-lg border border-slate-800/80 space-y-2">
                  <p className="text-slate-200 font-medium">
                    {aiResult.executive_summary}
                  </p>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-800">
                    <span>Base de Confronto: Slot 1 ({slots[0]?.title})</span>
                    <span className="font-mono">{filteredRows.length} atributos auditados</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Empty State when < 2 slots filled */
          <div className="p-8 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-xl space-y-2">
            <div className="text-3xl">🛍️</div>
            <h4 className="text-sm font-bold text-slate-200">
              Capture pelo menos 2 produtos ({activeCount}/2)
            </h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Abra as abas no navegador simulado à esquerda e clique em <strong>"Capturar Aba Atual"</strong> para
              gerar a matriz comparativa universal e agnóstica via IA.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
