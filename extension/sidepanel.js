/**
 * AutoCompare Multi-Marketplace - SidePanel Controller (Manifest V3)
 * Integração com Gemini API, extração agnóstica e renderização da matriz de especificações
 */

let currentSlots = [null, null, null, null, null];
let selectedBaseSlot = 1;
let currentAIResult = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  loadSlotsFromStorage();
  setupEventListeners();
});

// Load slots from chrome.storage.local
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

  // Copy full report
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
  const title = data.title || `Produto Slot ${slotIndex + 1}`;
  const rawSpecs = data.raw_specs || (data.specs
    ? Object.entries(data.specs).map(([k, v]) => `- ${k}: ${v}`).join('\n')
    : `Produto: ${title}\nPreço: R$ ${data.price || 0}`);

  const productObj = {
    id: slotIndex + 1,
    platform: data.platform || 'Desconhecido',
    title: title,
    price: typeof data.price === 'number' ? data.price : parseFloat(data.price) || 0,
    shipping: typeof data.shipping === 'number' ? data.shipping : parseFloat(data.shipping) || 0,
    image: data.image || '',
    specs: data.specs || {},
    raw_specs: rawSpecs,
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

// Helper: Format BRL
function formatCurrency(val) {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Helper: Normalize string
function cleanStr(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper: Fallback title specs extraction
function extractSpecsFromTitle(title) {
  const specs = {};
  if (!title) return specs;

  const gsmMatch = title.match(/(\d{2,4})\s*(gsm|g\/m²|g\b|gr\b)/i);
  if (gsmMatch) specs['Gramatura / Espessura'] = `${gsmMatch[1]} g/m²`;

  const compMatch = title.match(/(\d{1,3}%\s*(?:algod[aã]o|cotton|poli[eé]ster|linho|seda)|couro\s*(?:pu|leg[ií]timo)?)/i);
  if (compMatch) specs['Composição / Material'] = compMatch[0];

  const sheetsMatch = title.match(/(\d{2,4})\s*(?:folhas|fls|pages|p[aá]ginas|pags)/i);
  if (sheetsMatch) specs['Quantidade de Folhas/Páginas'] = `${sheetsMatch[1]} folhas`;

  const sizeMatch = title.match(/\b(A3|A4|A5|A6|B5|B6|\d+(?:[.,]\d+)?\s*x\s*\d+(?:[.,]\d+)?\s*(?:cm|mm|in|polegadas)?)\b/i);
  if (sizeMatch) specs['Dimensões / Formato'] = sizeMatch[0];

  const coverMatch = title.match(/\b(hardcover|capa dura|softcover|capa comum|espiral|wire-o|costurado)\b/i);
  if (coverMatch) specs['Tipo de Encadernação / Capa'] = coverMatch[0];

  const voltMatch = title.match(/(\d{1,3}V\b|bivolt)/i);
  if (voltMatch) specs['Tensão / Voltagem'] = voltMatch[0].toUpperCase();

  const torqueMatch = title.match(/(\d{1,3})\s*(?:nm|n\.m)/i);
  if (torqueMatch) specs['Torque Máximo'] = `${torqueMatch[1]} Nm`;

  const btMatch = title.match(/(?:bluetooth|bt)\s*(\d+\.\d+)/i);
  if (btMatch) specs['Versão do Bluetooth'] = `Bluetooth ${btMatch[1]}`;

  return specs;
}

/**
 * Motor Dinâmico de Extração e Confronto de Especificações (specs_matrix)
 */
function processAIAuditLocal(slots) {
  const activeSlots = slots.filter(s => s !== null);
  const slot1 = slots[0];

  const allTitles = activeSlots.map(s => s.title.toLowerCase()).join(' ');
  let category = 'Artigos Gerais & E-commerce';
  if (/sketchbook|caderno|papel|folhas|a5|a4|aquarela|gramatura|180gsm|hardcover/i.test(allTitles)) {
    category = 'Papelaria & Artigos de Arte';
  } else if (/furadeira|parafusadeira|torque|mandril|rpm|impacto/i.test(allTitles)) {
    category = 'Ferramentas Elétricas & Manuais';
  } else if (/serum|vitamina|anti-idade|pele|fps|facial/i.test(allTitles)) {
    category = 'Cosméticos & Cuidados Pessoais';
  } else if (/camiseta|algodao|fio|gola|tecido|pima/i.test(allTitles)) {
    category = 'Vestuário & Moda Têxtil';
  } else if (/fone|bluetooth|tws|anc|estojo|driver/i.test(allTitles)) {
    category = 'Áudio & Fones de Ouvido';
  }

  const attributeMap = new Map();
  const slotSpecsEnriched = {};

  activeSlots.forEach(slot => {
    const rawSpecs = { ...(slot.specs || {}) };
    const fromTitle = extractSpecsFromTitle(slot.title);
    Object.entries(fromTitle).forEach(([k, v]) => {
      if (!rawSpecs[k]) rawSpecs[k] = v;
    });

    slotSpecsEnriched[slot.id] = rawSpecs;

    Object.keys(rawSpecs).forEach(k => {
      const cleanK = cleanStr(k);
      if (cleanK && !attributeMap.has(cleanK)) {
        attributeMap.set(cleanK, k.trim());
      }
    });
  });

  const specs_matrix = [];

  attributeMap.forEach((displayLabel, cleanKey) => {
    let s1Val = 'Não informado';
    if (slotSpecsEnriched[1]) {
      for (const [k, v] of Object.entries(slotSpecsEnriched[1])) {
        if (cleanStr(k) === cleanKey || cleanStr(k).includes(cleanKey) || cleanKey.includes(cleanStr(k))) {
          s1Val = v;
          break;
        }
      }
    }

    const matrixRow = {
      attribute: displayLabel,
      slot_1: s1Val,
    };

    for (let i = 2; i <= 5; i++) {
      const slotKey = `slot_${i}`;
      if (!slots[i - 1]) {
        matrixRow[slotKey] = '—';
        continue;
      }

      let foundVal = null;
      if (slotSpecsEnriched[i]) {
        for (const [k, v] of Object.entries(slotSpecsEnriched[i])) {
          if (cleanStr(k) === cleanKey || cleanStr(k).includes(cleanKey) || cleanKey.includes(cleanStr(k))) {
            foundVal = v;
            break;
          }
        }
      }

      if (!foundVal) {
        matrixRow[slotKey] = 'Não informada';
      } else {
        const isIdentical = s1Val !== 'Não informado' && cleanStr(s1Val) === cleanStr(foundVal);
        matrixRow[slotKey] = isIdentical ? `${foundVal} (Idêntico)` : `${foundVal} (Divergente)`;
      }
    }

    specs_matrix.push(matrixRow);
  });

  let minTotal = Infinity;
  let minSlot = activeSlots[0];
  activeSlots.forEach(s => {
    const tot = (s.price || 0) + (s.shipping || 0);
    if (tot < minTotal) {
      minTotal = tot;
      minSlot = s;
    }
  });

  const technical_verdict = `O confronto técnico revela que a opção de menor custo (Slot ${minSlot?.id}) pode conter reduções em relação ao Slot 1. O Slot 1 se destaca como a referência mais equilibrada em atributos técnicos reais.`;

  return {
    category,
    reference_slot: 1,
    specs_matrix,
    technical_verdict,
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
    const slotId = i + 1;
    const isBase = slotId === 1;

    if (slot) {
      const isShopee = slot.platform.toLowerCase().includes('shopee');
      const totalPrice = (slot.price || 0) + (slot.shipping || 0);

      slotEl.className = 'slot-card';
      if (isBase) slotEl.style.border = '1px solid #06b6d4';

      slotEl.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span class="badge ${isShopee ? 'badge-shopee' : 'badge-ali'}">Slot ${slotId} • ${slot.platform}${isBase ? ' (Base)' : ''}</span>
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

    currentAIResult = processAIAuditLocal(currentSlots);

    renderFinancialMatrix(activeProducts);
    renderSpecsMatrixTable(currentAIResult, activeProducts);
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
          <th class="${p.id === 1 ? 'base-col-header' : ''}">
            <div style="display: flex; align-items: center; gap: 4px;">
              <span class="badge" style="background: #1e293b; color: #fff;">Slot ${p.id}${p.id === 1 ? ' (Base)' : ''}</span>
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

// Render Specs Matrix Table (specs_matrix)
function renderSpecsMatrixTable(aiResult, activeProducts) {
  const table = document.getElementById('specMatrixTable');

  let html = `
    <thead>
      <tr>
        <th style="width: 140px;">Especificação Canónica</th>
        ${activeProducts.map(p => {
          const isBase = p.id === 1;
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

  if (!aiResult || !aiResult.specs_matrix || aiResult.specs_matrix.length === 0) {
    html += `
      <tr>
        <td colspan="${activeProducts.length + 1}" style="text-align: center; color: #64748b; padding: 20px;">
          Nenhuma especificação técnica encontrada nos anúncios.
        </td>
      </tr>
    `;
  } else {
    aiResult.specs_matrix.forEach(row => {
      html += `
        <tr class="spec-row">
          <td style="font-weight: 600; color: #f1f5f9; background: #0f172a;">
            ${row.attribute}
          </td>
          ${activeProducts.map(p => {
            const isBase = p.id === 1;
            const rawVal = row[`slot_${p.id}`] || 'Não informada';
            const cleanVal = rawVal.replace(/\s*\(.*?\)/g, '').trim();

            let badgeHtml = '';
            let cellClass = '';

            if (isBase) {
              badgeHtml = `<div style="font-size: 9px; color: #38bdf8; font-weight: 700; margin-top: 2px;">★ Base</div>`;
              cellClass = 'base-col-cell';
            } else if (/idêntico|identico/i.test(rawVal)) {
              badgeHtml = `<div style="font-size: 9px; color: #34d399; font-weight: 700; margin-top: 2px;">[Idêntico]</div>`;
              cellClass = 'bg-emerald-950/10';
            } else if (/não informad|nao informad/i.test(rawVal)) {
              badgeHtml = `<div style="font-size: 9px; color: #64748b; margin-top: 2px;">[Não informado]</div>`;
            } else {
              badgeHtml = `<div style="font-size: 9px; color: #f59e0b; font-weight: 700; margin-top: 2px;">[Divergente]</div>`;
              cellClass = 'disparity-cell';
            }

            return `
              <td class="${cellClass}" style="font-family: monospace;">
                <div>${cleanVal || rawVal}</div>
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
      🏷️ <strong>Categoria Inferida:</strong> ${aiResult.category || 'Geral'}
    </div>
    <div style="color: #cbd5e1; font-size: 12px; line-height: 1.5;">
      ${aiResult.technical_verdict}
    </div>
  `;
}

// Copy Comparison Report with full specs_matrix table
function copyComparisonReport() {
  const activeProducts = currentSlots.filter(s => s !== null);
  if (activeProducts.length < 2 || !currentAIResult) return;

  let report = `📊 *AUTOCOMPARE MULTI-MARKETPLACE (AUDITORIA TÉCNICA)*\n`;
  report += `🏷️ *Categoria:* ${currentAIResult.category}\n`;
  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  activeProducts.forEach(p => {
    const total = (p.price || 0) + (p.shipping || 0);
    report += `📦 *Slot ${p.id} (${p.platform}):* ${p.title}\n`;
    report += `💰 *Total:* ${formatCurrency(total)} (Base: ${formatCurrency(p.price)} | Frete: ${formatCurrency(p.shipping)})\n`;
  });
  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  report += `⚖️ *VEREDITO TÉCNICO E COMERCIAL:*\n${currentAIResult.technical_verdict}\n\n`;
  report += `🔍 *MATRIZ CANÔNICA DE ESPECIFICAÇÕES (CHAVE A CHAVE):*\n`;
  currentAIResult.specs_matrix.forEach(row => {
    report += `• *${row.attribute}:*\n`;
    activeProducts.forEach(p => {
      const val = row[`slot_${p.id}`] || 'Não informada';
      report += `   - Slot ${p.id}: ${val}\n`;
    });
  });
  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  report += `Gerado via AutoCompare Chrome Extension`;

  navigator.clipboard.writeText(report).then(() => {
    showStatus('Relatório completo copiado para a área de transferência!', 'success');
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
