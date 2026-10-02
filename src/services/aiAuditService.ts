import { ProductSlot, DynamicComparisonResult, DynamicComparisonRow, ComparisonStatus } from '../types/extension';

// Helper: Normalize string for comparison
function cleanStr(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Autonomous Dynamic Heuristic Miner (Fallback if offline / mock)
function generateDynamicFallbackAudit(slots: (ProductSlot | null)[]): DynamicComparisonResult {
  const activeSlots = slots.filter((s): s is ProductSlot => s !== null);
  const slot1 = slots[0];

  // 1. Infer Category Dynamically from product titles
  const allTitles = activeSlots.map(s => s.title.toLowerCase()).join(' ');
  let detectedCategory = 'Produto Geral & Variados';
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

  // 3. Build Cross Comparison Matrix with Slot 1 as benchmark
  const comparisonMatrix: DynamicComparisonRow[] = [];

  uniqueAttributes.forEach((displayLabel, normKey) => {
    // Value in Slot 1
    const s1Val = slot1?.specs ? findMatchingValue(slot1.specs, normKey) : null;
    const slot_1_value = s1Val || 'Não informado';

    const comparisons: Record<string, { value: string; status: ComparisonStatus }> = {};

    // Compare Slot 2 to 5 against Slot 1
    for (let i = 1; i < 5; i++) {
      const slotNum = i + 1;
      const slotObj = slots[i];
      const slotKeyName = `slot_${slotNum}`;

      if (!slotObj) continue;

      const rawVal = findMatchingValue(slotObj.specs, normKey);
      if (!rawVal) {
        comparisons[slotKeyName] = {
          value: 'Não informado',
          status: 'missing',
        };
      } else {
        const isIdentical =
          slot_1_value !== 'Não informado' &&
          cleanStr(slot_1_value) === cleanStr(rawVal);

        comparisons[slotKeyName] = {
          value: rawVal,
          status: isIdentical ? 'equal' : 'divergent',
        };
      }
    }

    comparisonMatrix.push({
      attribute_name: displayLabel,
      slot_1_value,
      comparisons,
    });
  });

  // 4. Executive Summary
  let minPriceSlot = activeSlots[0];
  let minTotal = Infinity;
  activeSlots.forEach(s => {
    const tot = (s.price || 0) + (s.shipping || 0);
    if (tot < minTotal) {
      minTotal = tot;
      minPriceSlot = s;
    }
  });

  const executiveSummary = `O Slot ${minPriceSlot?.id} (${minPriceSlot?.platform}) apresenta o menor desembolso total com excelente pacote de atributos. Os demais slots possuem divergências pontuais que devem ser confrontadas com a base do Slot 1.`;

  return {
    detected_category: detectedCategory,
    comparison_matrix: comparisonMatrix,
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
export async function performAIAudit(slots: (ProductSlot | null)[]): Promise<DynamicComparisonResult> {
  try {
    const res = await fetch('/api/ai-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slots }),
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
  return generateDynamicFallbackAudit(slots);
}
