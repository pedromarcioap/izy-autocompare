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
      description: 'Seletores DOM atualizados para Shopee e AliExpress com extração de título, preço, frete, imagem e ficha técnica.',
      language: 'javascript',
      code: `/**
 * AutoCompare Multi-Marketplace - Content Script
 * Suporta extração de dados da Shopee e AliExpress
 */

(function () {
  if (window.__AUTOCOMPARE_CONTENT_SCRIPT_INJECTED__) return;
  window.__AUTOCOMPARE_CONTENT_SCRIPT_INJECTED__ = true;

  function parsePrice(text) {
    if (!text) return 0;
    const clean = text
      .replace(/[^\\d,\\.]/g, '')
      .replace(/\\.(?=\\d{3})/g, '')
      .replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
  }

  function extractJsonLd() {
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const s of scripts) {
        const json = JSON.parse(s.innerText);
        if (json['@type'] === 'Product' || json.offers) {
          return json;
        }
      }
    } catch (e) {}
    return null;
  }

  function extractShopee() {
    const jsonLd = extractJsonLd();
    let title = '';
    const titleEl =
      document.querySelector('div._44qnta') ||
      document.querySelector('div.qaNIZv') ||
      document.querySelector('h1.v-center') ||
      document.querySelector('h1') ||
      document.querySelector('div[class*="title"]') ||
      document.querySelector('meta[property="og:title"]');

    if (titleEl) {
      title = titleEl.getAttribute('content') || titleEl.innerText || '';
    }
    if (!title && jsonLd && jsonLd.name) {
      title = jsonLd.name;
    }
    title = title.replace(/\\s+/g, ' ').trim();

    let price = 0;
    const priceEl =
      document.querySelector('div.pqTWkA') ||
      document.querySelector('div._3n5z6N') ||
      document.querySelector('div.Y3d6n1') ||
      document.querySelector('div[class*="price"]') ||
      document.querySelector('meta[property="product:price:amount"]');

    if (priceEl) {
      const rawPrice = priceEl.getAttribute('content') || priceEl.innerText || '';
      price = parsePrice(rawPrice);
    }
    if (!price && jsonLd && jsonLd.offers) {
      const offer = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers;
      if (offer && offer.price) price = parseFloat(offer.price);
    }

    let shipping = 0;
    const shipEl =
      document.querySelector('div.W30k1z') ||
      document.querySelector('div.shopee-drawer') ||
      document.querySelector('div[class*="shipping"]');
    if (shipEl) {
      const text = shipEl.innerText.toLowerCase();
      if (!text.includes('grátis') && !text.includes('free')) {
        shipping = parsePrice(shipEl.innerText);
      }
    }

    let image = '';
    const imgEl =
      document.querySelector('div.flex-1 img') ||
      document.querySelector('img._2GchKS') ||
      document.querySelector('img[class*="product-image"]') ||
      document.querySelector('meta[property="og:image"]');
    if (imgEl) {
      image = imgEl.getAttribute('content') || imgEl.src || '';
    }
    if (!image && jsonLd && jsonLd.image) {
      image = Array.isArray(jsonLd.image) ? jsonLd.image[0] : jsonLd.image;
    }

    const specs = {};
    const specRows = document.querySelectorAll(
      'div._2-5R_w, div.e8lZp3, div.pdp-params tr, div[class*="specification"] tr, div.a11y-specs-item'
    );

    specRows.forEach((row) => {
      const labelEl = row.querySelector('label, th, div.label, span._2j2Q3c, div[class*="label"]');
      const valEl = row.querySelector('div:not(.label), td, div.value, div._3y5X4B, div[class*="value"]');

      if (labelEl && valEl) {
        const k = labelEl.innerText.replace(/[:：]/g, '').trim();
        const v = valEl.innerText.trim();
        if (k && v) specs[k] = v;
      }
    });

    if (Object.keys(specs).length === 0) {
      const descEl =
        document.querySelector('div._3y5X4B') ||
        document.querySelector('div.e8lZp3') ||
        document.querySelector('div[class*="description"]');
      if (descEl) {
        const lines = descEl.innerText.split('\\n');
        lines.forEach((line) => {
          const match = line.match(/^[\\s\\-*•]?\\s*([^:：]+)[:：]\\s*(.+)$/);
          if (match && match[1] && match[2]) {
            specs[match[1].trim()] = match[2].trim();
          }
        });
      }
    }

    return {
      platform: 'Shopee',
      title: title || 'Produto Shopee',
      price: price || 0,
      shipping: shipping || 0,
      image: image || '',
      specs: specs,
      url: window.location.href,
    };
  }

  function extractAliExpress() {
    const jsonLd = extractJsonLd();
    let title = '';
    const titleEl =
      document.querySelector('h1[data-pl="product-title"]') ||
      document.querySelector('.title--wrap--SnakKVb') ||
      document.querySelector('div.product-title-text') ||
      document.querySelector('h1') ||
      document.querySelector('meta[property="og:title"]');

    if (titleEl) {
      title = titleEl.getAttribute('content') || titleEl.innerText || '';
    }
    if (!title && jsonLd && jsonLd.name) {
      title = jsonLd.name;
    }
    title = title.replace(/\\s+/g, ' ').trim();

    let price = 0;
    const priceEl =
      document.querySelector('.price--currentPriceText--2_2u_a') ||
      document.querySelector('.product-price-current') ||
      document.querySelector('.uniform-banner-box-price') ||
      document.querySelector('.es--wrap--1gZ1kkg') ||
      document.querySelector('span[class*="price"]') ||
      document.querySelector('meta[property="og:price:amount"]');

    if (priceEl) {
      const rawPrice = priceEl.getAttribute('content') || priceEl.innerText || '';
      price = parsePrice(rawPrice);
    }
    if (!price && jsonLd && jsonLd.offers) {
      const offer = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers;
      if (offer && offer.price) price = parseFloat(offer.price);
    }

    let shipping = 0;
    const shipEl =
      document.querySelector('.dynamic-shipping-title') ||
      document.querySelector('.shipping-fee') ||
      document.querySelector('.dynamic-shipping-line') ||
      document.querySelector('.shipping--deliveryFee--') ||
      document.querySelector('div[class*="shipping"]');

    if (shipEl) {
      const text = shipEl.innerText.toLowerCase();
      if (!text.includes('grátis') && !text.includes('free')) {
        shipping = parsePrice(shipEl.innerText);
      }
    }

    let image = '';
    const imgEl =
      document.querySelector('.magnifier--image--l4hKqS_') ||
      document.querySelector('.slider--img--') ||
      document.querySelector('img[data-pl="product-image"]') ||
      document.querySelector('meta[property="og:image"]');

    if (imgEl) {
      image = imgEl.getAttribute('content') || imgEl.src || '';
    }
    if (!image && jsonLd && jsonLd.image) {
      image = Array.isArray(jsonLd.image) ? jsonLd.image[0] : jsonLd.image;
    }

    const specs = {};
    const propItems = document.querySelectorAll(
      '#product-prop li, .specification--list-- li, .prop-item, .specification--propItem--, ul.product-prop-list li'
    );

    propItems.forEach((item) => {
      const titleAttr = item.querySelector('.title, .specification--title--');
      const descAttr = item.querySelector('.desc, .specification--desc--');
      if (titleAttr && descAttr) {
        const k = titleAttr.innerText.replace(/[:：]/g, '').trim();
        const v = descAttr.innerText.trim();
        if (k && v) specs[k] = v;
      }
    });

    return {
      platform: 'AliExpress',
      title: title || 'Produto AliExpress',
      price: price || 0,
      shipping: shipping || 0,
      image: image || '',
      specs: specs,
      url: window.location.href,
    };
  }

  function extractProductData() {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('shopee')) return extractShopee();
    if (host.includes('aliexpress')) return extractAliExpress();
    return {
      platform: 'Outro',
      title: document.title || 'Produto Capturado',
      price: 0,
      shipping: 0,
      image: '',
      specs: {},
      url: window.location.href,
    };
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXTRACT_PRODUCT_DATA') {
      try {
        const data = extractProductData();
        sendResponse({ success: true, data });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    }
    return true;
  });
})();`,
    },
    {
      filename: 'sidepanel.js',
      description: 'Controlador do SidePanel com gestão dos 5 slots no chrome.storage.local, motor de normalização e renderização.',
      language: 'javascript',
      code: `// Código completo em /extension/sidepanel.js (Gestão dos 5 slots e Matriz Canónica)`,
    },
    {
      filename: 'sidepanel.html',
      description: 'Layout HTML do SidePanel com suporte a até 5 slots simultâneos.',
      language: 'html',
      code: `<!-- Código completo em /extension/sidepanel.html -->`,
    },
    {
      filename: 'background.js',
      description: 'Service Worker Manifest V3 para acionar o SidePanel e inicializar o storage.',
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
      description: 'Guia de instalação no Google Chrome em modo desenvolvedor.',
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
