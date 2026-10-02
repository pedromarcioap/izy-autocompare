import React, { useState, useEffect, useMemo } from 'react';
import {
  SlotsState,
  ProductSlot,
  DynamicComparisonResult,
  DynamicComparisonRow,
  ComparisonStatus,
  PairwiseComparison,
} from '../types/extension';
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
  ArrowRightLeft,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

// --- CORE COMPARISON MATRIX PROCESSING ENGINE ---

// Helper: Normalize string for semantic matching (strips accents, punctuation and excess whitespace)
export function normalizeSemanticKey(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Semantic synonym clusters for automatic vocabulary unification
const SYNONYM_MAP: Record<string, string> = {
  // Ferramentas
  'torque maximo': 'Torque',
  'forca de aperto': 'Torque',
  'torque': 'Torque',
  'tipo de motor': 'Motor',
  'motor': 'Motor',
  'tamanho do mandril': 'Mandril',
  'mandril': 'Mandril',
  'velocidade sem carga': 'Velocidade (RPM)',
  'rotacao': 'Velocidade (RPM)',
  'velocidade': 'Velocidade (RPM)',
  'tensao da bateria': 'Voltagem / Bateria',
  'voltagem': 'Voltagem / Bateria',
  'bateria': 'Bateria',
  'funcao impacto': 'Função de Impacto',
  'funcao de impacto': 'Função de Impacto',
  'impacto': 'Função de Impacto',
  'luz led de trabalho': 'Iluminação LED',
  'iluminacao led': 'Iluminação LED',
  'luz led': 'Iluminação LED',
  'acessorios inclusos': 'Acessórios e Itens Inclusos',
  'itens inclusos': 'Acessórios e Itens Inclusos',
  'acessorios': 'Acessórios e Itens Inclusos',

  // Cosméticos
  'principio ativo': 'Princípio Ativo',
  'volume liquido': 'Volume Líquido',
  'conteudo': 'Volume Líquido',
  'volume': 'Volume Líquido',
  'textura': 'Textura',
  'tipo de pele indicado': 'Tipo de Pele Indicado',
  'tipo de pele': 'Tipo de Pele Indicado',
  'beneficio principal': 'Ação e Benefício Principal',
  'acao': 'Ação e Benefício Principal',
  'fragrancia': 'Fragrância',
  'perfume': 'Fragrância',
  'protecao solar fps': 'Fator de Proteção Solar (FPS)',
  'fator de protecao': 'Fator de Proteção Solar (FPS)',
  'fps': 'Fator de Proteção Solar (FPS)',
  'validade': 'Validade',

  // Têxtil / Vestuário
  'composicao do tecido': 'Composição do Tecido',
  'composicao': 'Composição do Tecido',
  'material': 'Composição / Material',
  'gramatura do tecido': 'Gramatura (g/m²)',
  'gramatura': 'Gramatura (g/m²)',
  'tipo de gola': 'Tipo de Gola',
  'gola': 'Tipo de Gola',
  'modelagem caimento': 'Modelagem / Caimento',
  'modelagem': 'Modelagem / Caimento',
  'costura': 'Acabamento e Costura',
  'transparencia': 'Nível de Transparência',
  'origem do algodao': 'Origem da Matéria-Prima',
  'origem': 'Origem da Matéria-Prima',

  // Áudio / Eletrônicos
  'versao bluetooth': 'Bluetooth / Conexão',
  'conexao bluetooth': 'Bluetooth / Conexão',
  'bluetooth': 'Bluetooth / Conexão',
  'cancelamento de ruido': 'Cancelamento de Ruído (ANC)',
  'cancelamento ativo': 'Cancelamento de Ruído (ANC)',
  'anc': 'Cancelamento de Ruído (ANC)',
  'capacidade da bateria': 'Capacidade da Bateria',
  'autonomia de bateria': 'Autonomia de Reprodução',
  'autonomia': 'Autonomia de Reprodução',
  'tempo de uso': 'Autonomia de Reprodução',
  'drivers de som': 'Driver de Áudio',
  'drivers': 'Driver de Áudio',
  'driver': 'Driver de Áudio',
  'microfones': 'Microfones e Chamadas',
  'microfone': 'Microfones e Chamadas',
  'resistencia a agua': 'Resistência à Água / Proteção',
  'protecao contra agua': 'Resistência à Água / Proteção',
  'conector de carregamento': 'Porta de Carregamento',
  'suporte a aplicativo': 'Aplicativo Dedicado',
  'aplicativo': 'Aplicativo Dedicado',
  'peso': 'Peso',
  'garantia': 'Garantia',
};

// Core function: Extracts all unique keys from active slots, normalizes semantically, and builds the comparison matrix
export function extractAndBuildComparisonMatrix(
  slots: (ProductSlot | null)[],
  baseSlotId = 1
): DynamicComparisonResult {
  const activeSlots = slots.filter((s): s is ProductSlot => s !== null);
  const baseSlot = slots[baseSlotId - 1] || activeSlots[0] || slots[0];

  // 1. Dynamic Category Inference from titles
  const allTitles = activeSlots.map(s => s.title.toLowerCase()).join(' ');
  let detectedCategory = 'Produto Geral & E-commerce';
  if (/parafusadeira|furadeira|impacto|torque|mandril|rpm/i.test(allTitles)) {
    detectedCategory = 'Ferramentas Elétricas & Manuais';
  } else if (/serum|vitamina|anti-idade|facial|pele|hidratante|acido/i.test(allTitles)) {
    detectedCategory = 'Cosméticos & Cuidados Pessoais';
  } else if (/fone|bluetooth|tws|fone de ouvido|anc|soundcore/i.test(allTitles)) {
    detectedCategory = 'Áudio & Eletrônicos Pessoais';
  } else if (/camiseta|algodao|tecido|gola|camisa|vestuario/i.test(allTitles)) {
    detectedCategory = 'Vestuário & Moda Têxtil';
  } else if (/compressor|pneu|bar|psi|automotivo|veicular/i.test(allTitles)) {
    detectedCategory = 'Acessórios Automotivos';
  }

  // 2. Extract and semantically normalize all unique keys across all active slots
  const attributeMap = new Map<string, string>(); // normalizedKey -> Display Label

  activeSlots.forEach(slot => {
    Object.keys(slot.specs || {}).forEach(rawKey => {
      const cleanK = normalizeSemanticKey(rawKey);
      if (!cleanK) return;

      // Check if mapped to a canonical label or use formatted rawKey
      const displayLabel = SYNONYM_MAP[cleanK] || rawKey.trim();
      const unifiedKey = normalizeSemanticKey(displayLabel);

      if (!attributeMap.has(unifiedKey)) {
        attributeMap.set(unifiedKey, displayLabel);
      }
    });
  });

  // 3. Build Comparison Matrix with Status Labels (base, equal, divergent, missing)
  const comparisonMatrix: DynamicComparisonRow[] = [];

  attributeMap.forEach((displayLabel, unifiedKey) => {
    // Value in Slot 1
    const s1Raw = slots[0]?.specs ? findSpecValue(slots[0].specs, unifiedKey) : null;
    const slot_1_value = s1Raw || 'Não informado';

    // Base Slot value
    const baseRaw = baseSlot?.specs ? findSpecValue(baseSlot.specs, unifiedKey) : null;
    const baseValNorm = baseRaw || 'Não informado';

    const slot_values: Record<string, string> = {};
    const comparisons: Record<string, { value: string; status: ComparisonStatus; diffNote?: string }> = {};
    const valuesBySlot: { slotId: number; val: string; clean: string }[] = [];

    // Evaluate each slot 1 to 5
    for (let i = 0; i < 5; i++) {
      const slotNum = i + 1;
      const slotObj = slots[i];
      const slotKeyName = `slot_${slotNum}`;

      if (!slotObj) {
        slot_values[slotKeyName] = '—';
        continue;
      }

      const rawVal = findSpecValue(slotObj.specs, unifiedKey);
      const valDisplay = rawVal || 'Não informado';
      slot_values[slotKeyName] = valDisplay;

      if (slotNum === baseSlotId) {
        comparisons[slotKeyName] = {
          value: valDisplay,
          status: 'base',
          diffNote: 'Base de Referência',
        };
      } else if (!rawVal) {
        comparisons[slotKeyName] = {
          value: 'Não informado',
          status: 'missing',
          diffNote: 'Dado não informado pelo vendedor',
        };
      } else {
        const isIdentical =
          baseValNorm !== 'Não informado' &&
          normalizeSemanticKey(baseValNorm) === normalizeSemanticKey(rawVal);

        comparisons[slotKeyName] = {
          value: rawVal,
          status: isIdentical ? 'equal' : 'divergent',
          diffNote: isIdentical
            ? `Idêntico ao Slot ${baseSlotId}`
            : `Divergência técnica vs Slot ${baseSlotId}`,
        };
      }

      if (rawVal) {
        valuesBySlot.push({
          slotId: slotNum,
          val: rawVal,
          clean: normalizeSemanticKey(rawVal),
        });
      }
    }

    // 4. Cross-analysis: identify identical clusters among all slots
    const identicalGroups: string[] = [];
    const divergences: string[] = [];
    const distinctValues = new Set(valuesBySlot.map(v => v.clean));
    const hasDisparity = distinctValues.size > 1;

    const grouped = new Map<string, number[]>();
    valuesBySlot.forEach(item => {
      if (!grouped.has(item.clean)) grouped.set(item.clean, []);
      grouped.get(item.clean)!.push(item.slotId);
    });

    grouped.forEach((slotIds, cleanVal) => {
      if (slotIds.length > 1) {
        identicalGroups.push(`Slots ${slotIds.join(' e ')} possuem a mesma especificação técnica`);
      }
    });

    if (hasDisparity) {
      divergences.push(`${distinctValues.size} variações técnicas identificadas entre os anúncios`);
    }

    comparisonMatrix.push({
      attribute_name: displayLabel,
      slot_1_value,
      slot_values,
      comparisons,
      cross_analysis: {
        identical_groups: identicalGroups,
        divergences,
        has_disparity: hasDisparity,
        winner_slot: baseSlotId,
      },
    });
  });

  // 5. Build Pairwise Comparison Matrix (Slot A vs Slot B)
  const pairwise_matrix: Record<string, PairwiseComparison> = {};

  for (let i = 0; i < activeSlots.length; i++) {
    for (let j = i + 1; j < activeSlots.length; j++) {
      const slotA = activeSlots[i];
      const slotB = activeSlots[j];
      const pairKey = `${slotA.id}_vs_${slotB.id}`;

      let identicalCount = 0;
      let divergentCount = 0;
      let missingCount = 0;
      const advantagesA: string[] = [];
      const advantagesB: string[] = [];

      comparisonMatrix.forEach(row => {
        const valA = row.slot_values[`slot_${slotA.id}`];
        const valB = row.slot_values[`slot_${slotB.id}`];

        const hasA = valA && valA !== 'Não informado' && valA !== '—';
        const hasB = valB && valB !== 'Não informado' && valB !== '—';

        if (!hasA || !hasB) {
          missingCount++;
          if (hasA) advantagesA.push(`${row.attribute_name}: ${valA} (exclusivo)`);
          if (hasB) advantagesB.push(`${row.attribute_name}: ${valB} (exclusivo)`);
        } else if (normalizeSemanticKey(valA) === normalizeSemanticKey(valB)) {
          identicalCount++;
        } else {
          divergentCount++;
          advantagesA.push(`${row.attribute_name}: ${valA} (vs ${valB})`);
          advantagesB.push(`${row.attribute_name}: ${valB} (vs ${valA})`);
        }
      });

      const totalA = (slotA.price || 0) + (slotA.shipping || 0);
      const totalB = (slotB.price || 0) + (slotB.shipping || 0);
      const priceDiff = Math.abs(totalA - totalB);
      const baseForPct = Math.min(totalA, totalB) || 1;
      const priceDiffPercent = Math.round((priceDiff / baseForPct) * 100);
      const cheaperSlot = totalA <= totalB ? slotA.id : slotB.id;

      pairwise_matrix[pairKey] = {
        slotA: slotA.id,
        slotB: slotB.id,
        identicalCount,
        divergentCount,
        missingCount,
        priceDiff,
        priceDiffPercent,
        cheaperSlot,
        advantagesA,
        advantagesB,
      };
    }
  }

  // 6. Executive Summary
  let minPriceSlot = activeSlots[0];
  let minTotal = Infinity;
  activeSlots.forEach(s => {
    const tot = (s.price || 0) + (s.shipping || 0);
    if (tot < minTotal) {
      minTotal = tot;
      minPriceSlot = s;
    }
  });

  const executiveSummary = `O confronto técnico detalhado entre os ${activeSlots.length} slots revela que o Slot ${minPriceSlot?.id} (${minPriceSlot?.platform}) oferece o menor desembolso total (R$ ${minTotal.toFixed(2).replace('.', ',')}). Utilize o Slot ${baseSlotId} como referência para analisar ganhos técnicos e divergências nas especificações.`;

  return {
    detected_category: detectedCategory,
    base_slot_id: baseSlotId,
    comparison_matrix: comparisonMatrix,
    pairwise_matrix,
    executive_summary: executiveSummary,
  };
}

// Helper: Match spec value against normalized key
function findSpecValue(specs: Record<string, string>, unifiedKey: string): string | null {
  for (const [k, v] of Object.entries(specs || {})) {
    const cleanK = normalizeSemanticKey(k);
    const mapped = SYNONYM_MAP[cleanK];
    const mappedClean = mapped ? normalizeSemanticKey(mapped) : cleanK;

    if (mappedClean === unifiedKey || cleanK === unifiedKey || cleanK.includes(unifiedKey) || unifiedKey.includes(cleanK)) {
      return v;
    }
  }
  return null;
}

// --- SIDEPANEL SIMULATOR COMPONENT ---

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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'divergent' | 'equal' | 'missing'>('all');
  const [copied, setCopied] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [aiResult, setAiResult] = useState<DynamicComparisonResult | null>(null);

  // Pairwise selector state
  const [pairSlotA, setPairSlotA] = useState<number>(1);
  const [pairSlotB, setPairSlotB] = useState<number>(2);

  // Expanded row details
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

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
    // Set immediate local computation for 0ms feedback, then enrich with AI
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

  // Active matrix data source (AI result or local computed matrix)
  const activeMatrixResult = aiResult || localComputedResult;

  // Filtered rows for Matrix
  const filteredRows = useMemo(() => {
    if (!activeMatrixResult) return [];
    return activeMatrixResult.comparison_matrix.filter(row => {
      // Query search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = row.attribute_name.toLowerCase().includes(q);
        const matchesAnyValue = Object.values(row.slot_values || {}).some(v =>
          v?.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesAnyValue) return false;
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

  // Pairwise comparison data for Slot A vs Slot B
  const activePairwise = useMemo((): PairwiseComparison | null => {
    if (!activeMatrixResult?.pairwise_matrix) return null;
    const key1 = `${pairSlotA}_vs_${pairSlotB}`;
    const key2 = `${pairSlotB}_vs_${pairSlotA}`;
    return activeMatrixResult.pairwise_matrix[key1] || activeMatrixResult.pairwise_matrix[key2] || null;
  }, [activeMatrixResult, pairSlotA, pairSlotB]);

  // Toggle row expansion for cross analysis
  const toggleRowExpand = (attrName: string) => {
    setExpandedRows(prev => ({ ...prev, [attrName]: !prev[attrName] }));
  };

  // Status Badge Renderer
  const renderStatusBadge = (status: ComparisonStatus, diffNote?: string) => {
    switch (status) {
      case 'base':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/50">
            ★ Base Referência
          </span>
        );
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

    let report = `📊 *AUTOCOMPARE MULTI-MARKETPLACE (AUDITORIA CRUZADA ENTRE SLOTS)*\n`;
    report += `🏷️ *Categoria Detectada:* ${aiResult.detected_category}\n`;
    report += `🎯 *Slot Base de Referência:* Slot ${selectedBaseSlotId} (${slots[selectedBaseSlotId - 1]?.title})\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    activeProducts.forEach(p => {
      const total = (p.price || 0) + (p.shipping || 0);
      report += `📦 *Slot ${p.id} (${p.platform}):* ${p.title}\n`;
      report += `💰 *Total:* ${formatCurrency(total)} (Base: ${formatCurrency(p.price)} | Frete: ${formatCurrency(p.shipping)})\n`;
    });
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `⚖️ *VEREDITO EXECUTIVO:*\n${aiResult.executive_summary}\n\n`;
    report += `🔍 *MATRIZ DE ESPECIFICAÇÕES COMPARADA (CHAVE A CHAVE):*\n`;
    aiResult.comparison_matrix.forEach(row => {
      report += `• *${row.attribute_name}:*\n`;
      activeProducts.forEach(p => {
        const val = row.slot_values[`slot_${p.id}`] || 'Não informado';
        const comp = row.comparisons[`slot_${p.id}`];
        report += `   - Slot ${p.id}: "${val}" [${comp?.status || 'info'}]\n`;
      });
      if (row.cross_analysis?.identical_groups?.length) {
        report += `   ℹ️ ${row.cross_analysis.identical_groups.join('; ')}\n`;
      }
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
                  Comparação Multi-Slot
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">CONFRONTO TÉCNICO ENTRE CADA SLOT</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={triggerAIAudit}
              disabled={isAuditing || activeCount < 2}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-cyan-950/70 text-cyan-300 hover:bg-cyan-900/80 border border-cyan-800/50 transition-colors disabled:opacity-40"
              title="Re-auditar com IA"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline">{isAuditing ? 'Auditando...' : 'Re-auditar'}</span>
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

              // Empty slot placeholder
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
                    {aiResult?.detected_category || 'Identificando...'}
                  </span>
                </span>
              </div>

              {/* View mode toggle: Matriz Completa vs Confronto Par a Par */}
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
                  <span>Matriz Cruzada Multi-Slot</span>
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

            {/* TAB VIEW 1: FULL CROSS MATRIX */}
            {activeTabMode === 'matrix' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Comparação de Especificações Técnicas Entre Cada Slot</span>
                    </h4>
                    <span className="text-[11px] text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/50 font-mono">
                      Base Atual: Slot {selectedBaseSlotId}
                    </span>
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

                {/* Base Selector Dropdown Bar */}
                <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                    <strong>Alterar Parâmetro de Comparação:</strong>
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

                {/* Main Dynamic Multi-Slot Matrix Table */}
                <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl shadow-lg max-h-[500px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-950 text-[11px] font-mono uppercase text-slate-400 border-b border-slate-800">
                        <th className="py-2.5 px-3 min-w-[160px] font-semibold bg-slate-950">
                          Atributo Técnico
                        </th>
                        {activeProducts.map(p => {
                          const isBaseCol = p.id === selectedBaseSlotId;
                          return (
                            <th
                              key={p.id}
                              className={`py-2.5 px-3 min-w-[140px] font-semibold bg-slate-950 ${
                                isBaseCol ? 'text-cyan-300 bg-cyan-950/40' : ''
                              }`}
                            >
                              <div className="flex items-center gap-1">
                                {isBaseCol && <span className="w-2 h-2 rounded-full bg-cyan-400"></span>}
                                <span className="font-bold">
                                  Slot {p.id} {isBaseCol && '(Base)'}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-normal truncate max-w-[110px]">
                                {p.title}
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
                              A IA está minerando e executando a comparação cruzada entre todos os slots...
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
                        filteredRows.map((row, rIdx) => {
                          const isExpanded = expandedRows[row.attribute_name];
                          const hasCrossAnalysis =
                            row.cross_analysis &&
                            (row.cross_analysis.identical_groups?.length ||
                              row.cross_analysis.divergences?.length);

                          return (
                            <React.Fragment key={rIdx}>
                              <tr className="hover:bg-slate-800/40 transition-colors">
                                {/* Col 1: Attribute Name */}
                                <td className="py-2.5 px-3 font-semibold text-slate-200 bg-slate-950/60 align-top">
                                  <div className="flex items-start justify-between gap-1">
                                    <span>{row.attribute_name}</span>
                                    {hasCrossAnalysis && (
                                      <button
                                        type="button"
                                        onClick={() => toggleRowExpand(row.attribute_name)}
                                        className="text-slate-500 hover:text-cyan-400 p-0.5"
                                        title="Ver análise cruzada de todos os slots"
                                      >
                                        {isExpanded ? (
                                          <ChevronUp className="w-3.5 h-3.5" />
                                        ) : (
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </td>

                                {/* Active Slot Columns */}
                                {activeProducts.map(p => {
                                  const isBaseCol = p.id === selectedBaseSlotId;
                                  const val =
                                    row.slot_values[`slot_${p.id}`] ||
                                    (isBaseCol ? row.slot_1_value : 'Não informado');
                                  const comp = row.comparisons[`slot_${p.id}`];
                                  const status = isBaseCol ? 'base' : comp?.status || 'missing';

                                  return (
                                    <td
                                      key={p.id}
                                      className={`py-2.5 px-3 font-mono leading-relaxed align-top ${
                                        isBaseCol
                                          ? 'bg-cyan-950/20 text-cyan-200 font-semibold border-x border-cyan-900/30'
                                          : status === 'divergent'
                                          ? 'bg-amber-950/15'
                                          : status === 'equal'
                                          ? 'bg-emerald-950/10'
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
                                        <div>{renderStatusBadge(status, comp?.diffNote)}</div>
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>

                              {/* Expanded Cross Analysis Drawer */}
                              {isExpanded && row.cross_analysis && (
                                <tr className="bg-slate-950/90 border-b border-slate-800">
                                  <td
                                    colSpan={activeCount + 1}
                                    className="p-3 text-[11px] text-slate-300 font-mono space-y-1 pl-6"
                                  >
                                    <div className="flex items-center gap-1.5 text-cyan-400 font-bold mb-1">
                                      <Info className="w-3.5 h-3.5" />
                                      <span>Análise Cruzada entre os Slots ({row.attribute_name}):</span>
                                    </div>
                                    {row.cross_analysis.identical_groups?.map((g, gIdx) => (
                                      <div key={gIdx} className="text-emerald-300">
                                        ✓ {g}
                                      </div>
                                    ))}
                                    {row.cross_analysis.divergences?.map((d, dIdx) => (
                                      <div key={dIdx} className="text-amber-300">
                                        ⚡ {d}
                                      </div>
                                    ))}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
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

                {pairSlotA === pairSlotB ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    Selecione dois slots diferentes para realizar o confronto par a par.
                  </div>
                ) : activePairwise ? (
                  <div className="space-y-4">
                    {/* Pairwise Metric Scoreboard */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <div className="text-xs text-slate-400">Diferença de Preço</div>
                        <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                          {formatCurrency(activePairwise.priceDiff)} ({activePairwise.priceDiffPercent}%)
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Slot {activePairwise.cheaperSlot} é mais barato
                        </div>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <div className="text-xs text-slate-400">Atributos Idênticos</div>
                        <div className="text-base font-bold text-cyan-400 font-mono mt-0.5">
                          {activePairwise.identicalCount} itens
                        </div>
                        <div className="text-[10px] text-slate-500">Mesma especificação técnica</div>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <div className="text-xs text-slate-400">Divergências Técnicas</div>
                        <div className="text-base font-bold text-amber-400 font-mono mt-0.5">
                          {activePairwise.divergentCount} itens
                        </div>
                        <div className="text-[10px] text-slate-500">Diferenças relevantes</div>
                      </div>
                    </div>

                    {/* Pairwise Specs Confrontation Table */}
                    <div className="overflow-x-auto bg-slate-950 border border-slate-800 rounded-xl max-h-[380px]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                          <tr>
                            <th className="py-2.5 px-3">Atributo</th>
                            <th className="py-2.5 px-3 text-cyan-300">Slot {pairSlotA}</th>
                            <th className="py-2.5 px-3 text-indigo-300">Slot {pairSlotB}</th>
                            <th className="py-2.5 px-3">Confronto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                          {aiResult?.comparison_matrix.map((row, idx) => {
                            const valA = row.slot_values[`slot_${pairSlotA}`] || 'Não informado';
                            const valB = row.slot_values[`slot_${pairSlotB}`] || 'Não informado';

                            const isBothMissing =
                              (valA === 'Não informado' || valA === '—') &&
                              (valB === 'Não informado' || valB === '—');
                            if (isBothMissing) return null;

                            const isMatch =
                              valA !== 'Não informado' &&
                              valB !== 'Não informado' &&
                              valA.toLowerCase().trim() === valB.toLowerCase().trim();

                            return (
                              <tr key={idx} className="hover:bg-slate-900/50">
                                <td className="py-2 px-3 font-semibold text-slate-200">
                                  {row.attribute_name}
                                </td>
                                <td className="py-2 px-3 font-mono text-cyan-200">{valA}</td>
                                <td className="py-2 px-3 font-mono text-indigo-200">{valB}</td>
                                <td className="py-2 px-3">
                                  {isMatch ? (
                                    <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950 px-2 py-0.5 rounded">
                                      ✓ Equivalentes
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-amber-400 font-semibold bg-amber-950 px-2 py-0.5 rounded">
                                      ⚡ Divergente
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-500 text-xs">
                    Carregando confronto direto...
                  </div>
                )}
              </div>
            )}

            {/* Block 3: Executive Summary & Copy Report */}
            {aiResult && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    <span>Veredito Executivo da Comparação Entre Slots</span>
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
                        <span>Copiar Relatório Completo</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3.5 rounded-lg border border-slate-800/80 space-y-2">
                  <p className="text-slate-200 font-medium">
                    {aiResult.executive_summary}
                  </p>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-800">
                    <span>Base Ativa: Slot {selectedBaseSlotId} ({slots[selectedBaseSlotId - 1]?.title})</span>
                    <span className="font-mono">{filteredRows.length} atributos confrontados</span>
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
              confrontar as especificações de cada slot de forma cruzada.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
