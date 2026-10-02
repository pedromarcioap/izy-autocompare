/**
 * AutoCompare Multi-Marketplace - SidePanel Logic (5-Slot Edition)
 */

// Canonical Specification Groupings & Normalization Rules
const CANONICAL_SPECS = [
  { key: 'bluetooth', label: 'Bluetooth / Conexão', synonyms: ['bluetooth', 'versão bluetooth', 'conexão', 'conexão sem fio', 'bt'] },
  { key: 'battery', label: 'Bateria & Capacidade', synonyms: ['bateria', 'capacidade', 'capacidade da bateria', 'mah', 'bateria do fone', 'bateria da case'] },
  { key: 'autonomy', label: 'Autonomia / Duração', synonyms: ['autonomia', 'duração da bateria', 'tempo de reprodução', 'tempo de uso', 'autonomia total'] },
  { key: 'power', label: 'Potência / Carregamento', synonyms: ['potência', 'potência máxima', 'watts', 'saída', 'carregamento', 'fast charge', 'entrada de carga'] },
  { key: 'anc', label: 'Cancelamento de Ruído (ANC)', synonyms: ['cancelamento de ruído', 'cancelamento ativo', 'anc', 'redução de ruído'] },
  { key: 'waterproof', label: 'Proteção / Resistência à Água', synonyms: ['resistência à água', 'proteção contra água', 'ipx', 'ip67', 'ip68', 'ipx4', 'ipx5', 'impermeável'] },
  { key: 'audio_driver', label: 'Driver de Som / Alto-falante', synonyms: ['driver', 'drivers', 'alto-falante', 'tamanho do driver', 'diafragma'] },
  { key: 'mic', label: 'Microfone & Chamadas', synonyms: ['microfone', 'microfones', 'enc', 'chamadas'] },
  { key: 'display', label: 'Tela & Display', synonyms: ['tela', 'display', 'tipo de tela', 'resolução', 'painel'] },
  { key: 'material', label: 'Material & Acabamento', synonyms: ['material', 'material do corpo', 'acabamento', 'estrutura'] },
  { key: 'weight', label: 'Peso', synonyms: ['peso', 'peso do produto', 'peso do fone', 'peso total'] },
  { key: 'dimensions', label: 'Dimensões / Tamanho', synonyms: ['dimensões', 'tamanho', 'medidas'] },
  { key: 'app', label: 'Suporte a Aplicativo', synonyms: ['aplicativo', 'app dedicado', 'app', 'software'] },
  { key: 'warranty', label: 'Garantia', synonyms: ['garantia', 'garantia do fabricante', 'garantia do vendedor'] },
];

let currentSlots = [null, null, null, null, null];

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  loadSlotsFromStorage();
  setupEventListeners();
});

// Load slots from storage
function loadSlotsFromStorage() {
  chrome.storage.local.get(['slots'], (result) => {
    if (result.slots && Array.isArray(result.slots) && result.slots.length === 5) {
      currentSlots = result.slots;
    } else {
      currentSlots = [null, null, null, null, null];
      chrome.storage.local.set({ slots: currentSlots });
    }
    renderUI();
  });
}

// Setup buttons and interactions
function setupEventListeners() {
  // Capture to first available slot
  document.getElementById('btnCaptureCurrent').addEventListener('click', () => {
    const freeSlotIdx = currentSlots.findIndex(s => s === null);
    if (freeSlotIdx === -1) {
      showStatus('Todos os 5 slots estão ocupados! Limpe um slot ou selecione diretamente.', 'error');
      return;
    }
    captureActiveTabToSlot(freeSlotIdx);
  });

  // Direct slot buttons (Slot 1 to 5)
  document.querySelectorAll('.btn-slot-direct').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const slotIdx = parseInt(e.target.getAttribute('data-slot'), 10);
      captureActiveTabToSlot(slotIdx);
    });
  });

  // Clear all slots
  document.getElementById('btnClearAll').addEventListener('click', () => {
    if (confirm('Deseja realmente limpar todos os 5 slots?')) {
      currentSlots = [null, null, null, null, null];
      chrome.storage.local.set({ slots: currentSlots }, () => {
        renderUI();
        showStatus('Todos os slots foram limpos.', 'success');
      });
    }
  });

  // Copy report
  document.getElementById('btnCopyReport')?.addEventListener('click', copyComparisonReport);

  // Search filter
  document.getElementById('specSearchInput')?.addEventListener('input', (e) => {
    filterSpecMatrix(e.target.value.toLowerCase());
  });
}

