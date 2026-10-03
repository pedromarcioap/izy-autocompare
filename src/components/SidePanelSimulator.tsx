import React, { useState, useEffect, useMemo } from 'react';
import {
  SlotsState,
  ProductSlot,
  DynamicComparisonResult,
  DynamicComparisonRow,
  ComparisonStatus,
  PairwiseComparison,
} from '../types/extension';
import {
  performAIAudit,
  generateDynamicFallbackAudit,
  SYNONYM_MAP,
  cleanStr,
} from '../services/aiAuditService';
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
  ArrowRightLeft,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Info,
  Lightbulb,
  ShieldAlert,
  Flame,
  Check,
  LayoutGrid,
  Table as TableIcon,
  Tag,
  ArrowUpRight,
} from 'lucide-react';

export { SYNONYM_MAP };
export const normalizeSemanticKey = cleanStr;

export function extractAndBuildComparisonMatrix(
  slots: (ProductSlot | null)[],
  baseSlotId = 1
): DynamicComparisonResult {
  return generateDynamicFallbackAudit(slots, baseSlotId);
}

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
  const [selectedBaseSlotId, setSelectedBaseSlotId] = useState<number>(1);
  const [activeTabMode, setActiveTabMode] = useState<'matrix' | 'pairwise'>('matrix');
  const [matrixViewMode, setMatrixViewMode] = useState<'categorized' | 'table'>('categorized');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'divergent' | 'superior' | 'equal' | 'missing'>('all');
  const [copied, setCopied] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [aiResult, setAiResult] = useState<DynamicComparisonResult | null>(null);

  // Expanded rows & categories state
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [showAllAIInsights, setShowAllAIInsights] = useState(true);
  const [showInsightsBanner, setShowInsightsBanner] = useState(true);

  // Pairwise selector state
  const [pairSlotA, setPairSlotA] = useState<number>(1);
  const [pairSlotB, setPairSlotB] = useState<number>(2);

  const activeProducts = useMemo(
    () => slots.filter((s): s is ProductSlot => s !== null),
    [slots]
  );
  const activeCount = activeProducts.length;

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Ensure base slot is active
  useEffect(() => {
    if (activeProducts.length > 0 && !slots[selectedBaseSlotId - 1]) {
      setSelectedBaseSlotId(activeProducts[0].id);
    }
    if (activeProducts.length >= 2) {
      if (!slots[pairSlotA - 1]) setPairSlotA(activeProducts[0].id);
      if (!slots[pairSlotB - 1]) setPairSlotB(activeProducts[1].id);
    }
  }, [slots, activeProducts, selectedBaseSlotId, pairSlotA, pairSlotB]);

  // Synchronous local computation + AI enhancement
  const localComputedResult = useMemo(() => {
    if (activeCount < 2) return null;
    return extractAndBuildComparisonMatrix(slots, selectedBaseSlotId);
  }, [slots, selectedBaseSlotId, activeCount]);

  // Run AI Audit whenever slots or base slot change
  const triggerAIAudit = async () => {
    if (activeCount < 2) {
      setAiResult(null);
      return;
    }
    setIsAuditing(true);
    try {
      const res = await performAIAudit(slots, selectedBaseSlotId);
      setAiResult(res);
    } catch (e) {
      console.error('Audit failed, using local matrix:', e);
      setAiResult(localComputedResult);
    } finally {
      setIsAuditing(false);
    }
  };

  useEffect(() => {
    if (localComputedResult) {
      setAiResult(localComputedResult);
    }
    triggerAIAudit();
  }, [slots, selectedBaseSlotId]);

  // Financial calculations
  const minTotal = useMemo(() => {
    if (activeProducts.length === 0) return 0;
    return Math.min(...activeProducts.map(p => (p.price || 0) + (p.shipping || 0)));
  }, [activeProducts]);

  const cheapestProduct = useMemo(() => {
    return activeProducts.find(p => (p.price || 0) + (p.shipping || 0) === minTotal);
  }, [activeProducts, minTotal]);

  const activeMatrixResult = aiResult || localComputedResult;

  // Filtered rows for Matrix
  const filteredRows = useMemo(() => {
    if (!activeMatrixResult) return [];
    return activeMatrixResult.comparison_matrix.filter(row => {
      // Query search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = row.attribute_name.toLowerCase().includes(q);
        const matchesCat = (row.category || '').toLowerCase().includes(q);
        const matchesAI = (row.ai_interpretation?.summary || '').toLowerCase().includes(q);
        const matchesAnyValue = Object.values(row.slot_values || {}).some(v =>
          v?.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesCat && !matchesAI && !matchesAnyValue) return false;
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
  }, [activeMatrixResult, searchQuery, statusFilter]);

  // Group filtered rows by category
  const categorizedRows = useMemo(() => {
    const groups: Record<string, DynamicComparisonRow[]> = {};
    filteredRows.forEach(row => {
      const cat = row.category || 'Especificações Gerais';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(row);
    });
    return groups;
  }, [filteredRows]);

  // Expand all categories by default on first load
  useEffect(() => {
    const initialExp: Record<string, boolean> = {};
    Object.keys(categorizedRows).forEach(cat => {
      initialExp[cat] = true;
    });
    setExpandedCategories(prev => ({ ...initialExp, ...prev }));
  }, [activeMatrixResult?.detected_category]);

  // Status counts for filter badges
  const filterCounts = useMemo(() => {
    if (!activeMatrixResult) return { all: 0, divergent: 0, superior: 0, equal: 0, missing: 0 };
    const matrix = activeMatrixResult.comparison_matrix;
    let divergent = 0;
    let superior = 0;
    let equal = 0;
    let missing = 0;

    matrix.forEach(row => {
      const statuses = Object.values(row.comparisons).map(c => c?.status);
      if (statuses.includes('divergent')) divergent++;
      if (statuses.includes('superior')) superior++;
      if (statuses.includes('equal')) equal++;
      if (statuses.includes('missing')) missing++;
    });

    return {
      all: matrix.length,
      divergent,
      superior,
      equal,
      missing,
    };
  }, [activeMatrixResult]);

  // Pairwise comparison data for Slot A vs Slot B
  const activePairwise = useMemo((): PairwiseComparison | null => {
    if (!activeMatrixResult?.pairwise_matrix) return null;
    const key1 = `${pairSlotA}_vs_${pairSlotB}`;
    const key2 = `${pairSlotB}_vs_${pairSlotA}`;
    return activeMatrixResult.pairwise_matrix[key1] || activeMatrixResult.pairwise_matrix[key2] || null;
  }, [activeMatrixResult, pairSlotA, pairSlotB]);

  // Toggle row expansion
  const toggleRowExpand = (idOrName: string) => {
    setExpandedRows(prev => ({ ...prev, [idOrName]: !prev[idOrName] }));
  };

  const toggleCategoryExpand = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Status Badge Renderer
  const renderStatusBadge = (status: ComparisonStatus, label?: string, diffNote?: string) => {
    switch (status) {
      case 'base':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/50 shadow-sm">
            ★ Base Referência
          </span>
        );
      case 'superior':
        return (
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-400/60 shadow-sm">
              <Award className="w-3 h-3 text-emerald-400 shrink-0" />
              {label || 'Superior (+)'}
            </span>
            {diffNote && <span className="text-[10px] text-emerald-300/80 font-mono pl-1">{diffNote}</span>}
          </div>
        );
      case 'inferior':
        return (
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-950/70 text-rose-300 border border-rose-500/40">
              {label || 'Inferior (-)'}
            </span>
            {diffNote && <span className="text-[10px] text-rose-300/80 font-mono pl-1">{diffNote}</span>}
          </div>
        );
      case 'equal':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            {label || 'Idêntico'}
          </span>
        );
      case 'divergent':
        return (
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/40 shadow-sm">
              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
              {label || 'Divergência'}
            </span>
            {diffNote && <span className="text-[10px] text-amber-200/80 font-mono pl-1">{diffNote}</span>}
          </div>
        );
      case 'missing':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700">
            <HelpCircle className="w-3 h-3 text-slate-500 shrink-0" />
            {label || 'Não informado'}
          </span>
        );
    }
  };

  // Copy Full Comparison Report
  const handleCopyReport = () => {
    if (activeProducts.length < 2 || !activeMatrixResult) return;

    let report = `📊 *AUTOCOMPARE (AUDITORIA E INTER-RELAÇÃO DE ESPECIFICAÇÕES POR IA)*\n`;
    report += `🏷️ *Categoria Detectada:* ${activeMatrixResult.detected_category}\n`;
    report += `🎯 *Slot Base de Referência:* Slot ${selectedBaseSlotId} (${slots[selectedBaseSlotId - 1]?.title})\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    activeProducts.forEach(p => {
      const total = (p.price || 0) + (p.shipping || 0);
      report += `📦 *Slot ${p.id} (${p.platform}):* ${p.title}\n`;
      report += `💰 *Total:* ${formatCurrency(total)} (Base: ${formatCurrency(p.price)} | Frete: ${formatCurrency(p.shipping)})\n`;
    });
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `⚖️ *VEREDITO TÉCNICO DA IA:*\n${activeMatrixResult.executive_summary}\n\n`;

    if (activeMatrixResult.key_findings) {
      if (activeMatrixResult.key_findings.critical_warnings?.length) {
        report += `⚠️ *ALERTAS CRÍTICOS & ARMADILHAS:*\n`;
        activeMatrixResult.key_findings.critical_warnings.forEach(w => {
          report += `- ${w.title}: ${w.detail}\n`;
        });
        report += `\n`;
      }
      if (activeMatrixResult.key_findings.top_advantages?.length) {
        report += `🏆 *DESTAQUES TÉCNICOS:*\n`;
        activeMatrixResult.key_findings.top_advantages.forEach(a => {
          report += `- Slot ${a.slot_id} [${a.title}]: ${a.detail}\n`;
        });
        report += `\n`;
      }
    }

    report += `🔍 *MATRIZ DE ESPECIFICAÇÕES INTER-RELACIONADAS:*\n`;
    activeMatrixResult.comparison_matrix.forEach(row => {
      report += `• *[${row.category || 'Geral'}] ${row.attribute_name}:*\n`;
      activeProducts.forEach(p => {
        const val = row.slot_values[`slot_${p.id}`] || 'Não informado';
        const comp = row.comparisons[`slot_${p.id}`];
        report += `   - Slot ${p.id}: "${val}" [${comp?.statusLabel || comp?.status || 'info'}]\n`;
      });
      if (row.ai_interpretation?.summary) {
        report += `   💡 *IA:* ${row.ai_interpretation.summary}\n`;
      }
    });
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `Gerado via AutoCompare IA`;

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
                <span className="text-[10px] font-mono bg-gradient-to-r from-cyan-950 to-blue-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-700/60 flex items-center gap-1 shadow-sm">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  Interpretação IA Ativa
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">CONFRONTO TÉCNICO E INTER-RELAÇÃO DE ESPECIFICAÇÕES</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={triggerAIAudit}
              disabled={isAuditing || activeCount < 2}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-cyan-950/70 text-cyan-300 hover:bg-cyan-900/80 border border-cyan-700/50 transition-colors disabled:opacity-40"
              title="Re-auditar e cruzar dados com IA"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline">{isAuditing ? 'Analisando...' : 'Re-analisar IA'}</span>
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
          <span>Capture para slot específico:</span>
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
              const slotId = idx + 1;
              const isBase = slotId === selectedBaseSlotId;

              if (slot) {
                const isShopee = slot.platform === 'Shopee';
                const total = (slot.price || 0) + (slot.shipping || 0);

                return (
                  <div
                    key={idx}
                    className={`relative bg-slate-900 rounded-xl p-3 flex flex-col justify-between gap-2 shadow-md transition-all border ${
                      isBase
                        ? 'border-cyan-400 ring-2 ring-cyan-500/30 bg-gradient-to-b from-cyan-950/30 to-slate-900'
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
                          Slot {slotId} • {slot.platform}
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

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => setSelectedBaseSlotId(slotId)}
                        className={`px-2 py-0.5 rounded font-mono font-semibold transition-colors ${
                          isBase
                            ? 'bg-cyan-500 text-slate-950 font-bold'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {isBase ? '★ Base Ativa' : 'Definir Base'}
                      </button>

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

              return (
                <div
                  key={idx}
                  className="bg-slate-950/60 border border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center text-center gap-1.5 transition-all"
                >
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                    Slot {slotId} Livre
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
            {/* Mode Switcher & Category Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-xs text-slate-300">
                  <strong className="text-white">Categoria Detectada:</strong>{' '}
                  <span className="text-cyan-300 font-semibold font-mono bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/50">
                    {activeMatrixResult?.detected_category || 'Identificando...'}
                  </span>
                </span>
              </div>

              {/* View mode toggle */}
              <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTabMode('matrix')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                    activeTabMode === 'matrix'
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Matriz de Especificações IA</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTabMode('pairwise')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                    activeTabMode === 'pairwise'
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Confronto Par a Par (1 vs 1)</span>
                </button>
              </div>
            </div>

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
                        <th
                          key={p.id}
                          className={`py-2.5 px-3 min-w-[130px] font-semibold ${
                            p.id === selectedBaseSlotId ? 'bg-cyan-950/40 text-cyan-300' : ''
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                p.id === selectedBaseSlotId
                                  ? 'bg-cyan-500 text-slate-950 font-bold'
                                  : 'bg-slate-800 text-slate-200'
                              }`}
                            >
                              Slot {p.id}
                              {p.id === selectedBaseSlotId && ' (Base)'}
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

            {/* TAB VIEW 1: ENHANCED AI SPECIFICATION COMPARISON AREA */}
            {activeTabMode === 'matrix' && (
              <div className="space-y-4">
                {/* AI Key Insights Banner (Collapsible) */}
                {activeMatrixResult?.key_findings && (
                  <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-cyan-800/40 rounded-xl p-3.5 shadow-xl">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">
                          <Lightbulb className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <span>Insights de Inter-relação da IA</span>
                          <span className="text-[10px] text-cyan-300 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-800/60 font-mono">
                            Auto-Auditoria
                          </span>
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowInsightsBanner(!showInsightsBanner)}
                        className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1 font-mono transition-colors"
                      >
                        {showInsightsBanner ? (
                          <>
                            <span>Ocultar Destaques</span>
                            <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            <span>Ver Destaques ({activeMatrixResult.key_findings.critical_warnings?.length || 0} alertas)</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>

                    {showInsightsBanner && (
                      <div className="mt-3 space-y-2.5">
                        {/* Critical Warnings */}
                        {activeMatrixResult.key_findings.critical_warnings?.length > 0 && (
                          <div className="space-y-1.5">
                            {activeMatrixResult.key_findings.critical_warnings.map((w, wIdx) => (
                              <div
                                key={wIdx}
                                className="flex items-start gap-2 bg-amber-950/40 border border-amber-500/40 rounded-lg p-2 text-xs text-amber-200"
                              >
                                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-amber-300 font-bold">{w.title}:</strong>{' '}
                                  <span className="text-amber-100/90">{w.detail}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Top Advantages Grid */}
                        {activeMatrixResult.key_findings.top_advantages?.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {activeMatrixResult.key_findings.top_advantages.map((a, aIdx) => (
                              <div
                                key={aIdx}
                                className="flex items-start gap-2 bg-slate-900/90 border border-emerald-500/30 rounded-lg p-2 text-xs"
                              >
                                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 rounded border border-emerald-500/40 shrink-0">
                                  Slot {a.slot_id}
                                </span>
                                <div>
                                  <span className="font-semibold text-emerald-300">{a.title}</span>
                                  <p className="text-[11px] text-slate-300 leading-snug mt-0.5">{a.detail}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Convergences / Identical Specs */}
                        {activeMatrixResult.key_findings.convergences?.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-400">
                            <span className="font-bold text-slate-300">✓ Equivalências Confirmadas:</span>
                            {activeMatrixResult.key_findings.convergences.map((c, cIdx) => (
                              <span
                                key={cIdx}
                                className="bg-slate-900 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700 font-mono text-[10px]"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Specification Controls Bar */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2.5 shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-cyan-400" />
                        <span>Comparação de Especificações Técnicas</span>
                      </h4>
                      <span className="text-[11px] text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/50 font-mono">
                        Base: Slot {selectedBaseSlotId}
                      </span>
                    </div>

                    {/* View Switcher: Categorized vs Table & AI Insight Toggle */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAllAIInsights(!showAllAIInsights)}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all flex items-center gap-1.5 border ${
                          showAllAIInsights
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-700/60 shadow-sm'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                        title="Alternar exibição dos cards de análise inteligente da IA em todas as especificações"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{showAllAIInsights ? 'Insights IA Visíveis' : 'Modo Compacto'}</span>
                      </button>

                      <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                        <button
                          type="button"
                          onClick={() => setMatrixViewMode('categorized')}
                          className={`px-2.5 py-1 rounded transition-all flex items-center gap-1 ${
                            matrixViewMode === 'categorized'
                              ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="Visualização agrupada por categorias temáticas"
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                          <span>Categorias</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setMatrixViewMode('table')}
                          className={`px-2.5 py-1 rounded transition-all flex items-center gap-1 ${
                            matrixViewMode === 'table'
                              ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="Visualização em tabela plana multi-slot"
                        >
                          <TableIcon className="w-3.5 h-3.5" />
                          <span>Tabela</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Filters and Search Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                    {/* Status Filter Tabs */}
                    <div className="flex flex-wrap items-center gap-1 text-xs">
                      <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-2 py-0.5 rounded-md text-[11px] transition-all flex items-center gap-1 ${
                          statusFilter === 'all'
                            ? 'bg-cyan-500 text-slate-950 font-bold'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        <span>Todas</span>
                        <span className="opacity-70 font-mono">({filterCounts.all})</span>
                      </button>

                      <button
                        onClick={() => setStatusFilter('divergent')}
                        className={`px-2 py-0.5 rounded-md text-[11px] transition-all flex items-center gap-1 ${
                          statusFilter === 'divergent'
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-950 text-amber-400/90 hover:text-amber-300 border border-slate-800'
                        }`}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        <span>Divergências</span>
                        <span className="opacity-80 font-mono">({filterCounts.divergent})</span>
                      </button>

                      <button
                        onClick={() => setStatusFilter('superior')}
                        className={`px-2 py-0.5 rounded-md text-[11px] transition-all flex items-center gap-1 ${
                          statusFilter === 'superior'
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-slate-950 text-emerald-400/90 hover:text-emerald-300 border border-slate-800'
                        }`}
                      >
                        <Award className="w-3 h-3" />
                        <span>Vantagens (+)</span>
                        <span className="opacity-80 font-mono">({filterCounts.superior})</span>
                      </button>

                      <button
                        onClick={() => setStatusFilter('equal')}
                        className={`px-2 py-0.5 rounded-md text-[11px] transition-all flex items-center gap-1 ${
                          statusFilter === 'equal'
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Idênticos</span>
                        <span className="opacity-70 font-mono">({filterCounts.equal})</span>
                      </button>

                      <button
                        onClick={() => setStatusFilter('missing')}
                        className={`px-2 py-0.5 rounded-md text-[11px] transition-all flex items-center gap-1 ${
                          statusFilter === 'missing'
                            ? 'bg-slate-700 text-white font-bold'
                            : 'bg-slate-950 text-slate-500 hover:text-slate-300 border border-slate-800'
                        }`}
                      >
                        <HelpCircle className="w-3 h-3" />
                        <span>Omissões</span>
                        <span className="opacity-70 font-mono">({filterCounts.missing})</span>
                      </button>
                    </div>

                    {/* Search Field */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar especificação..."
                        className="pl-7 pr-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-44"
                      />
                    </div>
                  </div>

                  {/* Base Slot Switcher Direct Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                      <strong>Base de Comparação Ativa:</strong>
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {activeProducts.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedBaseSlotId(p.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                            p.id === selectedBaseSlotId
                              ? 'bg-cyan-500 text-slate-950 font-bold ring-2 ring-cyan-400 shadow-md'
                              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                          }`}
                        >
                          Slot {p.id} ({p.platform})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Loading State */}
                {isAuditing && (
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-2" />
                    <p className="font-semibold text-white text-sm">
                      A Inteligência Artificial está interpretando e inter-relacionando as especificações...
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      Normalizando nomenclaturas, verificando compatibilidades e identificando vantagens técnicas.
                    </p>
                  </div>
                )}

                {/* Empty State */}
                {!isAuditing && filteredRows.length === 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
                    <Info className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                    <p className="font-semibold text-white">Nenhuma especificação encontrada com os filtros atuais.</p>
                    <p className="text-slate-500 mt-1">Experimente limpar a busca ou selecionar o filtro "Todas".</p>
                  </div>
                )}

                {/* SPECIFICATION VIEW MODE 1: CATEGORIZED ACCORDION */}
                {!isAuditing && matrixViewMode === 'categorized' && filteredRows.length > 0 && (
                  <div className="space-y-3">
                    {Object.entries(categorizedRows).map(([categoryName, rowsInCat], catIdx) => {
                      const isCatOpen = expandedCategories[categoryName] !== false;
                      const divergencesInCat = rowsInCat.filter(r =>
                        Object.values(r.comparisons).some(c => c?.status === 'divergent')
                      ).length;

                      return (
                        <div
                          key={catIdx}
                          className="bg-slate-900 border border-slate-800/90 rounded-xl overflow-hidden shadow-lg"
                        >
                          {/* Category Accordion Header */}
                          <button
                            type="button"
                            onClick={() => toggleCategoryExpand(categoryName)}
                            className="w-full px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-950 hover:bg-slate-850 flex items-center justify-between border-b border-slate-800/80 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                              <h5 className="text-xs font-bold text-slate-100 uppercase tracking-wide">
                                {categoryName}
                              </h5>
                              <span className="text-[11px] text-slate-400 font-mono bg-slate-800 px-2 py-0.2 rounded-full">
                                {rowsInCat.length} {rowsInCat.length === 1 ? 'item' : 'itens'}
                              </span>
                              {divergencesInCat > 0 && (
                                <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.2 rounded-full border border-amber-500/40 flex items-center gap-1">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  {divergencesInCat} {divergencesInCat === 1 ? 'divergência' : 'divergências'}
                                </span>
                              )}
                            </div>

                            <div className="text-slate-400">
                              {isCatOpen ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </button>

                          {/* Category Content Rows */}
                          {isCatOpen && (
                            <div className="divide-y divide-slate-800/60">
                              {rowsInCat.map((row, rIdx) => {
                                const rowKey = row.id || row.attribute_name;
                                const isRowExpanded = expandedRows[rowKey] ?? showAllAIInsights;
                                const hasAIInsight = Boolean(row.ai_interpretation?.summary);

                                return (
                                  <div
                                    key={rIdx}
                                    className="p-3.5 hover:bg-slate-850/40 transition-all space-y-2.5"
                                  >
                                    {/* Row Top: Attribute Title & Action */}
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-slate-200">
                                            {row.attribute_name}
                                          </span>
                                          {row.ai_interpretation?.winner_slot && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded">
                                              <Award className="w-3 h-3 text-emerald-400" />
                                              Vencedor: Slot {row.ai_interpretation.winner_slot}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {hasAIInsight && (
                                        <button
                                          type="button"
                                          onClick={() => toggleRowExpand(rowKey)}
                                          className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono transition-colors shrink-0"
                                        >
                                          <Sparkles className="w-3 h-3" />
                                          <span>{isRowExpanded ? 'Recolher IA' : 'Ver Análise IA'}</span>
                                        </button>
                                      )}
                                    </div>

                                    {/* Slot Values Cards Strip */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                                      {activeProducts.map(p => {
                                        const isBaseCol = p.id === selectedBaseSlotId;
                                        const val = row.slot_values[`slot_${p.id}`] || 'Não informado';
                                        const comp = row.comparisons[`slot_${p.id}`];
                                        const status = isBaseCol ? 'base' : comp?.status || 'missing';
                                        const isWinner = row.ai_interpretation?.winner_slot === p.id;

                                        return (
                                          <div
                                            key={p.id}
                                            className={`p-2.5 rounded-lg border flex flex-col justify-between gap-1.5 transition-all ${
                                              isBaseCol
                                                ? 'bg-cyan-950/30 border-cyan-500/50 ring-1 ring-cyan-500/20'
                                                : isWinner
                                                ? 'bg-emerald-950/25 border-emerald-500/40 ring-1 ring-emerald-500/20'
                                                : status === 'divergent'
                                                ? 'bg-amber-950/20 border-amber-500/30'
                                                : status === 'inferior'
                                                ? 'bg-rose-950/15 border-rose-500/30'
                                                : 'bg-slate-950/70 border-slate-800'
                                            }`}
                                          >
                                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                              <span className="font-bold">
                                                Slot {p.id} ({p.platform})
                                              </span>
                                              {isBaseCol && (
                                                <span className="text-cyan-400 font-bold">★ Base</span>
                                              )}
                                            </div>

                                            <div className="text-xs font-mono font-medium text-slate-100 break-words">
                                              {val === 'Não informado' || val === '—' ? (
                                                <span className="text-slate-500 italic text-[11px]">
                                                  Não informado
                                                </span>
                                              ) : (
                                                <span>{val}</span>
                                              )}
                                            </div>

                                            <div className="pt-1">
                                              {renderStatusBadge(status, comp?.statusLabel, comp?.diffNote)}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* AI Relationship Interpretation Card (Drawer) */}
                                    {isRowExpanded && row.ai_interpretation && (
                                      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-800/40 rounded-lg p-2.5 text-xs text-slate-200 space-y-1.5 shadow-inner">
                                        <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-[11px]">
                                          <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                          <span>Interpretação e Correlação Técnica da IA:</span>
                                        </div>
                                        <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                                          {row.ai_interpretation.summary}
                                        </p>
                                        {row.ai_interpretation.practical_impact && (
                                          <div className="flex items-start gap-1.5 text-[11px] text-emerald-300 pt-0.5">
                                            <span className="font-bold shrink-0">🎯 Impacto Prático:</span>
                                            <span>{row.ai_interpretation.practical_impact}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* SPECIFICATION VIEW MODE 2: FLAT MULTI-SLOT TABLE */}
                {!isAuditing && matrixViewMode === 'table' && filteredRows.length > 0 && (
                  <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl shadow-lg max-h-[550px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-950 text-[11px] font-mono uppercase text-slate-400 border-b border-slate-800">
                          <th className="py-2.5 px-3 min-w-[170px] font-semibold bg-slate-950">
                            Atributo & Categoria
                          </th>
                          {activeProducts.map(p => {
                            const isBaseCol = p.id === selectedBaseSlotId;
                            return (
                              <th
                                key={p.id}
                                className={`py-2.5 px-3 min-w-[150px] font-semibold bg-slate-950 ${
                                  isBaseCol ? 'text-cyan-300 bg-cyan-950/40' : ''
                                }`}
                              >
                                <div className="flex items-center gap-1">
                                  {isBaseCol && <span className="w-2 h-2 rounded-full bg-cyan-400"></span>}
                                  <span className="font-bold">
                                    Slot {p.id} {isBaseCol && '(Base)'}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-normal truncate max-w-[120px]">
                                  {p.title}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {filteredRows.map((row, rIdx) => {
                          const rowKey = row.id || row.attribute_name;
                          const isRowExpanded = expandedRows[rowKey] ?? showAllAIInsights;

                          return (
                            <React.Fragment key={rIdx}>
                              <tr className="hover:bg-slate-800/40 transition-colors">
                                <td className="py-2.5 px-3 font-semibold text-slate-200 bg-slate-950/60 align-top">
                                  <div className="space-y-1">
                                    <div className="flex items-start justify-between gap-1">
                                      <span>{row.attribute_name}</span>
                                      <button
                                        type="button"
                                        onClick={() => toggleRowExpand(rowKey)}
                                        className="text-slate-500 hover:text-cyan-400 p-0.5"
                                        title="Ver análise de IA"
                                      >
                                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                                      </button>
                                    </div>
                                    <span className="inline-block text-[9px] font-mono text-cyan-400/80 bg-cyan-950/50 px-1.5 py-0.2 rounded border border-cyan-900/40">
                                      {row.category || 'Geral'}
                                    </span>
                                  </div>
                                </td>

                                {activeProducts.map(p => {
                                  const isBaseCol = p.id === selectedBaseSlotId;
                                  const val = row.slot_values[`slot_${p.id}`] || 'Não informado';
                                  const comp = row.comparisons[`slot_${p.id}`];
                                  const status = isBaseCol ? 'base' : comp?.status || 'missing';

                                  return (
                                    <td
                                      key={p.id}
                                      className={`py-2.5 px-3 font-mono leading-relaxed align-top ${
                                        isBaseCol
                                          ? 'bg-cyan-950/20 text-cyan-200 font-semibold border-x border-cyan-900/30'
                                          : status === 'superior'
                                          ? 'bg-emerald-950/15'
                                          : status === 'divergent'
                                          ? 'bg-amber-950/15'
                                          : ''
                                      }`}
                                    >
                                      <div className="flex flex-col gap-1">
                                        <span
                                          className={
                                            val === 'Não informado' || val === '—'
                                              ? 'text-slate-500 italic text-[11px]'
                                              : 'text-slate-200'
                                          }
                                        >
                                          {val}
                                        </span>
                                        <div>{renderStatusBadge(status, comp?.statusLabel, comp?.diffNote)}</div>
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>

                              {/* Expanded AI Insight Row in Table View */}
                              {isRowExpanded && row.ai_interpretation && (
                                <tr className="bg-slate-950/90 border-b border-slate-800">
                                  <td
                                    colSpan={activeCount + 1}
                                    className="p-3 text-[11px] text-slate-300 font-sans space-y-1 pl-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950"
                                  >
                                    <div className="flex items-center gap-1.5 text-cyan-300 font-bold mb-1">
                                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                                      <span>Interpretação e Inter-relação IA ({row.attribute_name}):</span>
                                    </div>
                                    <p className="text-slate-300">{row.ai_interpretation.summary}</p>
                                    {row.ai_interpretation.practical_impact && (
                                      <p className="text-emerald-300">
                                        <strong>🎯 Impacto Prático:</strong> {row.ai_interpretation.practical_impact}
                                      </p>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB VIEW 2: PAIRWISE HEAD-TO-HEAD (SLOT A VS SLOT B) */}
            {activeTabMode === 'pairwise' && (
              <div className="space-y-4 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <h4 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Confronto Direto Par a Par (Head-to-Head)</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Selecione dois slots quaisquer para confrontar atributos e veredito direto.
                    </p>
                  </div>

                  {/* Pickers for Slot A & Slot B */}
                  <div className="flex items-center gap-2">
                    <select
                      value={pairSlotA}
                      onChange={e => setPairSlotA(Number(e.target.value))}
                      className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-cyan-300 font-mono font-bold cursor-pointer"
                    >
                      {activeProducts.map(p => (
                        <option key={p.id} value={p.id}>
                          Slot {p.id} ({p.platform})
                        </option>
                      ))}
                    </select>

                    <span className="text-slate-500 font-bold font-mono text-xs">VS</span>

                    <select
                      value={pairSlotB}
                      onChange={e => setPairSlotB(Number(e.target.value))}
                      className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-indigo-300 font-mono font-bold cursor-pointer"
                    >
                      {activeProducts.map(p => (
                        <option key={p.id} value={p.id}>
                          Slot {p.id} ({p.platform})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Head-to-Head Summary Stats */}
                {activePairwise && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                      <span className="text-[10px] text-slate-400 uppercase font-mono">
                        Diferença de Preço
                      </span>
                      <p className="text-sm font-bold text-white font-mono mt-0.5">
                        {formatCurrency(activePairwise.priceDiff)}
                      </p>
                      <span className="text-[10px] text-emerald-400">
                        Slot {activePairwise.cheaperSlot} é mais barato (-{activePairwise.priceDiffPercent}%)
                      </span>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                      <span className="text-[10px] text-slate-400 uppercase font-mono">
                        Itens Equivalentes
                      </span>
                      <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                        {activePairwise.identicalCount}
                      </p>
                      <span className="text-[10px] text-slate-500">paridade técnica</span>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                      <span className="text-[10px] text-slate-400 uppercase font-mono">
                        Divergências
                      </span>
                      <p className="text-sm font-bold text-amber-400 font-mono mt-0.5">
                        {activePairwise.divergentCount}
                      </p>
                      <span className="text-[10px] text-slate-500">diferenças técnicas</span>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                      <span className="text-[10px] text-slate-400 uppercase font-mono">
                        Dados Omitidos
                      </span>
                      <p className="text-sm font-bold text-slate-400 font-mono mt-0.5">
                        {activePairwise.missingCount}
                      </p>
                      <span className="text-[10px] text-slate-500">omissões no anúncio</span>
                    </div>
                  </div>
                )}

                {/* Head-to-Head Detailed Advantages Columns */}
                {activePairwise && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {/* Advantages Slot A */}
                    <div className="bg-slate-950 border border-cyan-900/40 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="text-xs font-bold text-cyan-300 font-mono">
                          Destaques do Slot {pairSlotA}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {slots[pairSlotA - 1]?.platform}
                        </span>
                      </div>
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                        {activePairwise.advantagesA.length === 0 ? (
                          <p className="text-xs text-slate-500 italic">
                            Nenhum diferencial exclusivo identificado.
                          </p>
                        ) : (
                          activePairwise.advantagesA.map((adv, idx) => (
                            <div
                              key={idx}
                              className="text-xs text-slate-200 flex items-start gap-1.5 py-0.5"
                            >
                              <span className="text-cyan-400">✓</span>
                              <span className="font-mono text-[11px]">{adv}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Advantages Slot B */}
                    <div className="bg-slate-950 border border-indigo-900/40 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="text-xs font-bold text-indigo-300 font-mono">
                          Destaques do Slot {pairSlotB}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {slots[pairSlotB - 1]?.platform}
                        </span>
                      </div>
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                        {activePairwise.advantagesB.length === 0 ? (
                          <p className="text-xs text-slate-500 italic">
                            Nenhum diferencial exclusivo identificado.
                          </p>
                        ) : (
                          activePairwise.advantagesB.map((adv, idx) => (
                            <div
                              key={idx}
                              className="text-xs text-slate-200 flex items-start gap-1.5 py-0.5"
                            >
                              <span className="text-indigo-400">✓</span>
                              <span className="font-mono text-[11px]">{adv}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Block 3: Executive Verdict & Export Actions */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">
                    ⚖️
                  </div>
                  <h4 className="text-xs font-extrabold text-amber-400 uppercase tracking-wide">
                    Veredito Técnico e Comercial da IA
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
                >
                  {copied ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copiar Relatório</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 leading-relaxed font-sans">
                {activeMatrixResult?.executive_summary ||
                  'Adicione mais produtos para receber a síntese técnica de recomendação.'}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3 shadow-md">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-800/50 text-cyan-400 flex items-center justify-center mx-auto text-xl shadow-lg">
              ⚡
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Capture mais produtos para comparar com IA</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Adicione pelo menos 2 produtos nos slots acima para desbloquear a comparação cruzada de especificações com inteligência artificial.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
