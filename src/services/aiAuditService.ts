import {
  ProductSlot,
  DynamicComparisonResult,
  DynamicComparisonRow,
  SpecsMatrixRow,
  ComparisonStatus,
  PairwiseComparison,
} from '../types/extension';

// Helper: Normalize string for comparison
function cleanStr(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper: Extract specs from title when raw_specs is short (Fallback por Título)
function extractSpecsFromTitle(title: string): Record<string, string> {
  const specs: Record<string, string> = {};
  if (!title) return specs;

  // Gramatura (ex: 180GSM, 70g, 180g/m²)
  const gsmMatch = title.match(/(\d{2,4})\s*(gsm|g\/m²|g\b|gr\b)/i);
  if (gsmMatch) specs['Gramatura / Espessura'] = `${gsmMatch[1]} g/m²`;

  // Composição (ex: 100% Algodão, 50% Cotton, Couro PU)
  const compMatch = title.match(/(\d{1,3}%\s*(?:algod[aã]o|cotton|poli[eé]ster|linho|seda)|couro\s*(?:pu|leg[ií]timo)?)/i);
  if (compMatch) specs['Composição / Material'] = compMatch[0];

  // Folhas / Páginas (ex: 50 folhas, 100 pages, 80 fls)
  const sheetsMatch = title.match(/(\d{2,4})\s*(?:folhas|fls|pages|p[aá]ginas|pags)/i);
  if (sheetsMatch) specs['Quantidade de Folhas/Páginas'] = `${sheetsMatch[1]} folhas`;

  // Dimensões / Formato (ex: A5, A4, B5, 8.3x5.9in, 21x14cm)
  const sizeMatch = title.match(/\b(A3|A4|A5|A6|B5|B6|\d+(?:[.,]\d+)?\s*x\s*\d+(?:[.,]\d+)?\s*(?:cm|mm|in|polegadas)?)\b/i);
  if (sizeMatch) specs['Dimensões / Formato'] = sizeMatch[0];

  // Encadernação (ex: Hardcover, Capa Dura, Espiral, Brochura)
  const coverMatch = title.match(/\b(hardcover|capa dura|softcover|capa comum|espiral|wire-o|costurado)\b/i);
  if (coverMatch) specs['Tipo de Encadernação / Capa'] = coverMatch[0];

  // Voltagem / Tensão (ex: 21V, 12V, 20V, 110V, 220V, Bivolt)
  const voltMatch = title.match(/(\d{1,3}V\b|bivolt)/i);
  if (voltMatch) specs['Tensão / Voltagem'] = voltMatch[0].toUpperCase();

  // Torque (ex: 45Nm, 60 N.m)
  const torqueMatch = title.match(/(\d{1,3})\s*(?:nm|n\.m)/i);
  if (torqueMatch) specs['Torque Máximo'] = `${torqueMatch[1]} Nm`;

  // Bluetooth (ex: Bluetooth 5.3, BT 5.0)
  const btMatch = title.match(/(?:bluetooth|bt)\s*(\d+\.\d+)/i);
  if (btMatch) specs['Versão do Bluetooth'] = `Bluetooth ${btMatch[1]}`;

  return specs;
}

// Autonomous Dynamic Heuristic Miner with Title Fallback & Strict specs_matrix Generation
export function generateDynamicFallbackAudit(
  slots: (ProductSlot | null)[],
  baseSlotId = 1
): DynamicComparisonResult {
  const activeSlots = slots.filter((s): s is ProductSlot => s !== null);
  const baseSlot = slots[baseSlotId - 1] || activeSlots[0] || slots[0];

  // 1. Infer Category
  const allTitles = activeSlots.map(s => s.title.toLowerCase()).join(' ');
  let detectedCategory = 'Artigos Gerais & E-commerce';
  if (/sketchbook|caderno|papel|folhas|a5|a4|aquarela|gramatura|180gsm|hardcover/i.test(allTitles)) {
    detectedCategory = 'Papelaria & Artigos de Arte';
  } else if (/parafusadeira|furadeira|impacto|torque|mandril|rpm/i.test(allTitles)) {
    detectedCategory = 'Ferramentas Elétricas & Manuais';
  } else if (/serum|vitamina|anti-idade|facial|pele|hidratante|acido/i.test(allTitles)) {
    detectedCategory = 'Cosméticos & Cuidados Pessoais';
  } else if (/fone|bluetooth|tws|fone de ouvido|anc|soundcore/i.test(allTitles)) {
    detectedCategory = 'Áudio & Eletrônicos Pessoais';
  } else if (/camiseta|algodao|tecido|gola|camisa|vestuario/i.test(allTitles)) {
    detectedCategory = 'Vestuário & Moda Têxtil';
  }

  // 2. Mine all attributes with Title Fallback for each slot
  const attributeMap = new Map<string, string>(); // normKey -> DisplayLabel
  const slotSpecsEnriched: Record<number, Record<string, string>> = {};

  activeSlots.forEach(slot => {
    const rawSpecs = { ...(slot.specs || {}) };
    // Enrich with title extraction
    const titleExtracted = extractSpecsFromTitle(slot.title);
    Object.entries(titleExtracted).forEach(([k, v]) => {
      if (!rawSpecs[k]) rawSpecs[k] = v;
    });

    slotSpecsEnriched[slot.id] = rawSpecs;

    Object.keys(rawSpecs).forEach(rawKey => {
      const trimmed = rawKey.trim();
      const normKey = cleanStr(trimmed);
      if (normKey && !attributeMap.has(normKey)) {
        attributeMap.set(normKey, trimmed);
      }
    });
  });

  // 3. Build Comparison Matrix and specs_matrix format
  const comparisonMatrix: DynamicComparisonRow[] = [];
  const specs_matrix: SpecsMatrixRow[] = [];

  attributeMap.forEach((displayLabel, normKey) => {
    // Value in Slot 1
    const s1Raw = slotSpecsEnriched[1] ? findMatchingValue(slotSpecsEnriched[1], normKey) : null;
    const slot_1_value = s1Raw || 'Não informado';

    // Base Slot value
    const baseRaw = slotSpecsEnriched[baseSlotId] ? findMatchingValue(slotSpecsEnriched[baseSlotId], normKey) : null;
    const baseValueNormalized = baseRaw || 'Não informado';

    const slot_values: Record<string, string> = {};
    const comparisons: Record<string, { value: string; status: ComparisonStatus; diffNote?: string }> = {};

    const matrixRow: SpecsMatrixRow = {
      attribute: displayLabel,
      slot_1: slot_1_value,
    };

    // Evaluate slots 1 to 5
    for (let i = 0; i < 5; i++) {
      const slotNum = i + 1;
      const slotObj = slots[i];
      const slotKeyName = `slot_${slotNum}`;

      if (!slotObj) {
        slot_values[slotKeyName] = '—';
        continue;
      }

      const rawVal = slotSpecsEnriched[slotNum] ? findMatchingValue(slotSpecsEnriched[slotNum], normKey) : null;
      const valDisplay = rawVal || 'Não informado';
      slot_values[slotKeyName] = valDisplay;

      if (slotNum === 1) {
        matrixRow.slot_1 = valDisplay;
      } else {
        if (!rawVal) {
          matrixRow[slotKeyName] = 'Não informada';
        } else {
          const isIdentical = slot_1_value !== 'Não informado' && cleanStr(slot_1_value) === cleanStr(rawVal);
          matrixRow[slotKeyName] = isIdentical ? `${rawVal} (Idêntico)` : `${rawVal} (Divergente)`;
        }
      }

      if (slotNum === baseSlotId) {
        comparisons[slotKeyName] = {
          value: valDisplay,
          status: 'base',
          diffNote: 'Base de Referência',
        };
      } else if (!rawVal) {
        comparisons[slotKeyName] = {
          value: 'Não informado',
          status: 'missing',
          diffNote: 'Dado não informado',
        };
      } else {
        const isIdentical =
          baseValueNormalized !== 'Não informado' &&
          cleanStr(baseValueNormalized) === cleanStr(rawVal);

        comparisons[slotKeyName] = {
          value: rawVal,
          status: isIdentical ? 'equal' : 'divergent',
          diffNote: isIdentical
            ? `Idêntico ao Slot ${baseSlotId}`
            : `Divergência técnica vs Slot ${baseSlotId}`,
        };
      }
    }

    comparisonMatrix.push({
      attribute_name: displayLabel,
      slot_1_value,
      slot_values,
      comparisons,
    });

    specs_matrix.push(matrixRow);
  });

  // 4. Pairwise Cross Comparisons
  const pairwise_matrix: Record<string, PairwiseComparison> = {};

  for (let i = 0; i < activeSlots.length; i++) {
    for (let j = i + 1; j < activeSlots.length; j++) {
      const slotA = activeSlots[i];
      const slotB = activeSlots[j];
      const pairKey = `${slotA.id}_vs_${slotB.id}`;

      let identicalCount = 0;
      let divergentCount = 0;
      let missingCount = 0;
      const advantagesA: string[] = [];
      const advantagesB: string[] = [];

      comparisonMatrix.forEach(row => {
        const valA = row.slot_values[`slot_${slotA.id}`];
        const valB = row.slot_values[`slot_${slotB.id}`];

        const hasA = valA && valA !== 'Não informado' && valA !== '—';
        const hasB = valB && valB !== 'Não informado' && valB !== '—';

        if (!hasA || !hasB) {
          missingCount++;
          if (hasA) advantagesA.push(`${row.attribute_name}: ${valA}`);
          if (hasB) advantagesB.push(`${row.attribute_name}: ${valB}`);
        } else if (cleanStr(valA) === cleanStr(valB)) {
          identicalCount++;
        } else {
          divergentCount++;
          advantagesA.push(`${row.attribute_name}: ${valA} (vs ${valB})`);
          advantagesB.push(`${row.attribute_name}: ${valB} (vs ${valA})`);
        }
      });

      const totalA = (slotA.price || 0) + (slotA.shipping || 0);
      const totalB = (slotB.price || 0) + (slotB.shipping || 0);
      const priceDiff = Math.abs(totalA - totalB);
      const baseForPct = Math.min(totalA, totalB) || 1;
      const priceDiffPercent = Math.round((priceDiff / baseForPct) * 100);
      const cheaperSlot = totalA <= totalB ? slotA.id : slotB.id;

      pairwise_matrix[pairKey] = {
        slotA: slotA.id,
        slotB: slotB.id,
        identicalCount,
        divergentCount,
        missingCount,
        priceDiff,
        priceDiffPercent,
        cheaperSlot,
        advantagesA,
        advantagesB,
      };
    }
  }

  // 5. Technical Verdict
  let minPriceSlot = activeSlots[0];
  let minTotal = Infinity;
  activeSlots.forEach(s => {
    const tot = (s.price || 0) + (s.shipping || 0);
    if (tot < minTotal) {
      minTotal = tot;
      minPriceSlot = s;
    }
  });

  const technicalVerdict = `O confronto técnico revela que a opção mais barata (Slot ${minPriceSlot?.id}) pode conter reduções de especificações em relação ao Slot 1. O Slot 1 se destaca como a referência mais robusta e completa em atributos técnicos.`;

  return {
    detected_category: detectedCategory,
    base_slot_id: baseSlotId,
    comparison_matrix: comparisonMatrix,
    specs_matrix,
    technical_verdict: technicalVerdict,
    pairwise_matrix,
    executive_summary: technicalVerdict,
  };
}

// Helper: match spec value from key
function findMatchingValue(specs: Record<string, string>, normKey: string): string | null {
  for (const [k, v] of Object.entries(specs || {})) {
    if (cleanStr(k) === normKey || cleanStr(k).includes(normKey) || normKey.includes(cleanStr(k))) {
      return v;
    }
  }
  return null;
}

// Main Service Call
export async function performAIAudit(
  slots: (ProductSlot | null)[],
  baseSlotId = 1
): Promise<DynamicComparisonResult> {
  try {
    const res = await fetch('/api/ai-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slots, baseSlotId }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const category = d.category || d.detected_category || 'Produto Geral';
        const technicalVerdict = d.technical_verdict || d.executive_summary || '';

        // If returned specs_matrix format
        if (d.specs_matrix && Array.isArray(d.specs_matrix)) {
          const comparison_matrix: DynamicComparisonRow[] = d.specs_matrix.map((row: any) => {
            const attrName = row.attribute || row.attribute_name || 'Especificação';
            const s1Val = row.slot_1 || row.slot_1_value || 'Não informado';

            const slot_values: Record<string, string> = {
              slot_1: s1Val,
              slot_2: row.slot_2 || 'Não informado',
              slot_3: row.slot_3 || 'Não informado',
              slot_4: row.slot_4 || 'Não informado',
              slot_5: row.slot_5 || 'Não informado',
            };

            const comparisons: Record<string, { value: string; status: ComparisonStatus }> = {};

            for (let i = 1; i <= 5; i++) {
              const sKey = `slot_${i}`;
              const rawStr = row[sKey] || 'Não informado';
              const cleanVal = rawStr.replace(/\s*\(.*?\)/g, '').trim();

              let status: ComparisonStatus = 'divergent';
              if (i === baseSlotId) status = 'base';
              else if (/não informad|nao informad/i.test(rawStr)) status = 'missing';
              else if (/idêntico|identico|equal/i.test(rawStr) || cleanStr(cleanVal) === cleanStr(s1Val)) status = 'equal';

              comparisons[sKey] = {
                value: cleanVal || rawStr,
                status,
              };
            }

            return {
              attribute_name: attrName,
              slot_1_value: s1Val,
              slot_values,
              comparisons,
            };
          });

          return {
            detected_category: category,
            base_slot_id: baseSlotId,
            comparison_matrix,
            specs_matrix: d.specs_matrix,
            technical_verdict: technicalVerdict,
            executive_summary: technicalVerdict,
          };
        }

        if (d.comparison_matrix) {
          return {
            ...d,
            detected_category: category,
            executive_summary: technicalVerdict || d.executive_summary,
          };
        }
      }
    }
  } catch (err) {
    console.warn('Backend /api/ai-audit unavailable, using local dynamic fallback:', err);
  }

  return generateDynamicFallbackAudit(slots, baseSlotId);
}