// Capture current active tab into specified slot (0 to 4)
async function captureActiveTabToSlot(slotIndex) {
  showStatus(`Capturando dados da aba ativa para o Slot ${slotIndex + 1}...`, 'info');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      showStatus('Nenhuma aba ativa encontrada.', 'error');
      return;
    }

    // Check if URL is supported
    const url = tab.url || '';
    if (!url.includes('shopee') && !url.includes('aliexpress')) {
      showStatus('A aba atual não parece ser um produto da Shopee ou AliExpress.', 'warning');
    }

    // Send extraction message to content script
    chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PRODUCT_DATA' }, async (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        // Fallback: inject content script on the fly and retry
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js'],
          });

          // Retry sending message
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PRODUCT_DATA' }, (retryRes) => {
              if (retryRes && retryRes.success) {
                saveProductToSlot(slotIndex, retryRes.data);
              } else {
                showStatus('Não foi possível extrair dados desta página. Verifique se a página já carregou completamente.', 'error');
              }
            });
          }, 300);
        } catch (injectErr) {
          showStatus('Erro ao injetar script de captura: ' + injectErr.message, 'error');
        }
        return;
      }

      saveProductToSlot(slotIndex, response.data);
    });
  } catch (err) {
    showStatus('Falha na captura: ' + err.message, 'error');
  }
}

// Save extracted product into slot index and update storage
function saveProductToSlot(slotIndex, data) {
  const productObj = {
    id: slotIndex + 1,
    platform: data.platform || 'Desconhecido',
    title: data.title || `Produto Slot ${slotIndex + 1}`,
    price: typeof data.price === 'number' ? data.price : parseFloat(data.price) || 0,
    shipping: typeof data.shipping === 'number' ? data.shipping : parseFloat(data.shipping) || 0,
    image: data.image || '',
    specs: data.specs || {},
    url: data.url || '',
    capturedAt: new Date().toLocaleTimeString(),
  };

  currentSlots[slotIndex] = productObj;
  chrome.storage.local.set({ slots: currentSlots }, () => {
    renderUI();
    showStatus(`Produto capturado com sucesso no Slot ${slotIndex + 1}!`, 'success');
  });
}

// Clear individual slot
function clearSingleSlot(slotIndex) {
  currentSlots[slotIndex] = null;
  chrome.storage.local.set({ slots: currentSlots }, () => {
    renderUI();
    showStatus(`Slot ${slotIndex + 1} limpo.`, 'info');
  });
}

