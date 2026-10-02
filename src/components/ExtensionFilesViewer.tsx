import React, { useState } from 'react';
import { FileCode, Copy, CheckCheck, Folder, Download, Terminal, ShieldAlert } from 'lucide-react';

interface FileEntry {
  filename: string;
  description: string;
  language: string;
  code: string;
}

export const ExtensionFilesViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>('manifest.json');
  const [copied, setCopied] = useState(false);

  const files: FileEntry[] = [
    {
      filename: 'manifest.json',
      description: 'Configuração Manifest V3 com Side Panel e permissões de abas e storage.',
      language: 'json',
      code: `{
  "manifest_version": 3,
  "name": "AutoCompare Multi-Marketplace (5 Slots)",
  "version": "3.0.0",
  "description": "Captura automática e comparação simultânea de até 5 produtos da Shopee e AliExpress com matriz financeira e alinhamento canónico de especificações.",
  "permissions": [
    "activeTab",
    "scripting",
    "storage",
    "sidePanel",
    "tabs"
  ],
  "host_permissions": [
    "*://*.shopee.com.br/*",
    "*://*.shopee.com/*",
    "*://*.aliexpress.com/*",
    "*://*.aliexpress.com.br/*",
    "*://*.aliexpress.us/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "action": {
    "default_title": "Abrir AutoCompare SidePanel",
    "default_icon": {
      "16": "icon16.png",
      "48": "icon48.png",
      "128": "icon128.png"
    }
  },
  "icons": {
    "16": "icon16.png",
    "48": "icon48.png",
    "128": "icon128.png"
  },
  "content_scripts": [
    {
      "matches": [
        "*://*.shopee.com.br/*",
        "*://*.shopee.com/*",
        "*://*.aliexpress.com/*",
        "*://*.aliexpress.com.br/*",
        "*://*.aliexpress.us/*"
      ],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}`,
    },
    {
      filename: 'content.js',
      description: 'Extração em cascata (Tabela técnica -> Texto de descrição -> Título + Metadados) com garantia de raw_specs nunca vazio.',
      language: 'javascript',
      code: `/**
 * AutoCompare Multi-Marketplace - Content Script (Manifest V3)
 * Extração em cascata com fallback robusto
 */

(function () {
  if (window.__AUTOCOMPARE_CONTENT_SCRIPT_INJECTED__) return;
  window.__AUTOCOMPARE_CONTENT_SCRIPT_INJECTED__ = true;

  function parsePrice(text) {
    if (!text) return 0;
    const clean = text.replace(/[^\\d,\\.]/g, '').replace(/\\.(?=\\d{3})/g, '').replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
  }

  function extractSelectedOptions() {
    const options = [];
    document.querySelectorAll('.product-variation--selected, .sku-property-item.selected, .sku-item.selected').forEach(el => {
      const text = el.innerText.trim() || el.getAttribute('title') || '';
      if (text) options.push(text);
    });
    return options.length > 0 ? \`Opções: \${options.join(', ')}\` : '';
  }

  function extractShopee() {
    const titleEl = document.querySelector('div._44qnta, div.qaNIZv, h1.v-center, h1, div[class*="title"]');
    const title = titleEl ? (titleEl.innerText || '').trim() : '';
    const priceEl = document.querySelector('div.pqTWkA, div._3n5z6N, div.Y3d6n1, div[class*="price"]');
    const price = priceEl ? parsePrice(priceEl.innerText) : 0;
    const shipEl = document.querySelector('div.W30k1z, div.shopee-drawer, div[class*="shipping"]');
    const shipping = shipEl && !shipEl.innerText.toLowerCase().includes('grátis') ? parsePrice(shipEl.innerText) : 0;
    const imgEl = document.querySelector('div.flex-1 img, img._2GchKS, img[class*="product-image"]');
    const image = imgEl ? (imgEl.getAttribute('content') || imgEl.src || '') : '';

    const specs = {};
    let raw_specs = '';
    document.querySelectorAll('div.page-product__detail tr, .section-product-specification tr, div._2-5R_w, div.e8lZp3, div.pdp-params tr').forEach(row => {
      const label = row.querySelector('label, th, div.label, span._2j2Q3c');
      const val = row.querySelector('div:not(.label), td:last-child, div.value');
      if (label && val) {
        const k = label.innerText.replace(/[:：]/g, '').trim();
        const v = val.innerText.trim();
        if (k && v && k !== v) specs[k] = v;
      }
    });

    if (Object.keys(specs).length > 0) {
      raw_specs = Object.entries(specs).map(([k, v]) => \`- \${k}: \${v}\`).join('\\n');
    }

    if (!raw_specs || raw_specs.length < 30) {
      const descEl = document.querySelector('div._3y5X4B, div.e8lZp3, div[class*="description"]');
      if (descEl && descEl.innerText) {
        raw_specs = descEl.innerText.trim().slice(0, 1500);
      }
    }

    const selectedOptions = extractSelectedOptions();
    if (!raw_specs || raw_specs.length < 20) {
      raw_specs = \`Produto: \${title}\\nPreço: R$ \${price}\\n\${selectedOptions}\\nPlataforma: Shopee\`;
    }

    return { platform: 'Shopee', title, price, shipping, image, raw_specs, specs, url: window.location.href };
  }

  function extractAliExpress() {
    const titleEl = document.querySelector('h1[data-pl="product-title"], .title--wrap--SnakKVb, div.product-title-text, h1');
    const title = titleEl ? (titleEl.innerText || '').trim() : '';
    const priceEl = document.querySelector('.price--currentPriceText--2_2u_a, .product-price-current, .uniform-banner-box-price');
    const price = priceEl ? parsePrice(priceEl.innerText) : 0;
    const shipEl = document.querySelector('.dynamic-shipping-title, .shipping-fee, .dynamic-shipping-line');
    const shipping = shipEl && !shipEl.innerText.toLowerCase().includes('grátis') ? parsePrice(shipEl.innerText) : 0;
    const imgEl = document.querySelector('.magnifier--image--l4hKqS_, .slider--img--, img[data-pl="product-image"]');
    const image = imgEl ? (imgEl.getAttribute('content') || imgEl.src || '') : '';

    const specs = {};
    let raw_specs = '';
    document.querySelectorAll('[data-spm="specification"] li, .specification--prop li, ul.product-specs li, #product-prop li').forEach(item => {
      const t = item.querySelector('.title, .specification--title--');
      const d = item.querySelector('.desc, .specification--desc--');
      if (t && d) {
        const k = t.innerText.replace(/[:：]/g, '').trim();
        const v = d.innerText.trim();
        if (k && v) specs[k] = v;
      }
    });

    if (Object.keys(specs).length > 0) {
      raw_specs = Object.entries(specs).map(([k, v]) => \`- \${k}: \${v}\`).join('\\n');
    }

    if (!raw_specs || raw_specs.length < 30) {
      const descEl = document.querySelector('.detail-desc-decorate-richtext, #product-description, div[class*="description"]');
      if (descEl && descEl.innerText) {
        raw_specs = descEl.innerText.trim().slice(0, 1500);
      }
    }

    const selectedOptions = extractSelectedOptions();
    if (!raw_specs || raw_specs.length < 20) {
      raw_specs = \`Produto: \${title}\\nPreço: R$ \${price}\\n\${selectedOptions}\\nPlataforma: AliExpress\`;
    }

    return { platform: 'AliExpress', title, price, shipping, image, raw_specs, specs, url: window.location.href };
  }

  chrome.runtime.onMessage.addListener((req, sender, sendRes) => {
    if (req.action === 'EXTRACT_PRODUCT_DATA') {
      const host = window.location.hostname.toLowerCase();
      const data = host.includes('shopee') ? extractShopee() : extractAliExpress();
      sendRes({ success: true, data });
    }
    return true;
  });
})();`,
    },
    {
      filename: 'sidepanel.js',
      description: 'Renderização dinâmica da specs_matrix, fallback por título e exportação completa de relatório.',
      language: 'javascript',
      code: `// Código completo em /extension/sidepanel.js (Gestão dos 5 slots, specs_matrix e Prompt Gemini)`,
    },
    {
      filename: 'sidepanel.html',
      description: 'Layout HTML do SidePanel com área para matriz canônica e scroll horizontal.',
      language: 'html',
      code: `<!-- Código completo em /extension/sidepanel.html -->`,
    },
    {
      filename: 'background.js',
      description: 'Service Worker Manifest V3 para sidePanel e inicialização de storage.',
      language: 'javascript',
      code: `chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
  chrome.storage.local.get(['slots'], (res) => {
    if (!res.slots || res.slots.length !== 5) {
      chrome.storage.local.set({ slots: [null, null, null, null, null] });
    }
  });
});`,
    },
    {
      filename: 'README.md',
      description: 'Instruções de instalação e teste no Google Chrome.',
      language: 'markdown',
      code: `# Como Carregar a Extensão no Chrome:
1. Acesse chrome://extensions/
2. Ative "Modo do desenvolvedor"
3. Clique em "Carregar sem compactação"
4. Selecione a pasta /extension`,
    },
  ];

  const currentFile = files.find(f => f.filename === selectedFile) || files[0];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-sans space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
            <FileCode className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Arquivos da Extensão Google Chrome (Manifest V3)
            </h3>
            <p className="text-xs text-slate-400">
              Prontos para download ou carregamento direto em <code className="text-cyan-300">chrome://extensions/</code>
            </p>
          </div>
        </div>

        <button
          onClick={handleCopyCode}
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-slate-200 border border-slate-700 hover:border-cyan-500 transition-colors shadow-sm"
        >
          {copied ? (
            <>
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Código Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-cyan-400" />
              <span>Copiar Arquivo Atual</span>
            </>
          )}
        </button>
      </div>

      {/* File Selector Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {files.map(file => {
          const isSelected = file.filename === selectedFile;
          return (
            <button
              key={file.filename}
              onClick={() => setSelectedFile(file.filename)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all shrink-0 border ${
                isSelected
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-700 shadow-md font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              {file.filename}
            </button>
          );
        })}
      </div>

      {/* File Description */}
      <div className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
        <strong className="text-slate-200">{currentFile.filename}:</strong> {currentFile.description}
      </div>

      {/* Code Box */}
      <div className="relative bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto max-h-[440px]">
        <pre className="leading-relaxed whitespace-pre-wrap">{currentFile.code}</pre>
      </div>
    </div>
  );
};
