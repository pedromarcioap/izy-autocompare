import React, { useState } from 'react';
import { SimulatedTab } from '../types/extension';
import {
  Globe,
  Plus,
  RefreshCw,
  ShoppingBag,
  Truck,
  Star,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface BrowserEmulatorProps {
  tabs: SimulatedTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCaptureTabToFreeSlot: (tab: SimulatedTab) => void;
  onCaptureTabToSlot: (tab: SimulatedTab, slotIndex: number) => void;
  onAddCustomTab: (tab: SimulatedTab) => void;
}

export const BrowserEmulator: React.FC<BrowserEmulatorProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCaptureTabToFreeSlot,
  onCaptureTabToSlot,
  onAddCustomTab,
}) => {
  const [showAddTabModal, setShowAddTabModal] = useState(false);
  const [customPlatform, setCustomPlatform] = useState<'Shopee' | 'AliExpress'>('Shopee');
  const [customTitle, setCustomTitle] = useState('');
  const [customPrice, setCustomPrice] = useState('89.90');
  const [customShipping, setCustomShipping] = useState('0.00');
  const [customSpecsText, setCustomSpecsText] = useState(
    'Versão Bluetooth: 5.3\nBateria: 400mAh\nCancelamento de Ruído: ANC 35dB\nResistência: IPX5\nPotência: 20W'
  );

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const isShopee = activeTab?.platform === 'Shopee';

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleCreateCustomTab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    const specs: Record<string, string> = {};
    customSpecsText.split('\n').forEach(line => {
      const parts = line.split(/[:：]/);
      if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
        specs[parts[0].trim()] = parts.slice(1).join(':').trim();
      }
    });

    const newTab: SimulatedTab = {
      id: `tab-custom-${Date.now()}`,
      platform: customPlatform,
      title: customTitle.trim(),
      url:
        customPlatform === 'Shopee'
          ? `https://shopee.com.br/produto-custom-${Date.now()}`
          : `https://pt.aliexpress.com/item/${Date.now()}.html`,
      price: parseFloat(customPrice.replace(',', '.')) || 0,
      shipping: parseFloat(customShipping.replace(',', '.')) || 0,
      image:
        customPlatform === 'Shopee'
          ? 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=200&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200&auto=format&fit=crop&q=80',
      sellerRating: '4.9 ★★★★★ (Loja Oficial)',
      soldCount: '5.0k vendidos',
      specs,
      description: 'Produto adicionado manualmente no simulador de abas.',
    };

    onAddCustomTab(newTab);
    setShowAddTabModal(false);
    setCustomTitle('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
      {/* Browser Window Chrome Top */}
      <div className="bg-slate-950 px-3 pt-3 border-b border-slate-800">
        {/* Window controls & Tab Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-2">
          {/* Traffic light dots */}
          <div className="flex items-center gap-1.5 mr-2 px-1">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
          </div>

          {/* Tab buttons */}
          {tabs.map((tab, idx) => {
            const isActive = tab.id === activeTab.id;
            const tabIsShopee = tab.platform === 'Shopee';

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-t-xl text-xs font-medium transition-all max-w-[180px] shrink-0 border-t border-x ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-700 shadow-md font-semibold'
                    : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    tabIsShopee ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                ></span>
                <span className="truncate text-left">
                  Aba {idx + 1}: {tab.platform}
                </span>
              </button>
            );
          })}

          {/* New Tab Button */}
          <button
            onClick={() => setShowAddTabModal(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors shrink-0"
            title="Adicionar aba personalizada"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Address & Navigation Bar */}
        <div className="flex items-center gap-2 pb-2.5 pt-1">
          <div className="flex items-center gap-1 text-slate-400">
            <button className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-200">
              ←
            </button>
            <button className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-200">
              →
            </button>
            <button className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* URL Box */}
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 overflow-hidden">
            <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{activeTab.url}</span>
            <span
              className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded ${
                isShopee
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              {activeTab.platform}
            </span>
          </div>
        </div>
      </div>

      {/* Simulated Web Page Content */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
        {/* Marketplace Banner */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 text-xs font-bold font-mono uppercase tracking-wider rounded-lg ${
                isShopee
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              Loja Oficial {activeTab.platform}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              {activeTab.sellerRating} • {activeTab.soldCount}
            </span>
          </div>

          <div className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Garantia de Compra Protegida</span>
          </div>
        </div>

        {/* Product Hero Info */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Product Image */}
          <div className="md:col-span-4 bg-slate-950 rounded-xl p-3 border border-slate-800 flex items-center justify-center">
            <img
              src={activeTab.image}
              alt={activeTab.title}
              className="w-full h-44 object-cover rounded-lg shadow-inner"
            />
          </div>

          {/* Product Details & Price */}
          <div className="md:col-span-8 space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
              {activeTab.title}
            </h2>

            {/* Price Box */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-extrabold text-cyan-400 font-mono">
                  {formatCurrency(activeTab.price)}
                </span>
                <span className="text-xs text-slate-500 line-through">
                  {formatCurrency(activeTab.price * 1.35)}
                </span>
                <span className="text-xs font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40">
                  -26% OFF
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-300 pt-1">
                <Truck className="w-4 h-4 text-cyan-400" />
                <span>
                  Frete:{' '}
                  <strong className={activeTab.shipping === 0 ? 'text-emerald-400' : 'text-slate-200'}>
                    {activeTab.shipping === 0 ? 'Grátis para todo o Brasil' : formatCurrency(activeTab.shipping)}
                  </strong>
                </span>
              </div>
            </div>

            {/* Quick Capture Actions */}
            <div className="space-y-2 pt-1">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>⚡ Ações de Captura para o SidePanel da Extensão:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onCaptureTabToFreeSlot(activeTab)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>📥 Capturar no 1º Slot Livre</span>
                </button>

                <div className="flex items-center gap-1 text-xs">
                  <span className="text-slate-400 text-[11px] mr-1">ou Slot:</span>
                  {[0, 1, 2, 3, 4].map(slotIdx => (
                    <button
                      key={slotIdx}
                      type="button"
                      onClick={() => onCaptureTabToSlot(activeTab, slotIdx)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold border border-slate-700 hover:border-cyan-500 transition-colors"
                      title={`Capturar diretamente para o Slot ${slotIdx + 1}`}
                    >
                      Slot {slotIdx + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Structured Specs Preview Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Ficha Técnica Bruta (Estrutura DOM da Página)
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              {Object.keys(activeTab.specs).length} atributos disponíveis
            </span>
          </div>

          <div className="bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <tbody className="divide-y divide-slate-800/80">
                {Object.entries(activeTab.specs).map(([key, val]) => (
                  <tr key={key} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-4 font-semibold text-slate-400 w-1/3 border-r border-slate-800">
                      {key}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-200">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Add Custom Tab */}
      {showAddTabModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-base font-bold text-white">Criar Nova Aba de Produto</h4>
              <button
                onClick={() => setShowAddTabModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomTab} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Marketplace
                  </label>
                  <select
                    value={customPlatform}
                    onChange={e => setCustomPlatform(e.target.value as 'Shopee' | 'AliExpress')}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
                  >
                    <option value="Shopee">Shopee</option>
                    <option value="AliExpress">AliExpress</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Preço Anunciado (R$)
                  </label>
                  <input
                    type="text"
                    required
                    value={customPrice}
                    onChange={e => setCustomPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Título do Anúncio
                </label>
                <input
                  type="text"
                  required
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder="Ex.: Fone Sony WF-1000XM5 ANC Bluetooth 5.3"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Frete Estimado (R$)
                </label>
                <input
                  type="text"
                  value={customShipping}
                  onChange={e => setCustomShipping(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Especificações (Chave: Valor por linha)
                </label>
                <textarea
                  rows={4}
                  value={customSpecsText}
                  onChange={e => setCustomSpecsText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddTabModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-cyan-500 text-slate-950 rounded-lg hover:bg-cyan-400 shadow-md"
                >
                  Adicionar Aba
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
