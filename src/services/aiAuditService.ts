import {
  ProductSlot,
  DynamicComparisonResult,
  DynamicComparisonRow,
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

// Autonomous Dynamic Heuristic Miner with Cross-Slot & Pairwise Confrontation
function generateDynamicFallbackAudit(
  slots: (ProductSlot | null)[],
  baseSlotId = 1
): DynamicComparisonResult {
  const activeSlots = slots.filter((s): s is ProductSlot => s !== null);
  const baseSlot = slots[baseSlotId - 1] || activeSlots[0] || slots[0];

  // 1. Infer Category Dynamically from product titles
  const allTitles = activeSlots.map(s => s.title.toLowerCase()).join(' ');
  let detectedCategory = 'Produto Geral & E-commerce';
  if (/parafusadeira|furadeira|impacto|torque|mandril|rpm/i.test(allTitles)) {
    detectedCategory = 'Ferramentas Elétricas & Manuais';
  } else if (/serum|vitamina|anti-idade|facial|pele|hidratante|acido/i.test(allTitles)) {
    detectedCategory = 'Cosméticos & Cuidados Pessoais';
  } else if (/fone|bluetooth|tws|fone de ouvido|anc|soundcore/i.test(allTitles)) {
    detectedCategory = 'Áudio & Eletrônicos Pessoais';
  } else if (/camiseta|algodao|tecido|gola|camisa|vestuario/i.test(allTitles)) {
    detectedCategory = 'Vestuário & Moda Têxtil';
  } else if (/compressor|pneu|bar|psi|automotivo|veicular/i.test(allTitles)) {
    detectedCategory = 'Acessórios Automotivos';
  }

  // 2. Mine all dynamic raw keys across all active products
  const uniqueAttributes = new Map<string, string>(); // normalizedKey -> DisplayLabel

  activeSlots.forEach(slot => {
    Object.keys(slot.specs || {}).forEach(rawKey => {
      const trimmed = rawKey.trim();
      const normKey = cleanStr(trimmed);
      if (normKey && !uniqueAttributes.has(normKey)) {
        uniqueAttributes.set(normKey, trimmed);
      }
    });
  });

  // 3. Build Cross Comparison Matrix with Base Slot as parameter + Cross-Slot Diff
  const comparisonMatrix: DynamicComparisonRow[] = [];

  uniqueAttributes.forEach((displayLabel, normKey) => {
    // Value in Slot 1
    const s1Val = slots[0]?.specs ? findMatchingValue(slots[0].specs, normKey) : null;
    const slot_1_value = s1Val || 'Não informado';

    // Base Slot value
    const baseVal = baseSlot?.specs ? findMatchingValue(baseSlot.specs, normKey) : null;
    const baseValueNormalized = baseVal || 'Não informado';

    const slot_values: Record<string, string> = {};
    const comparisons: Record<string, { value: string; status: ComparisonStatus; diffNote?: string }> = {};

    const valuesBySlot: { slotId: number; val: string; clean: string }[] = [];

    // Evaluate each slot (1 to 5)
    for (let i = 0; i < 5; i++) {
      const slotNum = i + 1;
      const slotObj = slots[i];
      const slotKeyName = `slot_${slotNum}`;

      if (!slotObj) {
        slot_values[slotKeyName] = '—';
        continue;
      }

      const rawVal = findMatchingValue(slotObj.specs, normKey);
      const valDisplay = rawVal || 'Não informado';
      slot_values[slotKeyName] = valDisplay;

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
          diffNote: 'Dado não informado pelo vendedor',
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

      if (rawVal) {
        valuesBySlot.push({
          slotId: slotNum,
          val: rawVal,
          clean: cleanStr(rawVal),
        });
      }
    }

    // Cross-slot analysis: check identical clusters among all active slots
    const identicalGroups: string[] = [];
    const divergences: string[] = [];
    const distinctClean = new Set(valuesBySlot.map(v => v.clean));
    const hasDisparity = distinctClean.size > 1;

    // Group slots with identical values
    const grouped = new Map<string, number[]>();
    valuesBySlot.forEach(item => {
      if (!grouped.has(item.clean)) grouped.set(item.clean, []);
      grouped.get(item.clean)!.push(item.slotId);
    });

    grouped.forEach((slotIds, cleanVal) => {
      if (slotIds.length > 1) {
        identicalGroups.push(`Slots ${slotIds.join(' e ')} possuem a mesma especificação`);
      }
    });

    if (hasDisparity) {
      divergences.push(`${distinctClean.size} variações técnicas encontradas entre os produtos ativos`);
    }

    comparisonMatrix.push({
      attribute_name: displayLabel,
      slot_1_value,
      slot_values,
      comparisons,
      cross_analysis: {
        identical_groups: identicalGroups,
        divergences,
        has_disparity: hasDisparity,
        winner_slot: baseSlotId,
      },
    });
  });

  // 4. Pairwise Cross Comparisons (Slot A vs Slot B)
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
          if (hasA) advantagesA.push(`${row.attribute_name}: ${valA} (exclusivo)`);
          if (hasB) advantagesB.push(`${row.attribute_name}: ${valB} (exclusivo)`);
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

  // 5. Executive Summary
  let minPriceSlot = activeSlots[0];
  let minTotal = Infinity;
  activeSlots.forEach(s => {
    const tot = (s.price || 0) + (s.shipping || 0);
    if (tot < minTotal) {
      minTotal = tot;
      minPriceSlot = s;
    }
  });

  const executiveSummary = `O confronto técnico detalhado entre os ${activeSlots.length} slots revela que o Slot ${minPriceSlot?.id} (${minPriceSlot?.platform}) oferece a melhor barreira de entrada no preço final (R$ ${minTotal.toFixed(2).replace('.', ',')}). Compare as divergências em relação ao Slot ${baseSlotId} para avaliar os ganhos reais em cada linha de especificação.`;

  return {
    detected_category: detectedCategory,
    base_slot_id: baseSlotId,
    comparison_matrix: comparisonMatrix,
    pairwise_matrix,
    executive_summary: executiveSummary,
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
      if (json.success && json.data && json.data.comparison_matrix) {
        return json.data as DynamicComparisonResult;
      }
    }
  } catch (err) {
    console.warn('Backend /api/ai-audit unavailable, utilizing autonomous dynamic engine:', err);
  }

  // Fallback to local autonomous dynamic engine
  return generateDynamicFallbackAudit(slots, baseSlotId);
}
