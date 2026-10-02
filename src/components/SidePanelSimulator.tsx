import React, { useState, useMemo } from 'react';
import { SlotsState, ProductSlot } from '../types/extension';
import {
  Zap,
  Trash2,
  Download,
  Copy,
  CheckCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Award,
  Layers,
  Scale,
  RefreshCw,
} from 'lucide-react';

interface SidePanelSimulatorProps {
  slots: SlotsState;
  onCaptureToFreeSlot: () => void;
  onCaptureToSlot: (slotIndex: number) => void;
  onClearSlot: (slotIndex: number) => void;
  onClearAllSlots: () => void;
}

const CANONICAL_SPECS = [
  { key: 'bluetooth', label: 'Bluetooth / Conexão', synonyms: ['bluetooth', 'versão bluetooth', 'conexão', 'conexão sem fio', 'bt'] },
  { key: 'battery', label: 'Bateria & Capacidade', synonyms: ['bateria', 'capacidade', 'capacidade da bateria', 'mah', 'bateria do fone', 'bateria da case'] },
  { key: 'autonomy', label: 'Autonomia / Duração', synonyms: ['autonomia', 'duração da bateria', 'tempo de reprodução', 'tempo de uso', 'autonomia total'] },
  { key: 'power', label: 'Potência / Carregamento', synonyms: ['potência', 'potência máxima', 'watts', 'saída', 'carregamento', 'fast charge', 'entrada de carga', 'conector de carregamento'] },
  { key: 'anc', label: 'Cancelamento de Ruído (ANC)', synonyms: ['cancelamento de ruído', 'cancelamento ativo', 'anc', 'redução de ruído'] },
  { key: 'waterproof', label: 'Proteção / Resistência à Água', synonyms: ['resistência à água', 'proteção contra água', 'ipx', 'ip67', 'ip68', 'ipx4', 'ipx5', 'impermeável'] },
  { key: 'audio_driver', label: 'Driver de Som / Alto-falante', synonyms: ['driver', 'drivers', 'alto-falante', 'tamanho do driver', 'diafragma', 'drivers de som'] },
  { key: 'mic', label: 'Microfone & Chamadas', synonyms: ['microfone', 'microfones', 'enc', 'chamadas'] },
  { key: 'display', label: 'Tela & Display', synonyms: ['tela', 'display', 'tipo de tela', 'resolução', 'painel'] },
  { key: 'material', label: 'Material & Acabamento', synonyms: ['material', 'material do corpo', 'acabamento', 'estrutura'] },
  { key: 'weight', label: 'Peso', synonyms: ['peso', 'peso do produto', 'peso do fone', 'peso total'] },
  { key: 'dimensions', label: 'Dimensões / Tamanho', synonyms: ['dimensões', 'tamanho', 'medidas'] },
  { key: 'app', label: 'Suporte a Aplicativo', synonyms: ['aplicativo', 'app dedicado', 'suporte a aplicativo', 'app', 'software'] },
  { key: 'warranty', label: 'Garantia', synonyms: ['garantia', 'garantia do fabricante', 'garantia do vendedor'] },
];

