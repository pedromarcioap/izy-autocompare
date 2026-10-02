import React, { useState } from 'react';
import { SlotsState, SimulatedTab, ProductSlot } from './types/extension';
import { SIMULATED_TABS } from './data/simulatedTabs';
import { BrowserEmulator } from './components/BrowserEmulator';
import { SidePanelSimulator } from './components/SidePanelSimulator';
import { ExtensionFilesViewer } from './components/ExtensionFilesViewer';
import {
  Zap,
  Layers,
  FileCode,
  Sparkles,
  Download,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'simulator' | 'files'>('simulator');
  const [tabs, setTabs] = useState<SimulatedTab[]>(SIMULATED_TABS);
  const [activeTabId, setActiveTabId] = useState<string>(SIMULATED_TABS[0].id);

  // Initialize slots with 2 pre-captured products for instant visualization
  const [slots, setSlots] = useState<SlotsState>([
    {
      id: 1,
      platform: SIMULATED_TABS[0].platform,
      title: SIMULATED_TABS[0].title,
      price: SIMULATED_TABS[0].price,
      shipping: SIMULATED_TABS[0].shipping,
      image: SIMULATED_TABS[0].image,
      specs: SIMULATED_TABS[0].specs,
      url: SIMULATED_TABS[0].url,
      capturedAt: new Date().toLocaleTimeString(),
    },
    {
      id: 2,
      platform: SIMULATED_TABS[1].platform,
      title: SIMULATED_TABS[1].title,
      price: SIMULATED_TABS[1].price,
      shipping: SIMULATED_TABS[1].shipping,
      image: SIMULATED_TABS[1].image,
      specs: SIMULATED_TABS[1].specs,
      url: SIMULATED_TABS[1].url,
      capturedAt: new Date().toLocaleTimeString(),
    },
    null,
    null,
    null,
  ]);

  // Capture current tab to first free slot
  const handleCaptureToFreeSlot = () => {
    const freeIdx = slots.findIndex(s => s === null);
    if (freeIdx === -1) {
      alert('Todos os 5 slots estão ocupados! Limpe um slot ou escolha diretamente.');
      return;
    }
    const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
    handleCaptureTabToSlot(activeTab, freeIdx);
  };

  // Capture specific tab to specific slot
  const handleCaptureTabToSlot = (tab: SimulatedTab, slotIndex: number) => {
    const newProduct: ProductSlot = {
      id: slotIndex + 1,
      platform: tab.platform,
      title: tab.title,
      price: tab.price,
      shipping: tab.shipping,
      image: tab.image,
      specs: tab.specs,
      url: tab.url,
      capturedAt: new Date().toLocaleTimeString(),
    };

    setSlots(prev => {
      const next = [...prev] as SlotsState;
      next[slotIndex] = newProduct;
      return next;
    });
  };

  // Fill all 5 slots at once for instant testing
  const handleFillAll5Slots = () => {
    const newSlots: SlotsState = tabs.slice(0, 5).map((tab, idx) => ({
      id: idx + 1,
      platform: tab.platform,
      title: tab.title,
      price: tab.price,
      shipping: tab.shipping,
      image: tab.image,
      specs: tab.specs,
      url: tab.url,
      capturedAt: new Date().toLocaleTimeString(),
    })) as unknown as SlotsState;

    setSlots(newSlots);
  };

  const handleClearSlot = (slotIndex: number) => {
    setSlots(prev => {
      const next = [...prev] as SlotsState;
      next[slotIndex] = null;
      return next;
    });
  };

  const handleClearAllSlots = () => {
    setSlots([null, null, null, null, null]);
  };

  const handleAddCustomTab = (newTab: SimulatedTab) => {
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Application Header */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Info */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black text-base shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  AutoCompare Multi-Marketplace
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                  Chrome Extension • 5 Slots
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Captura e comparação simultânea de até 5 produtos da Shopee e AliExpress
              </p>
            </div>
          </div>

          {/* Mode Switcher & Quick Demo */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleFillAll5Slots}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-xs font-semibold text-emerald-300 border border-emerald-800/50 transition-colors shadow-sm"
              title="Preencher todos os 5 slots com dados de teste"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Preencher Todos os 5 Slots</span>
            </button>

            <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                onClick={() => setCurrentView('simulator')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'simulator'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Simulador SidePanel</span>
              </button>

              <button
                onClick={() => setCurrentView('files')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'files'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Arquivos da Extensão</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {currentView === 'simulator' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Browser Emulator with 5 Simulated Tabs */}
            <div className="lg:col-span-5 h-[820px]">
              <BrowserEmulator
                tabs={tabs}
                activeTabId={activeTabId}
                onSelectTab={setActiveTabId}
                onCaptureTabToFreeSlot={tab => {
                  const freeIdx = slots.findIndex(s => s === null);
                  if (freeIdx === -1) {
                    alert('Todos os 5 slots estão ocupados! Limpe um slot para capturar.');
                    return;
                  }
                  handleCaptureTabToSlot(tab, freeIdx);
                }}
                onCaptureTabToSlot={handleCaptureTabToSlot}
                onAddCustomTab={handleAddCustomTab}
              />
            </div>

            {/* Right: The 5-Slot SidePanel */}
            <div className="lg:col-span-7 h-[820px]">
              <SidePanelSimulator
                slots={slots}
                onCaptureToFreeSlot={handleCaptureToFreeSlot}
                onCaptureToSlot={slotIdx => {
                  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
                  handleCaptureTabToSlot(activeTab, slotIdx);
                }}
                onClearSlot={handleClearSlot}
                onClearAllSlots={handleClearAllSlots}
              />
            </div>
          </div>
        ) : (
          /* Extension Files Inspector */
          <ExtensionFilesViewer />
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AutoCompare Multi-Marketplace v3.0 (Manifest V3)</span>
          <span className="font-mono text-slate-400">Suporte a até 5 Slots Simultâneos • Shopee & AliExpress</span>
        </div>
      </footer>
    </div>
  );
}