// Helper: Format BRL
function formatCurrency(val) {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Render Master UI
function renderUI() {
  const activeProducts = currentSlots.filter(s => s !== null);
  const activeCount = activeProducts.length;

  document.getElementById('slotCountLabel').innerText = `${activeCount}/5`;

  // 1. Render Slot Cards Strip
  const container = document.getElementById('slotsContainer');
  container.innerHTML = '';

  for (let i = 0; i < 5; i++) {
    const slot = currentSlots[i];
    const slotEl = document.createElement('div');

    if (slot) {
      const isShopee = slot.platform.toLowerCase().includes('shopee');
      const totalPrice = (slot.price || 0) + (slot.shipping || 0);

      slotEl.className = 'slot-card';
      slotEl.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span class="badge ${isShopee ? 'badge-shopee' : 'badge-ali'}">Slot ${i + 1} • ${slot.platform}</span>
          <button class="btn-clear-slot" data-slot="${i}" style="background: transparent; border: none; color: #f43f5e; cursor: pointer; font-size: 12px;" title="Limpar este slot">✕</button>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
          ${slot.image ? `<img src="${slot.image}" alt="" style="width: 36px; height: 36px; object-fit: cover; border-radius: 6px; border: 1px solid #1e293b; background: #000;" />` : `<div style="width: 36px; height: 36px; background: #1e293b; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 16px;">📦</div>`}
          <div style="overflow: hidden; flex: 1;">
            <div style="font-weight: 600; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #f8fafc;" title="${slot.title}">
              ${slot.title}
            </div>
            <div style="font-size: 11px; font-weight: 700; color: #38bdf8; font-family: monospace;">
              ${formatCurrency(totalPrice)}
            </div>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; font-size: 10px; color: #64748b;">
          <span>${Object.keys(slot.specs || {}).length} specs</span>
          <button class="btn-recapture" data-slot="${i}" style="background: #1e293b; border: 1px solid #334155; border-radius: 4px; padding: 2px 4px; color: #94a3b8; cursor: pointer;">Recapturar</button>
        </div>
      `;
    } else {
      slotEl.className = 'slot-card slot-empty';
      slotEl.innerHTML = `
        <div>
          <div style="font-weight: 700; font-size: 11px; color: #475569; margin-bottom: 2px;">SLOT ${i + 1} LIVRE</div>
          <button class="btn-capture-slot" data-slot="${i}" style="font-size: 10px; color: #38bdf8; background: transparent; border: 1px dashed #0284c7; padding: 3px 6px; border-radius: 4px; cursor: pointer;">
            + Capturar Aba
          </button>
        </div>
      `;
    }
    container.appendChild(slotEl);
  }

  // Attach dynamic button listeners on slot cards
  container.querySelectorAll('.btn-clear-slot').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-slot'), 10);
      clearSingleSlot(idx);
    });
  });

  container.querySelectorAll('.btn-capture-slot, .btn-recapture').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-slot'), 10);
      captureActiveTabToSlot(idx);
    });
  });

  // 2. Toggle Comparison Section
  const compSection = document.getElementById('comparisonSection');
  const emptyState = document.getElementById('emptyComparisonState');

  if (activeCount >= 2) {
    compSection.style.display = 'block';
    emptyState.style.display = 'none';
    renderFinancialMatrix(activeProducts);
    renderSpecMatrix(activeProducts);
    renderExecutiveVerdict(activeProducts);
  } else {
    compSection.style.display = 'none';
    emptyState.style.display = 'block';
  }
}

// Render Financial Matrix Table
function renderFinancialMatrix(activeProducts) {
  const table = document.getElementById('financialTable');
  
  // Calculate lowest total price
  let minTotal = Infinity;
  activeProducts.forEach(p => {
    const total = (p.price || 0) + (p.shipping || 0);
    if (total < minTotal) minTotal = total;
  });

  let html = `
    <thead>
      <tr>
        <th style="width: 140px;">Indicador</th>
        ${activeProducts.map((p, idx) => `
          <th>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span class="badge" style="background: #1e293b; color: #fff;">Slot ${p.id}</span>
              <span style="max-width: 100px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.platform}</span>
            </div>
          </th>
        `).join('')}
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="font-weight: 600; color: #94a3b8;">Preço Anunciado</td>
        ${activeProducts.map(p => `<td style="font-family: monospace;">${formatCurrency(p.price)}</td>`).join('')}
      </tr>
      <tr>
        <td style="font-weight: 600; color: #94a3b8;">Frete Estimado</td>
        ${activeProducts.map(p => `
          <td style="font-family: monospace; ${p.shipping === 0 ? 'color: #34d399;' : ''}">
            ${p.shipping === 0 ? 'Grátis' : formatCurrency(p.shipping)}
          </td>
        `).join('')}
      </tr>
      <tr style="background: rgba(15, 23, 42, 0.8);">
        <td style="font-weight: 700; color: #f8fafc;">DESEMBOLSO TOTAL</td>
        ${activeProducts.map(p => {
          const total = (p.price || 0) + (p.shipping || 0);
          const isCheapest = total === minTotal;
          return `
            <td style="font-weight: 800; font-size: 13px; font-family: monospace; ${isCheapest ? 'color: #34d399;' : 'color: #f8fafc;'}">
              ${formatCurrency(total)}
              ${isCheapest ? `<div class="badge badge-cheapest" style="margin-top: 2px;">★ Mais Económico</div>` : ''}
            </td>
          `;
        }).join('')}
      </tr>
      <tr>
        <td style="font-weight: 600; color: #94a3b8;">Diferença vs Mais Barato</td>
        ${activeProducts.map(p => {
          const total = (p.price || 0) + (p.shipping || 0);
          const diff = total - minTotal;
          const percent = minTotal > 0 ? Math.round((diff / minTotal) * 100) : 0;
          if (diff === 0) return `<td style="color: #34d399; font-weight: 600;">Referência (Menor Preço)</td>`;
          return `<td style="color: #f43f5e; font-family: monospace;">+ ${formatCurrency(diff)} (+${percent}%)</td>`;
        }).join('')}
      </tr>
    </tbody>
  `;
  table.innerHTML = html;
}

// Render Canonical Specifications Matrix
function renderSpecMatrix(activeProducts) {
  const table = document.getElementById('specMatrixTable');

  // Collect and normalize all unique spec keys across all active products
  const keyMap = new Map(); // canonicalKey -> { label, values: [valSlot0, valSlot1, ...] }

  // 1. Check Canonical specs
  CANONICAL_SPECS.forEach(spec => {
    let foundInAny = false;
    const rowValues = activeProducts.map(prod => {
      const specsObj = prod.specs || {};
      for (const [rawK, rawV] of Object.entries(specsObj)) {
        if (spec.synonyms.some(s => rawK.toLowerCase().includes(s))) {
          foundInAny = true;
          return rawV;
        }
      }
      return '—';
    });

    if (foundInAny) {
      keyMap.set(spec.key, {
        label: spec.label,
        values: rowValues,
      });
    }
  });

  // 2. Discover remaining raw custom specs
  activeProducts.forEach((prod, pIdx) => {
    const specsObj = prod.specs || {};
    for (const [rawK, rawV] of Object.entries(specsObj)) {
      // Check if already covered
      const isCovered = CANONICAL_SPECS.some(cs =>
        cs.synonyms.some(s => rawK.toLowerCase().includes(s))
      );

      if (!isCovered && !keyMap.has(rawK.toLowerCase())) {
        const rowValues = activeProducts.map((p, idx) => {
          if (idx === pIdx) return rawV;
          // check if other product has same key
          for (const [k, v] of Object.entries(p.specs || {})) {
            if (k.toLowerCase() === rawK.toLowerCase()) return v;
          }
          return '—';
        });

        keyMap.set(rawK.toLowerCase(), {
          label: rawK,
          values: rowValues,
        });
      }
    }
  });

  // Build HTML Table
  let html = `
    <thead>
      <tr>
        <th style="width: 140px;">Especificação Canónica</th>
        ${activeProducts.map(p => `
          <th>
            <div style="font-weight: 700; color: #38bdf8;">Slot ${p.id}</div>
            <div style="font-size: 10px; color: #94a3b8; font-weight: normal; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 110px;">${p.title}</div>
          </th>
        `).join('')}
      </tr>
    </thead>
    <tbody>
  `;

  if (keyMap.size === 0) {
    html += `
      <tr>
        <td colspan="${activeProducts.length + 1}" style="text-align: center; color: #64748b; padding: 20px;">
          Nenhuma especificação estruturada encontrada nos anúncios capturados.
        </td>
      </tr>
    `;
  } else {
    for (const [key, data] of keyMap.entries()) {
      // Check disparity (if values are different and not all '—')
      const filledValues = data.values.filter(v => v !== '—');
      const uniqueFilled = new Set(filledValues.map(v => v.toLowerCase().trim()));
      const hasDisparity = uniqueFilled.size > 1;

      html += `
        <tr class="spec-row ${hasDisparity ? 'disparity-row' : ''}">
          <td style="font-weight: 600; color: #f1f5f9; background: #0f172a;">
            ${data.label}
            ${hasDisparity ? `<span style="font-size: 9px; color: #f59e0b; display: block; font-weight: normal;">⚡ Disparidade</span>` : ''}
          </td>
          ${data.values.map(val => {
            const isMissing = val === '—';
            return `
              <td class="${hasDisparity && !isMissing ? 'disparity-cell' : ''}" style="${isMissing ? 'color: #475569; text-align: center;' : 'color: #cbd5e1; font-family: monospace;'}">
                ${val}
              </td>
            `;
          }).join('')}
        </tr>
      `;
    }
  }

  html += `</tbody>`;
  table.innerHTML = html;
}

// Filter Spec Matrix
function filterSpecMatrix(query) {
  const rows = document.querySelectorAll('#specMatrixTable tbody tr.spec-row');
  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(query) ? '' : 'none';
  });
}

// Render Executive Verdict
function renderExecutiveVerdict(activeProducts) {
  const container = document.getElementById('verdictContent');
  let minTotal = Infinity;
  let cheapestProduct = activeProducts[0];

  activeProducts.forEach(p => {
    const total = (p.price || 0) + (p.shipping || 0);
    if (total < minTotal) {
      minTotal = total;
      cheapestProduct = p;
    }
  });

  const maxTotal = Math.max(...activeProducts.map(p => (p.price || 0) + (p.shipping || 0)));
  const savings = maxTotal - minTotal;

  container.innerHTML = `
    <div style="margin-bottom: 6px;">
      🏆 <strong>Opção Mais Económica:</strong> Slot ${cheapestProduct.id} (${cheapestProduct.platform}) por <strong>${formatCurrency(minTotal)}</strong>.
    </div>
    <div style="color: #94a3b8; font-size: 11px;">
      - Economia máxima potencial de <strong>${formatCurrency(savings)}</strong> em relação à opção mais cara da lista.<br>
      - Compare as linhas destacadas com <span style="color: #f59e0b;">⚡ Disparidade</span> para verificar se o produto mais caro oferece ganho técnico que justifique o valor adicional.
    </div>
  `;
}

// Copy Comparison Report
function copyComparisonReport() {
  const activeProducts = currentSlots.filter(s => s !== null);
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
  report += `Gerado via AutoCompare Chrome Extension`;

  navigator.clipboard.writeText(report).then(() => {
    showStatus('Relatório copiado para a área de transferência!', 'success');
  });
}

// Helper: Show banner status
function showStatus(message, type = 'info') {
  const el = document.getElementById('statusMessage');
  el.style.display = 'block';
  el.innerText = message;

  if (type === 'error') {
    el.style.background = 'rgba(244, 63, 94, 0.2)';
    el.style.color = '#fda4af';
    el.style.border = '1px solid rgba(244, 63, 94, 0.4)';
  } else if (type === 'success') {
    el.style.background = 'rgba(16, 185, 129, 0.2)';
    el.style.color = '#6ee7b7';
    el.style.border = '1px solid rgba(16, 185, 129, 0.4)';
  } else if (type === 'warning') {
    el.style.background = 'rgba(245, 158, 11, 0.2)';
    el.style.color = '#fde68a';
    el.style.border = '1px solid rgba(245, 158, 11, 0.4)';
  } else {
    el.style.background = 'rgba(6, 182, 212, 0.2)';
    el.style.color = '#67e8f9';
    el.style.border = '1px solid rgba(6, 182, 212, 0.4)';
  }

  setTimeout(() => {
    el.style.display = 'none';
  }, 4000);
}