export const SidePanelSimulator: React.FC<SidePanelSimulatorProps> = ({
  slots,
  onCaptureToFreeSlot,
  onCaptureToSlot,
  onClearSlot,
  onClearAllSlots,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const activeProducts = useMemo(
    () => slots.filter((s): s is ProductSlot => s !== null),
    [slots]
  );
  const activeCount = activeProducts.length;

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Financial calculations
  const minTotal = useMemo(() => {
    if (activeProducts.length === 0) return 0;
    return Math.min(...activeProducts.map(p => (p.price || 0) + (p.shipping || 0)));
  }, [activeProducts]);

  const cheapestProduct = useMemo(() => {
    return activeProducts.find(p => (p.price || 0) + (p.shipping || 0) === minTotal);
  }, [activeProducts, minTotal]);

  // Canonical spec matrix extraction
  const specMatrix = useMemo(() => {
    if (activeProducts.length === 0) return [];

    const result: Array<{
      key: string;
      label: string;
      values: string[];
      hasDisparity: boolean;
    }> = [];

    // 1. Process Canonical Specs
    CANONICAL_SPECS.forEach(specDef => {
      let foundInAny = false;
      const rowValues = activeProducts.map(prod => {
        const specsObj = prod.specs || {};
        for (const [rawK, rawV] of Object.entries(specsObj)) {
          if (specDef.synonyms.some(s => rawK.toLowerCase().includes(s))) {
            foundInAny = true;
            return rawV;
          }
        }
        return '—';
      });

      if (foundInAny) {
        const filled = rowValues.filter(v => v !== '—');
        const uniqueFilled = new Set(filled.map(v => v.toLowerCase().trim()));
        const hasDisparity = uniqueFilled.size > 1;

        result.push({
          key: specDef.key,
          label: specDef.label,
          values: rowValues,
          hasDisparity,
        });
      }
    });

    // 2. Discover Custom Raw Specs
    activeProducts.forEach((prod, pIdx) => {
      const specsObj = prod.specs || {};
      for (const [rawK, rawV] of Object.entries(specsObj)) {
        const isCovered = CANONICAL_SPECS.some(cs =>
          cs.synonyms.some(s => rawK.toLowerCase().includes(s))
        );
        const alreadyAdded = result.some(
          r => r.label.toLowerCase() === rawK.toLowerCase()
        );

        if (!isCovered && !alreadyAdded) {
          const rowValues = activeProducts.map((p, idx) => {
            if (idx === pIdx) return rawV;
            for (const [k, v] of Object.entries(p.specs || {})) {
              if (k.toLowerCase() === rawK.toLowerCase()) return v;
            }
            return '—';
          });

          const filled = rowValues.filter(v => v !== '—');
          const uniqueFilled = new Set(filled.map(v => v.toLowerCase().trim()));
          const hasDisparity = uniqueFilled.size > 1;

          result.push({
            key: rawK.toLowerCase().replace(/\s+/g, '_'),
            label: rawK,
            values: rowValues,
            hasDisparity,
          });
        }
      }
    });

    return result;
  }, [activeProducts]);

  // Filtered spec matrix
  const filteredSpecs = useMemo(() => {
    if (!searchQuery.trim()) return specMatrix;
    const query = searchQuery.toLowerCase();
    return specMatrix.filter(
      item =>
        item.label.toLowerCase().includes(query) ||
        item.values.some(v => v.toLowerCase().includes(query))
    );
  }, [specMatrix, searchQuery]);

  // Copy Full Comparison Report
  const handleCopyReport = () => {
    if (activeProducts.length < 2) return;

    let report = `📊 *AUTOCOMPARE MULTI-MARKETPLACE (5 SLOTS)*\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    activeProducts.forEach(p => {
      const total = (p.price || 0) + (p.shipping || 0);
      report += `📦 *Slot ${p.id} (${p.platform}):* ${p.title}\n`;
      report += `💰 *Total:* ${formatCurrency(total)} (Base: ${formatCurrency(p.price)} | Frete: ${formatCurrency(p.shipping)})\n`;
      report += `🔗 ${p.url}\n\n`;
    });
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `🏆 *MENOR PREÇO:* Slot ${cheapestProduct?.id} (${cheapestProduct?.platform}) por ${formatCurrency(minTotal)}\n`;
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
                <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800/50">
                  SidePanel v3.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">5-SLOT MULTI-MARKETPLACE</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClearAllSlots}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 border border-slate-700 hover:border-rose-700/50 transition-colors"
            title="Limpar todos os 5 slots"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar Todos</span>
          </button>
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

                return (
                  <div
                    key={idx}
                    className="relative bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3 flex flex-col justify-between gap-2 shadow-md transition-all group"
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
                    Slot {idx + 1} Livre
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
            {/* Block 1: Financial Matrix */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>💰 Matriz Financeira Comparativa ({activeCount} Produtos)</span>
                </h4>
                <span className="text-[11px] text-emerald-400 font-semibold">
                  ★ Melhor Preço: Slot {cheapestProduct?.id} ({formatCurrency(minTotal)})
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

            {/* Block 2: Canonical Specifications Matrix */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Matriz de Especificações Canónicas (Chave a Chave)</span>
                </h4>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Filtrar atributos..."
                    className="pl-7 pr-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-44"
                  />
                </div>
              </div>

              <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl shadow-lg max-h-[460px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-950 text-[11px] font-mono uppercase text-slate-400 border-b border-slate-800">
                      <th className="py-2.5 px-3 min-w-[150px] font-semibold bg-slate-950">
                        Especificação Canónica
                      </th>
                      {activeProducts.map(p => (
                        <th key={p.id} className="py-2.5 px-3 min-w-[130px] font-semibold bg-slate-950">
                          <div className="font-bold text-cyan-300">Slot {p.id}</div>
                          <div className="text-[10px] text-slate-500 font-normal truncate max-w-[110px]">
                            {p.title}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredSpecs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={activeProducts.length + 1}
                          className="py-8 text-center text-slate-500 text-xs"
                        >
                          Nenhuma especificação encontrada para o filtro atual.
                        </td>
                      </tr>
                    ) : (
                      filteredSpecs.map(row => (
                        <tr
                          key={row.key}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            row.hasDisparity ? 'bg-amber-950/10' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-semibold text-slate-200 bg-slate-950/60">
                            <div className="flex flex-col">
                              <span>{row.label}</span>
                              {row.hasDisparity && (
                                <span className="text-[9px] text-amber-400 font-mono font-normal">
                                  ⚡ Disparidade
                                </span>
                              )}
                            </div>
                          </td>
                          {row.values.map((val, vIdx) => {
                            const isMissing = val === '—';
                            return (
                              <td
                                key={vIdx}
                                className={`py-2.5 px-3 font-mono leading-relaxed ${
                                  isMissing
                                    ? 'text-slate-600 text-center'
                                    : row.hasDisparity
                                    ? 'text-amber-200/90 bg-amber-950/15'
                                    : 'text-slate-200'
                                }`}
                              >
                                {val}
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

            {/* Block 3: Executive Verdict & Export Actions */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  <span>Veredito de Compra & Economia</span>
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

              <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                <p className="font-semibold text-slate-100 mb-1">
                  🏆 Menor Preço Final: Slot {cheapestProduct?.id} ({cheapestProduct?.platform}) por{' '}
                  <span className="text-emerald-400 font-mono font-bold">
                    {formatCurrency(minTotal)}
                  </span>
                  .
                </p>
                <p className="text-slate-400">
                  Economia potencial de até{' '}
                  <strong className="text-emerald-300 font-mono">
                    {formatCurrency(
                      Math.max(...activeProducts.map(p => (p.price || 0) + (p.shipping || 0))) - minTotal
                    )}
                  </strong>{' '}
                  em relação ao item mais caro da lista. Analise as linhas marcadas com{' '}
                  <span className="text-amber-400 font-semibold">⚡ Disparidade</span> para decidir se o
                  ganho de especificações justifica pagar mais.
                </p>
              </div>
            </div>
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
              gerar a matriz comparativa de até 5 produtos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
