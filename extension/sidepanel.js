/**
 * AutoCompare Multi-Marketplace - SidePanel Logic (Manifest V3)
 * Módulo de Comparação Cruzada de Especificações Técnicas Entre Cada Slot
 */

let currentSlots = [null, null, null, null, null];
let selectedBaseSlot = 1;
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

    chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PRODUCT_DATA' }, async (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
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
                showStatus('Não foi possível extrair dados desta página.', 'error');
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
    showStatus(`Produto capturado no Slot ${slotIndex + 1}!`, 'success');
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
 * Processa a comparação cruzada dinâmica entre todos os slots ativos
 */
function processCrossSlotAudit(slots, baseSlotId) {
  const activeSlots = slots.filter(s => s !== null);
  const baseSlot = slots[baseSlotId - 1] || activeSlots[0] || slots[0];

  // 1. Mineração de atributos únicos
  const attributeMap = new Map(); // cleanKey -> Display Name

  activeSlots.forEach(slot => {
    Object.keys(slot.specs || {}).forEach(k => {
      const cleanK = cleanStr(k);
      if (cleanK && !attributeMap.has(cleanK)) {
        attributeMap.set(cleanK, k.trim());
      }
    });
  });

  // 2. Inferir categoria dos títulos
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

  // 3. Confronto Cruzado entre cada slot tendo o baseSlotId como parâmetro
  const comparisonMatrix = [];

  attributeMap.forEach((displayLabel, cleanKey) => {
    // Valor no Slot Base
    let baseVal = 'Não informado';
    if (baseSlot && baseSlot.specs) {
      for (const [k, v] of Object.entries(baseSlot.specs)) {
        if (cleanStr(k) === cleanKey || cleanStr(k).includes(cleanKey) || cleanKey.includes(cleanStr(k))) {
          baseVal = v;
          break;
        }
      }
    }

    const slot_values = {};
    const comparisons = {};
    const valuesBySlot = [];

    // Avaliar cada slot de 1 a 5
    for (let i = 0; i < 5; i++) {
      const slotNum = i + 1;
      const slotObj = slots[i];
      const slotKey = `slot_${slotNum}`;

      if (!slotObj) {
        slot_values[slotKey] = '—';
        continue;
      }

      let foundVal = null;
      for (const [k, v] of Object.entries(slotObj.specs || {})) {
        if (cleanStr(k) === cleanKey || cleanStr(k).includes(cleanKey) || cleanKey.includes(cleanStr(k))) {
          foundVal = v;
          break;
        }
      }

      const valDisplay = foundVal || 'Não informado';
      slot_values[slotKey] = valDisplay;

      if (slotNum === baseSlotId) {
        comparisons[slotKey] = {
          value: valDisplay,
          status: 'base',
        };
      } else if (!foundVal) {
        comparisons[slotKey] = {
          value: 'Não informado',
          status: 'missing',
        };
      } else {
        const isIdentical = baseVal !== 'Não informado' && cleanStr(baseVal) === cleanStr(foundVal);
        comparisons[slotKey] = {
          value: foundVal,
          status: isIdentical ? 'equal' : 'divergent',
        };
      }

      if (foundVal) {
        valuesBySlot.push({ slotId: slotNum, val: foundVal, clean: cleanStr(foundVal) });
      }
    }

    // Identificar grupos idênticos entre si
    const distinctClean = new Set(valuesBySlot.map(v => v.clean));
    const hasDisparity = distinctClean.size > 1;

    comparisonMatrix.push({
      attribute_name: displayLabel,
      slot_values,
      comparisons,
      hasDisparity,
    });
  });

  // 4. Veredito Executivo
  let minTotal = Infinity;
  let minSlot = activeSlots[0];
  activeSlots.forEach(s => {
    const tot = (s.price || 0) + (s.shipping || 0);
    if (tot < minTotal) {
      minTotal = tot;
      minSlot = s;
    }
  });

  const executiveSummary = `Comparando todas as especificações técnicas entre os ${activeSlots.length} slots, o Slot ${minSlot?.id} (${minSlot?.platform}) oferece o menor desembolso total (${formatCurrency(minTotal)}). Utilize o Slot ${baseSlotId} como referência para analisar ganhos técnicos e divergências nas especificações.`;

  return {
    detected_category: detectedCategory,
    base_slot_id: baseSlotId,
    comparison_matrix: comparisonMatrix,
    executive_summary: executiveSummary,
  };
}

