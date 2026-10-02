import React from 'react';
import { ProductInput, Platform } from '../types/audit';
import { ShoppingBag, Truck, Tag, FileText, Clipboard, Trash2, ArrowUpRight } from 'lucide-react';

interface InputPanelProps {
  slotId: '1' | '2';
  title: string;
  badgeLabel: string;
  badgeColor: 'cyan' | 'indigo';
  product: ProductInput;
  onChange: (updated: Partial<ProductInput>) => void;
  onClear: () => void;
}

const PLATFORMS: Platform[] = ['Shopee', 'AliExpress', 'Mercado Livre', 'Amazon', 'Shein', 'Outro'];

export const InputPanel: React.FC<InputPanelProps> = ({
  slotId,
  title,
  badgeLabel,
  badgeColor,
  product,
  onChange,
  onClear,
}) => {
  const lineCount = product.rawText ? product.rawText.split('\n').filter(l => l.trim()).length : 0;
  const isCyan = badgeColor === 'cyan';

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChange({ rawText: text });
      }
    } catch {
      // Clipboard permission might be denied
    }
  };

  return (
    <div className={`flex flex-col h-full bg-slate-900/90 rounded-2xl border ${isCyan ? 'border-cyan-900/40 ring-1 ring-cyan-500/20' : 'border-indigo-900/40 ring-1 ring-indigo-500/20'} p-5 sm:p-6 shadow-xl transition-all`}>
      {/* Slot Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <span
            className={`px-2.5 py-0.5 text-xs font-mono font-bold uppercase rounded-md tracking-wider ${
              isCyan
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
            }`}
          >
            {badgeLabel}
          </span>
          <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onClear}
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
            title="Limpar este produto"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4 flex-1 flex flex-col">
        {/* Product Title / Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              Nome / Título do Anúncio <span className="text-slate-500 font-normal">(opcional)</span>
            </span>
          </label>
          <input
            type="text"
            value={product.name}
            onChange={e => onChange({ name: e.target.value })}
            placeholder="Ex.: Fone QCY T13 ANC ou Smartwatch X9"
            className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
          />
        </div>

        {/* Pricing, Shipping & Platform Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Base Price */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
              Preço (R$) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">R$</span>
              <input
                type="text"
                value={product.price}
                onChange={e => onChange({ price: e.target.value })}
                placeholder="0,00"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-mono font-medium text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* Shipping */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-slate-400" />
              Frete (R$) <span className="text-slate-500 font-normal">(opcional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">R$</span>
              <input
                type="text"
                value={product.shipping}
                onChange={e => onChange({ shipping: e.target.value })}
                placeholder="0,00"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-mono font-medium text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* Platform */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              Plataforma
            </label>
            <select
              value={product.platform}
              onChange={e => onChange({ platform: e.target.value as Platform })}
              className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors cursor-pointer"
            >
              {PLATFORMS.map(p => (
                <option key={p} value={p} className="bg-slate-900 text-slate-200">
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Big Raw Textarea */}
        <div className="flex-1 flex flex-col pt-1">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Especificações e Ficha Técnica
              <span className="text-rose-400">*</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-mono">
                {lineCount} {lineCount === 1 ? 'linha' : 'linhas'}
              </span>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <Clipboard className="w-3 h-3" />
                Colar
              </button>
            </div>
          </div>

          <textarea
            rows={9}
            value={product.rawText}
            onChange={e => onChange({ rawText: e.target.value })}
            placeholder="Cole aqui a descrição ou especificações copiadas da página (Ctrl+C / Ctrl+V)&#10;&#10;Exemplo:&#10;- Bluetooth 5.3&#10;- Bateria: 500mAh&#10;- Cancelamento de Ruído: ANC 28dB&#10;- Carregamento: USB-C 22.5W&#10;- Resistência: IPX5"
            className="w-full flex-1 min-h-[180px] p-3.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs sm:text-sm font-mono leading-relaxed text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors resize-y"
          />
          <p className="mt-1.5 text-[11px] text-slate-400">
            Dica: Cole o texto bruto direto do anúncio. O analisador reconhece marcadores, tabelas e pares chave-valor automaticamente.
          </p>
        </div>
      </div>
    </div>
  );
};
