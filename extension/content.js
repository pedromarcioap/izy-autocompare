/**
 * AutoCompare Multi-Marketplace - Content Script (Manifest V3)
 * Extração de dados em cascata com fallback robusto para Shopee e AliExpress
 */

(function () {
  // Prevent duplicate injection
  if (window.__AUTOCOMPARE_CONTENT_SCRIPT_INJECTED__) return;
  window.__AUTOCOMPARE_CONTENT_SCRIPT_INJECTED__ = true;

  // Helper: parse price string to float
  function parsePrice(text) {
    if (!text) return 0;
    const clean = text
      .replace(/[^\d,\.]/g, '')
      .replace(/\.(?=\d{3})/g, '') // remove thousands dots
      .replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
  }

  // Extract metadata from JSON-LD if available
  function extractJsonLd() {
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const s of scripts) {
        const json = JSON.parse(s.innerText);
        if (json['@type'] === 'Product' || json.offers) {
          return json;
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  // Helper to extract selected variant/options
  function extractSelectedOptions() {
    const options = [];
    // Shopee variant buttons
    document.querySelectorAll('.product-variation--selected, button[class*="variation--selected"], div[class*="selected-variation"]').forEach(el => {
      const text = el.innerText.trim();
      if (text) options.push(text);
    });
    // AliExpress sku selected
    document.querySelectorAll('.sku-property-item.selected, .sku-item.selected, div[class*="skuItem--selected"]').forEach(el => {
      const text = el.innerText.trim() || el.getAttribute('title') || '';
      if (text) options.push(text);
    });
    return options.length > 0 ? `Opções selecionadas: ${options.join(', ')}` : '';
  }

  // --- SHOPEE EXTRACTOR ---
  function extractShopee() {
    const jsonLd = extractJsonLd();

    // 1. Title
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
    title = title.replace(/\s+/g, ' ').trim();

    // 2. Price
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

    // 3. Shipping
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

    // 4. Image
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

    // 5. Cascading Specs Extraction
    const specs = {};
    let raw_specs = '';

    // Tentativa Primária: Tabela e listas de especificações da Shopee
    const specRows = document.querySelectorAll(
      'div.page-product__detail tr, .section-product-specification tr, div[class*="product-detail"] tr, div._2-5R_w, div.e8lZp3, div.pdp-params tr, div[class*="specification"] tr, div.a11y-specs-item'
    );

    specRows.forEach((row) => {
      const labelEl = row.querySelector('label, th, div.label, span._2j2Q3c, div[class*="label"], td:first-child');
      const valEl = row.querySelector('div:not(.label), td:last-child, div.value, div._3y5X4B, div[class*="value"]');

      if (labelEl && valEl) {
        const k = labelEl.innerText.replace(/[:：]/g, '').trim();
        const v = valEl.innerText.trim();
        if (k && v && k !== v) specs[k] = v;
      }
    });

    if (Object.keys(specs).length > 0) {
      raw_specs = Object.entries(specs)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n');
    }

    // Tentativa Secundária: Texto Global de Descrição (primeiros 1.500 caracteres)
    if (!raw_specs || raw_specs.length < 30) {
      const descEl =
        document.querySelector('div._3y5X4B') ||
        document.querySelector('div.e8lZp3') ||
        document.querySelector('div[class*="description"]') ||
        document.querySelector('div[class*="product-detail"]');
      if (descEl && descEl.innerText) {
        const descText = descEl.innerText.trim().slice(0, 1500);
        if (descText.length > 20) {
          raw_specs = (raw_specs ? raw_specs + '\n\n' : '') + descText;
          // Extract any key-value lines from description
          descText.split('\n').forEach(line => {
            const match = line.match(/^[\s\-*•]?\s*([^:：]{2,40})[:：]\s*(.+)$/);
            if (match && match[1] && match[2]) {
              specs[match[1].trim()] = match[2].trim();
            }
          });
        }
      }
    }

    // Fallback Mandatório: Título + Preço + Opções (Garante que nunca seja vazio)
    const selectedOptions = extractSelectedOptions();
    if (!raw_specs || raw_specs.length < 20) {
      raw_specs = `Produto: ${title}\nPreço: R$ ${price}\n${selectedOptions}\nPlataforma: Shopee`;
    } else if (selectedOptions) {
      raw_specs += `\n${selectedOptions}`;
    }

    return {
      platform: 'Shopee',
      title: title || 'Produto Shopee',
      price: price || 0,
      shipping: shipping || 0,
      image: image || '',
      raw_specs: raw_specs,
      specs: specs,
      url: window.location.href,
    };
  }

  // --- ALIEXPRESS EXTRACTOR ---
  function extractAliExpress() {
    const jsonLd = extractJsonLd();

    // 1. Title
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
    title = title.replace(/\s+/g, ' ').trim();

    // 2. Price
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

    // 3. Shipping
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

    // 4. Image
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

    // 5. Cascading Specs Extraction
    const specs = {};
    let raw_specs = '';

    // Tentativa Primária: Tabela e itens de especificação do AliExpress
    const propItems = document.querySelectorAll(
      '[data-spm="specification"] li, .specification--prop li, ul.product-specs li, .pdp-info-right li, #product-prop li, .specification--list-- li, .prop-item, .specification--propItem--, ul.product-prop-list li'
    );

    propItems.forEach((item) => {
      const titleAttr = item.querySelector('.title, .specification--title--, span:first-child');
      const descAttr = item.querySelector('.desc, .specification--desc--, span:last-child');
      if (titleAttr && descAttr && titleAttr !== descAttr) {
        const k = titleAttr.innerText.replace(/[:：]/g, '').trim();
        const v = descAttr.innerText.trim();
        if (k && v) specs[k] = v;
      } else {
        const text = item.innerText;
        const match = text.match(/^([^:：]{2,40})[:：]\s*(.+)$/);
        if (match && match[1] && match[2]) {
          specs[match[1].trim()] = match[2].trim();
        }
      }
    });

    if (Object.keys(specs).length > 0) {
      raw_specs = Object.entries(specs)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n');
    }

    // Tentativa Secundária: Texto Global de Descrição (primeiros 1.500 caracteres)
    if (!raw_specs || raw_specs.length < 30) {
      const descEl =
        document.querySelector('.detail-desc-decorate-richtext') ||
        document.querySelector('#product-description') ||
        document.querySelector('.product-description') ||
        document.querySelector('div[class*="description"]');
      if (descEl && descEl.innerText) {
        const descText = descEl.innerText.trim().slice(0, 1500);
        if (descText.length > 20) {
          raw_specs = (raw_specs ? raw_specs + '\n\n' : '') + descText;
          descText.split('\n').forEach(line => {
            const match = line.match(/^[\s\-*•]?\s*([^:：]{2,40})[:：]\s*(.+)$/);
            if (match && match[1] && match[2]) {
              specs[match[1].trim()] = match[2].trim();
            }
          });
        }
      }
    }

    // Fallback Mandatório: Título + Preço + Opções
    const selectedOptions = extractSelectedOptions();
    if (!raw_specs || raw_specs.length < 20) {
      raw_specs = `Produto: ${title}\nPreço: R$ ${price}\n${selectedOptions}\nPlataforma: AliExpress`;
    } else if (selectedOptions) {
      raw_specs += `\n${selectedOptions}`;
    }

    return {
      platform: 'AliExpress',
      title: title || 'Produto AliExpress',
      price: price || 0,
      shipping: shipping || 0,
      image: image || '',
      raw_specs: raw_specs,
      specs: specs,
      url: window.location.href,
    };
  }

  // Master Extraction Router
  function extractProductData() {
    const host = window.location.hostname.toLowerCase();

    if (host.includes('shopee')) {
      return extractShopee();
    } else if (host.includes('aliexpress')) {
      return extractAliExpress();
    } else {
      // Generic fallback
      const jsonLd = extractJsonLd();
      const title = document.querySelector('h1')?.innerText || document.title || 'Produto Capturado';
      const ogImg = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
      return {
        platform: 'Outro',
        title: title.trim(),
        price: 0,
        shipping: 0,
        image: ogImg,
        raw_specs: `Produto: ${title.trim()}\nURL: ${window.location.href}`,
        specs: {},
        url: window.location.href,
      };
    }
  }

  // Listen for extraction requests from sidepanel
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
})();