// Render Master UI
function renderUI() {
  const activeProducts = currentSlots.filter(s => s !== null);
  const activeCount = activeProducts.length;

  document.getElementById('slotCountLabel').innerText = `${activeCount}/5`;

  if (activeProducts.length > 0 && !currentSlots[selectedBaseSlot - 1]) {
    selectedBaseSlot = activeProducts[0].id;
  }

  // 1. Render Slot Cards Strip
  const container = document.getElementById('slotsContainer');
  container.innerHTML = '';

  for (let i = 0; i < 5; i++) {
    const slot = currentSlots[i];
    const slotEl = document.createElement('div');
    const slotId = i + 1;
    const isBase = slotId === selectedBaseSlot;

    if (slot) {
      const isShopee = slot.platform.toLowerCase().includes('shopee');
      const totalPrice = (slot.price || 0) + (slot.shipping || 0);

      slotEl.className = 'slot-card';
      if (isBase) slotEl.style.border = '1px solid #06b6d4';

      slotEl.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span class="badge ${isShopee ? 'badge-shopee' : 'badge-ali'}">Slot ${slotId} • ${slot.platform}</span>
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
          <button class="btn-set-base" data-slotid="${slotId}" style="background: ${isBase ? '#06b6d4' : '#1e293b'}; color: ${isBase ? '#020617' : '#94a3b8'}; border: 1px solid #334155; border-radius: 4px; padding: 2px 4px; font-weight: ${isBase ? 'bold' : 'normal'}; cursor: pointer;">
            ${isBase ? '★ Base' : 'Definir Base'}
          </button>
          <button class="btn-recapture" data-slot="${i}" style="background: #1e293b; border: 1px solid #334155; border-radius: 4px; padding: 2px 4px; color: #94a3b8; cursor: pointer;">Recapturar</button>
        </div>
      `;
    } else {
      slotEl.className = 'slot-card slot-empty';
      slotEl.innerHTML = `
        <div>
          <div style="font-weight: 700; font-size: 11px; color: #475569; margin-bottom: 2px;">SLOT ${slotId} LIVRE</div>
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

  container.querySelectorAll('.btn-set-base').forEach(btn => {
    btn.addEventListener('click', (e) => {
      selectedBaseSlot = parseInt(e.currentTarget.getAttribute('data-slotid'), 10);
      renderUI();
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

    currentAIResult = processCrossSlotAudit(currentSlots, selectedBaseSlot);

    renderFinancialMatrix(activeProducts);
    renderBaseSelectorButtons(activeProducts);
    renderCrossSpecMatrix(currentAIResult, activeProducts);
    renderExecutiveVerdict(currentAIResult, activeProducts);
  } else {
    compSection.style.display = 'none';
    emptyState.style.display = 'block';
    currentAIResult = null;
  }
}

// Render Base Selector Buttons
function renderBaseSelectorButtons(activeProducts) {
  const container = document.getElementById('baseSlotButtons');
  container.innerHTML = '';

  activeProducts.forEach(p => {
    const isBase = p.id === selectedBaseSlot;
    const btn = document.createElement('button');
    btn.className = 'btn-secondary';
    btn.style.padding = '2px 6px';
    btn.style.fontSize = '10px';
    if (isBase) {
      btn.style.background = '#06b6d4';
      btn.style.color = '#020617';
      btn.style.fontWeight = 'bold';
    }
    btn.innerText = `Slot ${p.id} (${p.platform})`;
    btn.addEventListener('click', () => {
      selectedBaseSlot = p.id;
      renderUI();
    });
    container.appendChild(btn);
  });
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
          <th class="${p.id === selectedBaseSlot ? 'base-col-header' : ''}">
            <div style="display: flex; align-items: center; gap: 4px;">
              <span class="badge" style="background: #1e293b; color: #fff;">Slot ${p.id}${p.id === selectedBaseSlot ? ' (Base)' : ''}</span>
              <span style="max-width: 90px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.platform}</span>
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

// Render Cross Spec Matrix with Base Slot highlighting and per-slot comparison
function renderCrossSpecMatrix(aiResult, activeProducts) {
  const table = document.getElementById('specMatrixTable');

  let html = `
    <thead>
      <tr>
        <th style="width: 140px;">Atributo Técnico</th>
        ${activeProducts.map(p => {
          const isBase = p.id === selectedBaseSlot;
          return `
            <th class="${isBase ? 'base-col-header' : ''}">
              <div style="font-weight: 700;">Slot ${p.id} ${isBase ? '(Base)' : ''}</div>
              <div style="font-size: 10px; color: #94a3b8; font-weight: normal; max-width: 110px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.title}</div>
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
        <tr class="spec-row ${row.hasDisparity ? 'disparity-row' : ''}">
          <td style="font-weight: 600; color: #f1f5f9; background: #0f172a;">
            ${row.attribute_name}
            ${row.hasDisparity ? `<span style="font-size: 9px; color: #f59e0b; display: block; font-weight: normal;">⚡ Disparidade</span>` : ''}
          </td>
          ${activeProducts.map(p => {
            const isBase = p.id === selectedBaseSlot;
            const val = row.slot_values[`slot_${p.id}`] || 'Não informado';
            const comp = row.comparisons[`slot_${p.id}`];
            const isMissing = val === 'Não informado' || val === '—';

            let badgeHtml = '';
            if (isBase) {
              badgeHtml = `<div style="font-size: 9px; color: #38bdf8; font-weight: 700; margin-top: 2px;">★ Base</div>`;
            } else if (comp?.status === 'equal') {
              badgeHtml = `<div style="font-size: 9px; color: #34d399; font-weight: 700; margin-top: 2px;">[Idêntico]</div>`;
            } else if (comp?.status === 'divergent') {
              badgeHtml = `<div style="font-size: 9px; color: #f59e0b; font-weight: 700; margin-top: 2px;">[Divergência]</div>`;
            } else {
              badgeHtml = `<div style="font-size: 9px; color: #64748b; margin-top: 2px;">[Não informado]</div>`;
            }

            return `
              <td class="${isBase ? 'base-col-cell' : comp?.status === 'divergent' ? 'disparity-cell' : ''}" style="font-family: monospace;">
                <div style="${isMissing ? 'color: #64748b; font-style: italic;' : ''}">${val}</div>
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
      🏷️ <strong>Categoria:</strong> ${aiResult.detected_category} • <strong>Base de Comparação:</strong> Slot ${selectedBaseSlot}
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

  let report = `📊 *AUTOCOMPARE MULTI-MARKETPLACE (CONFRONTO ENTRE SLOTS)*\n`;
  report += `🏷️ *Categoria:* ${currentAIResult.detected_category}\n`;
  report += `🎯 *Base de Referência:* Slot ${selectedBaseSlot} (${currentSlots[selectedBaseSlot - 1]?.title})\n`;
  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  activeProducts.forEach(p => {
    const total = (p.price || 0) + (p.shipping || 0);
    report += `📦 *Slot ${p.id} (${p.platform}):* ${p.title}\n`;
    report += `💰 *Total:* ${formatCurrency(total)} (Base: ${formatCurrency(p.price)} | Frete: ${formatCurrency(p.shipping)})\n`;
  });
  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  report += `⚖️ *VEREDITO DA IA:*\n${currentAIResult.executive_summary}\n\n`;
  report += `🔍 *CONFRONTO TÉCNICO ENTRE CADA SLOT:*\n`;
  currentAIResult.comparison_matrix.forEach(row => {
    report += `• *${row.attribute_name}:*\n`;
    activeProducts.forEach(p => {
      const val = row.slot_values[`slot_${p.id}`] || 'Não informado';
      const comp = row.comparisons[`slot_${p.id}`];
      report += `   - Slot ${p.id}: "${val}" [${p.id === selectedBaseSlot ? 'Base' : comp?.status || 'info'}]\n`;
    });
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
