import React, { useState, useMemo } from 'react';
import { SpecItem, SpecStatus } from '../types/audit';
import {
  SlidersHorizontal,
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Layers,
  Plus,
  ArrowRight,
  Filter,
  Eye,
  Check,
} from 'lucide-react';

interface SpecComparisonTableProps {
  specs: SpecItem[];
  product1Name: string;
  product2Name: string;
  onAddCustomSpec?: (spec: SpecItem) => void;
}

type FilterType = 'all' | 'divergent' | 'identical' | 'missing';

export const SpecComparisonTable: React.FC<SpecComparisonTableProps> = ({
  specs,
  product1Name,
  product2Name,
  onAddCustomSpec,
}) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New custom spec fields
  const [customLabel, setCustomLabel] = useState('');
  const [customVal1, setCustomVal1] = useState('');
  const [customVal2, setCustomVal2] = useState('');

  // Counts
  const counts = useMemo(() => {
    let identical = 0;
    let divergent = 0;
    let missing = 0;

    for (const item of specs) {
      if (item.status === 'identical') identical++;
      else if (item.status === 'divergent') divergent++;
      else missing++;
    }

    return { all: specs.length, identical, divergent, missing };
  }, [specs]);

  // Filtered list
  const filteredSpecs = useMemo(() => {
    return specs.filter(item => {
      // Tab filter
      if (filter === 'divergent' && item.status !== 'divergent') return false;
      if (filter === 'identical' && item.status !== 'identical') return false;
      if (filter === 'missing' && item.status !== 'missing_1' && item.status !== 'missing_2' && item.status !== 'both_missing')
        return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesLabel = item.label.toLowerCase().includes(query);
        const matchesCategory = item.category.toLowerCase().includes(query);
        const matchesVal1 = item.val1.toLowerCase().includes(query);
        const matchesVal2 = item.val2.toLowerCase().includes(query);
        const matchesDiff = (item.diffNote || '').toLowerCase().includes(query);

        return matchesLabel || matchesCategory || matchesVal1 || matchesVal2 || matchesDiff;
      }

      return true;
    });
  }, [specs, filter, searchQuery]);

  // Group by category
  const groupedSpecs = useMemo(() => {
    const groups: { [category: string]: SpecItem[] } = {};
    for (const item of filteredSpecs) {
      const cat = item.category || 'Especificações Gerais';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return groups;
  }, [filteredSpecs]);

  const handleCreateCustomSpec = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLabel.trim()) return;

    const isIdentical = customVal1.trim().toLowerCase() === customVal2.trim().toLowerCase();
    const isMissing = !customVal1.trim() || !customVal2.trim();

    let status: SpecStatus = 'divergent';
    if (isIdentical && customVal1.trim()) status = 'identical';
    else if (!customVal1.trim() && !customVal2.trim()) status = 'both_missing';
    else if (!customVal1.trim()) status = 'missing_1';
    else if (!customVal2.trim()) status = 'missing_2';

    const newSpec: SpecItem = {
      id: `custom-${Date.now()}`,
      category: 'Adicionado Manualmente',
      key: customLabel.toLowerCase().replace(/\s+/g, '_'),
      label: customLabel.trim(),
      val1: customVal1.trim() || 'Não informado',
      val2: customVal2.trim() || 'Não informado',
      status,
      diffNote: status === 'identical' ? 'Valores idênticos' : 'Dado customizado adicionado pelo usuário',
      isCustom: true,
    };

    onAddCustomSpec?.(newSpec);
    setCustomLabel('');
    setCustomVal1('');
    setCustomVal2('');
    setShowAddModal(false);
  };

  const renderStatusBadge = (status: SpecStatus, diffNote?: string, winner?: string) => {
    switch (status) {
      case 'identical':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            [Verde] Idêntico
          </span>
        );
      case 'divergent':
        return (
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/40">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              [Amarelo] Divergência
            </span>
            {diffNote && diffNote !== 'Diferença técnica identificada' && (
              <span className="text-[11px] text-amber-200/80 font-mono pl-1">{diffNote}</span>
            )}
          </div>
        );
      case 'missing_1':
      case 'missing_2':
      case 'both_missing':
      default:
        return (
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-slate-400 border border-slate-700">
              <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
              [Cinza] Não informado
            </span>
            {diffNote && <span className="text-[11px] text-slate-500 pl-1">{diffNote}</span>}
          </div>
        );
    }
  };

  return (
    <div className="bg-slate-900/95 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-5 sm:p-6 border-b border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-semibold">
                Normalização Chave a Chave
              </span>
              <h3 className="text-base font-bold text-white">Tabela Comparativa de Especificações</h3>
            </div>
          </div>

          {/* Add custom spec row */}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-slate-200 border border-slate-700 hover:border-cyan-500/50 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            Adicionar Linha de Comparação
          </button>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                filter === 'all'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>Todas as Specs</span>
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-black/20">{counts.all}</span>
            </button>

            <button
              onClick={() => setFilter('divergent')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                filter === 'divergent'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>Apenas Divergências</span>
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-black/20">{counts.divergent}</span>
            </button>

            <button
              onClick={() => setFilter('identical')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                filter === 'identical'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>Idênticas</span>
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-black/20">{counts.identical}</span>
            </button>

            <button
              onClick={() => setFilter('missing')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                filter === 'missing'
                  ? 'bg-slate-700 text-slate-100 shadow-md font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>Não Informados</span>
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-black/20">{counts.missing}</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar especificação..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Modal: Add Custom Spec */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h4 className="text-base font-bold text-white mb-1">Adicionar Linha Customizada</h4>
            <p className="text-xs text-slate-400 mb-4">
              Insira uma especificação manual para confrontar os dois produtos.
            </p>
            <form onSubmit={handleCreateCustomSpec} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome da Especificação
                </label>
                <input
                  type="text"
                  required
                  value={customLabel}
                  onChange={e => setCustomLabel(e.target.value)}
                  placeholder="Ex.: Tempo de Garantia, Tipo de Plugue..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-cyan-300 mb-1">
                    Valor no Produto 1
                  </label>
                  <input
                    type="text"
                    value={customVal1}
                    onChange={e => setCustomVal1(e.target.value)}
                    placeholder="Ex.: 12 meses"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-indigo-300 mb-1">
                    Valor no Produto 2
                  </label>
                  <input
                    type="text"
                    value={customVal2}
                    onChange={e => setCustomVal2(e.target.value)}
                    placeholder="Ex.: 30 dias"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-cyan-500 text-slate-950 rounded-lg hover:bg-cyan-400 shadow-md"
                >
                  Salvar Linha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono uppercase tracking-wider text-slate-400">
              <th className="py-3 px-4 w-[28%] font-semibold">Especificação Padronizada</th>
              <th className="py-3 px-4 w-[27%] font-semibold text-cyan-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span className="truncate">{product1Name || 'Produto 1'}</span>
                </div>
              </th>
              <th className="py-3 px-4 w-[27%] font-semibold text-indigo-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                  <span className="truncate">{product2Name || 'Produto 2'}</span>
                </div>
              </th>
              <th className="py-3 px-4 w-[18%] font-semibold text-slate-300">Status Visual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {Object.keys(groupedSpecs).length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-500">
                  <HelpCircle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p className="font-semibold text-slate-400">Nenhuma especificação encontrada com os filtros atuais.</p>
                  <p className="text-xs text-slate-600 mt-1">Tente trocar a aba de filtro ou limpar o campo de busca.</p>
                </td>
              </tr>
            ) : (
              Object.entries(groupedSpecs).map(([category, items]) => (
                <React.Fragment key={category}>
                  {/* Category Header Row */}
                  <tr className="bg-slate-950/50 border-y border-slate-800/80">
                    <td colSpan={4} className="py-2 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-950/60">
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{category}</span>
                        <span className="text-[10px] text-slate-600 font-mono font-normal">({items.length} {items.length === 1 ? 'item' : 'itens'})</span>
                      </div>
                    </td>
                  </tr>

                  {/* Spec Rows */}
                  {items.map(item => {
                    const isWinner1 = item.winner === 'p1';
                    const isWinner2 = item.winner === 'p2';

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          item.status === 'divergent' ? 'bg-amber-950/10' : ''
                        }`}
                      >
                        {/* Col 1: Standardized Spec */}
                        <td className="py-3.5 px-4 font-medium text-slate-200 align-top">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold">{item.label}</span>
                            {item.isCustom && (
                              <span className="text-[10px] text-cyan-400/80 font-mono">Manual</span>
                            )}
                          </div>
                        </td>

                        {/* Col 2: Product 1 Value */}
                        <td className={`py-3.5 px-4 align-top leading-relaxed ${
                          item.val1 === 'Não informado' ? 'text-slate-500 italic' : 'text-slate-100 font-mono'
                        } ${isWinner1 ? 'bg-cyan-950/30 font-semibold text-cyan-200' : ''}`}>
                          <div className="flex items-start gap-1.5">
                            {isWinner1 && (
                              <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                            )}
                            <span className="break-words">{item.val1}</span>
                          </div>
                        </td>

                        {/* Col 3: Product 2 Value */}
                        <td className={`py-3.5 px-4 align-top leading-relaxed ${
                          item.val2 === 'Não informado' ? 'text-slate-500 italic' : 'text-slate-100 font-mono'
                        } ${isWinner2 ? 'bg-indigo-950/30 font-semibold text-indigo-200' : ''}`}>
                          <div className="flex items-start gap-1.5">
                            {isWinner2 && (
                              <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                            )}
                            <span className="break-words">{item.val2}</span>
                          </div>
                        </td>

                        {/* Col 4: Visual Status Badge */}
                        <td className="py-3.5 px-4 align-top">
                          {renderStatusBadge(item.status, item.diffNote, item.winner)}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="bg-slate-950/80 px-6 py-3 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <span>
          Total de especificações auditadas: <strong className="text-slate-200">{specs.length} atributos</strong>
        </span>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> {counts.identical} idênticas
          </span>
          <span className="inline-flex items-center gap-1 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span> {counts.divergent} divergentes
          </span>
          <span className="inline-flex items-center gap-1 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-slate-500"></span> {counts.missing} faltantes
          </span>
        </div>
      </div>
    </div>
  );
};
