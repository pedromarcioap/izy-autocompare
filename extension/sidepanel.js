/**
 * AutoCompare Multi-Marketplace - SidePanel Logic (Manifest V3)
 * Módulo de Extração e Auditoria 100% Dinâmico & Agnóstico a Categorias
 */

let currentSlots = [null, null, null, null, null];
let currentAIResult = null;

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

    // Send extraction message to content script
    chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PRODUCT_DATA' }, async (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        // Fallback: inject content script on the fly and retry
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js'],
          });

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

// Format BRL
function formatCurrency(val) {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Helper: normalize string
function cleanStr(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Motor Dinâmico e Agnóstico de IA (Executa as 3 etapas obrigatórias)
 */
function processDynamicAIAudit(slots) {
  const activeSlots = slots.filter(s => s !== null);
  const slot1 = slots[0];

  // Etapa 1 & 2: Mineração e Fusão semântica de atributos existentes
  const attributeMap = new Map(); // cleanKey -> Display Name

  activeSlots.forEach(slot => {
    Object.keys(slot.specs || {}).forEach(k => {
      const cleanK = cleanStr(k);
      if (cleanK && !attributeMap.has(cleanK)) {
        attributeMap.set(cleanK, k.trim());
      }
    });
  });

  // Inferir categoria a partir dos títulos
  const allTitles = activeSlots.map(s => s.title.toLowerCase()).join(' ');
  let detectedCategory = 'Produto Geral & E-commerce';
  if (/furadeira|parafusadeira|torque|mandril|rpm|impacto/i.test(allTitles)) {
    detectedCategory = 'Ferramentas Elétricas & Manuais';
  } else if (/serum|vitamina|anti-idade|pele|fps|facial/i.test(allTitles)) {
    detectedCategory = 'Cosméticos & Cuidados Pessoais';
  } else if (/camiseta|algodao|fio|gola|tecido|pima/i.test(allTitles)) {
    detectedCategory = 'Vestuário & Moda Têxtil';
  } else if (/fone|bluetooth|tws|anc|estojo|driver/i.test(allTitles)) {
    detectedCategory = 'Áudio & Fones de Ouvido';
  }

  // Etapa 3: Confronto Cruzado Tendo o Slot 1 como Parâmetro
  const comparisonMatrix = [];

  attributeMap.forEach((displayLabel, cleanKey) => {
    // Valor no Slot 1 (Base de referência)
    let s1Val = 'Não informado';
    if (slot1 && slot1.specs) {
      for (const [k, v] of Object.entries(slot1.specs)) {
        if (cleanStr(k) === cleanKey || cleanStr(k).includes(cleanKey) || cleanKey.includes(cleanStr(k))) {
          s1Val = v;
          break;
        }
      }
    }

    const comparisons = {};

    // Comparar slots 2 a 5 com o Slot 1
    for (let i = 1; i < 5; i++) {
      const slotNum = i + 1;
      const slotObj = slots[i];
      const slotKey = `slot_${slotNum}`;

      if (!slotObj) continue;

      let foundVal = null;
      for (const [k, v] of Object.entries(slotObj.specs || {})) {
        if (cleanStr(k) === cleanKey || cleanStr(k).includes(cleanKey) || cleanKey.includes(cleanStr(k))) {
          foundVal = v;
          break;
        }
      }

      if (!foundVal) {
        comparisons[slotKey] = {
          value: 'Não informado',
          status: 'missing',
        };
      } else {
        const isIdentical = s1Val !== 'Não informado' && cleanStr(s1Val) === cleanStr(foundVal);
        comparisons[slotKey] = {
          value: foundVal,
          status: isIdentical ? 'equal' : 'divergent',
        };
      }
    }

    comparisonMatrix.push({
      attribute_name: displayLabel,
      slot_1_value: s1Val,
      comparisons,
    });
  });

  // Veredito Executivo
  let minTotal = Infinity;
  let minSlot = activeSlots[0];
  activeSlots.forEach(s => {
    const tot = (s.price || 0) + (s.shipping || 0);
    if (tot < minTotal) {
      minTotal = tot;
      minSlot = s;
    }
  });

  const executiveSummary = `O Slot ${minSlot?.id} (${minSlot?.platform}) lidera no quesito custo-benefício direto com desembolso de ${formatCurrency(minTotal)}. O Slot 1 serve de referência nas especificações técnicas para avaliar eventuais upgrades.`;

  return {
    detected_category: detectedCategory,
    comparison_matrix: comparisonMatrix,
    executive_summary: executiveSummary,
  };
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
    const isBase = i === 0;

    if (slot) {
      const isShopee = slot.platform.toLowerCase().includes('shopee');
      const totalPrice = (slot.price || 0) + (slot.shipping || 0);

      slotEl.className = 'slot-card';
      if (isBase) slotEl.style.border = '1px solid #06b6d4';

      slotEl.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span class="badge ${isShopee ? 'badge-shopee' : 'badge-ali'}">Slot ${i + 1} • ${slot.platform}${isBase ? ' (Base)' : ''}</span>
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
          <div style="font-weight: 700; font-size: 11px; color: #475569; margin-bottom: 2px;">SLOT ${i + 1} LIVRE ${isBase ? '(BASE)' : ''}</div>
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

    currentAIResult = processDynamicAIAudit(currentSlots);

    renderFinancialMatrix(activeProducts);
    renderDynamicSpecMatrix(currentAIResult, activeProducts);
    renderExecutiveVerdict(currentAIResult, activeProducts);
  } else {
    compSection.style.display = 'none';
    emptyState.style.display = 'block';
    currentAIResult = null;
  }
}

// Render Financial Matrix Table
function renderFinancialMatrix(activeProducts) {
  const table = document.getElementById('financialTable');
  
  let minTotal = Infinity;
  activeProducts.forEach(p => {
    const total = (p.price || 0) + (p.shipping || 0);
    if (total < minTotal) minTotal = total;
  });

  let html = `
    <thead>
      <tr>
        <th style="width: 140px;">Indicador</th>
        ${activeProducts.map(p => `
          <th>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span class="badge" style="background: #1e293b; color: #fff;">Slot ${p.id}${p.id === 1 ? ' (Base)' : ''}</span>
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
        <td style="font-weight: 600; color: #94a3b8;">Diferença vs Menor</td>
        ${activeProducts.map(p => {
          const total = (p.price || 0) + (p.shipping || 0);
          const diff = total - minTotal;
          const percent = minTotal > 0 ? Math.round((diff / minTotal) * 100) : 0;
          if (diff === 0) return `<td style="color: #34d399; font-weight: 600;">Referência (0%)</td>`;
          return `<td style="color: #f43f5e; font-family: monospace;">+ ${formatCurrency(diff)} (+${percent}%)</td>`;
        }).join('')}
      </tr>
    </tbody>
  `;
  table.innerHTML = html;
}

// Render Dynamic Spec Matrix with Slot 1 as parameter
function renderDynamicSpecMatrix(aiResult, activeProducts) {
  const table = document.getElementById('specMatrixTable');

  let html = `
    <thead>
      <tr>
        <th style="width: 140px;">Atributo Normalizado</th>
        <th style="color: #38bdf8; background: #0c1524;">
          <div>Slot 1 (Base Referência)</div>
          <div style="font-size: 10px; color: #94a3b8; font-weight: normal; truncate">${currentSlots[0]?.title || 'Slot 1'}</div>
        </th>
        ${currentSlots.slice(1).map((s, idx) => {
          if (!s) return '';
          return `
            <th>
              <div>Slot ${idx + 2}</div>
              <div style="font-size: 10px; color: #94a3b8; font-weight: normal; truncate">${s.title}</div>
            </th>
          `;
        }).join('')}
      </tr>
    </thead>
    <tbody>
  `;

  if (!aiResult || aiResult.comparison_matrix.length === 0) {
    html += `
      <tr>
        <td colspan="${activeProducts.length + 1}" style="text-align: center; color: #64748b; padding: 20px;">
          Nenhum atributo extraído dos anúncios.
        </td>
      </tr>
    `;
  } else {
    aiResult.comparison_matrix.forEach(row => {
      html += `
        <tr class="spec-row">
          <td style="font-weight: 600; color: #f1f5f9; background: #0f172a;">
            ${row.attribute_name}
          </td>
          <td style="font-family: monospace; color: #67e8f9; background: rgba(6, 182, 212, 0.08); font-weight: 600;">
            ${row.slot_1_value}
          </td>
          ${currentSlots.slice(1).map((s, idx) => {
            if (!s) return '';
            const slotNum = idx + 2;
            const comp = row.comparisons[`slot_${slotNum}`];

            if (!comp) return `<td>—</td>`;

            let badgeHtml = '';
            if (comp.status === 'equal') {
              badgeHtml = `<div style="font-size: 9px; color: #34d399; font-weight: 700; margin-top: 2px;">[Idêntico]</div>`;
            } else if (comp.status === 'divergent') {
              badgeHtml = `<div style="font-size: 9px; color: #f59e0b; font-weight: 700; margin-top: 2px;">[Divergência]</div>`;
            } else {
              badgeHtml = `<div style="font-size: 9px; color: #64748b; margin-top: 2px;">[Não informado]</div>`;
            }

            return `
              <td class="${comp.status === 'divergent' ? 'disparity-cell' : ''}" style="font-family: monospace;">
                <div>${comp.value}</div>
                ${badgeHtml}
              </td>
            `;
          }).join('')}
        </tr>
      `;
    });
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
function renderExecutiveVerdict(aiResult, activeProducts) {
  const container = document.getElementById('verdictContent');
  if (!aiResult) return;

  container.innerHTML = `
    <div style="margin-bottom: 6px; font-weight: 600; color: #f8fafc;">
      🏷️ <strong>Categoria Inferida pela IA:</strong> ${aiResult.detected_category}
    </div>
    <div style="color: #cbd5e1; font-size: 12px; line-height: 1.5;">
      ${aiResult.executive_summary}
    </div>
  `;
}

// Copy Comparison Report
function copyComparisonReport() {
  const activeProducts = currentSlots.filter(s => s !== null);
  if (activeProducts.length < 2 || !currentAIResult) return;

  let report = `📊 *AUTOCOMPARE MULTI-MARKETPLACE (EXTRAÇÃO DINÂMICA IA)*\n`;
  report += `🏷️ *Categoria:* ${currentAIResult.detected_category}\n`;
  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  activeProducts.forEach(p => {
    const total = (p.price || 0) + (p.shipping || 0);
    report += `📦 *Slot ${p.id} (${p.platform}):* ${p.title}\n`;
    report += `💰 *Total:* ${formatCurrency(total)} (Base: ${formatCurrency(p.price)} | Frete: ${formatCurrency(p.shipping)})\n`;
  });
  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  report += `⚖️ *VEREDITO DA IA:*\n${currentAIResult.executive_summary}\n\n`;
  report += `🔍 *CONFRONTO TÉCNICO (BASE: SLOT 1):*\n`;
  currentAIResult.comparison_matrix.forEach(row => {
    report += `• *${row.attribute_name}:* Slot 1 = "${row.slot_1_value}"`;
    for (let i = 2; i <= 5; i++) {
      const comp = row.comparisons[`slot_${i}`];
      if (comp && currentSlots[i - 1]) {
        report += ` | Slot ${i} = "${comp.value}" [${comp.status}]`;
      }
    }
    report += `\n`;
  });
  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  report += `Gerado via AutoCompare Chrome Extension`;

  navigator.clipboard.writeText(report).then(() => {
    showStatus('Relatório copiado para a área de transferência!', 'success');
  });
}

// Show banner status
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
