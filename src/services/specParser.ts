import { ProductInput, SpecItem, SpecStatus, FinancialComparison, ExecutiveVerdict, AuditResult } from '../types/audit';

// Canonical specification dictionary for grouping & normalization
interface CanonicalSpec {
  canonicalKey: string;
  label: string;
  category: string;
  synonyms: string[];
  unitType?: 'number_higher_better' | 'number_lower_better' | 'version_higher_better' | 'boolean' | 'text';
}

const CANONICAL_SPECS: CanonicalSpec[] = [
  // Conectividade
  {
    canonicalKey: 'bluetooth',
    label: 'Versão do Bluetooth',
    category: 'Conectividade',
    synonyms: ['bluetooth', 'versão bluetooth', 'conexão bluetooth', 'bt version', 'bt'],
    unitType: 'version_higher_better',
  },
  {
    canonicalKey: 'wifi',
    label: 'Wi-Fi / Redes',
    category: 'Conectividade',
    synonyms: ['wi-fi', 'wifi', 'rede sem fio', 'wireless'],
    unitType: 'text',
  },
  {
    canonicalKey: 'gps',
    label: 'GPS & Posicionamento',
    category: 'Conectividade',
    synonyms: ['gps', 'localização', 'gnss', 'sistema de posicionamento', 'geolocalização'],
    unitType: 'boolean',
  },
  {
    canonicalKey: 'ports',
    label: 'Portas & Entradas',
    category: 'Conectividade',
    synonyms: ['portas', 'entradas', 'saídas', 'portas de saída', 'portas de entrada', 'interface', 'conector', 'conector de carregamento', 'entrada de carga'],
    unitType: 'text',
  },
  {
    canonicalKey: 'latency',
    label: 'Latência de Áudio/Vídeo',
    category: 'Conectividade',
    synonyms: ['latência', 'delay', 'baixa latência', 'modo game'],
    unitType: 'number_lower_better',
  },

  // Áudio & Microfone
  {
    canonicalKey: 'anc',
    label: 'Cancelamento de Ruído (ANC)',
    category: 'Áudio & Microfone',
    synonyms: ['cancelamento de ruído', 'cancelamento ativo de ruído', 'anc', 'active noise cancelling', 'redução de ruído'],
    unitType: 'boolean',
  },
  {
    canonicalKey: 'transparency',
    label: 'Modo Transparência / Ambiente',
    category: 'Áudio & Microfone',
    synonyms: ['modo transparência', 'modo ambiente', 'transparency mode', 'som ambiente'],
    unitType: 'boolean',
  },
  {
    canonicalKey: 'driver',
    label: 'Drivers de Áudio',
    category: 'Áudio & Microfone',
    synonyms: ['driver', 'drivers', 'alto-falante', 'tamanho do driver', 'driver de áudio', 'driver de som', 'diafragma'],
    unitType: 'number_higher_better',
  },
  {
    canonicalKey: 'mic',
    label: 'Microfones & ENC',
    category: 'Áudio & Microfone',
    synonyms: ['microfone', 'microfones', 'enc', 'microfones com cancelamento', 'chamadas'],
    unitType: 'text',
  },
  {
    canonicalKey: 'codecs',
    label: 'Codecs de Áudio',
    category: 'Áudio & Microfone',
    synonyms: ['codec', 'codecs', 'suporte a codecs', 'aac/sbc', 'ldac', 'aptx'],
    unitType: 'text',
  },

  // Bateria & Energia
  {
    canonicalKey: 'battery_capacity',
    label: 'Capacidade da Bateria',
    category: 'Bateria & Energia',
    synonyms: ['capacidade', 'capacidade nominal', 'bateria', 'capacidade da bateria', 'mah', 'bateria do fone', 'bateria do relógio'],
    unitType: 'number_higher_better',
  },
  {
    canonicalKey: 'case_battery',
    label: 'Bateria do Estojo / Case',
    category: 'Bateria & Energia',
    synonyms: ['estojo', 'case', 'capacidade do estojo', 'bateria da case', 'bateria do estojo de carregamento'],
    unitType: 'number_higher_better',
  },
  {
    canonicalKey: 'autonomy_single',
    label: 'Autonomia por Carga (Uso Único)',
    category: 'Bateria & Energia',
    synonyms: ['autonomia', 'duração da bateria', 'autonomia de reprodução', 'tempo de uso', 'tempo de reprodução', 'duração', 'autonomia típica'],
    unitType: 'number_higher_better',
  },
  {
    canonicalKey: 'autonomy_total',
    label: 'Autonomia Total com Estojo / Standby',
    category: 'Bateria & Energia',
    synonyms: ['autonomia total', 'tempo total com estojo', 'autonomia com estojo', 'duração total', 'standby', 'autonomia da bateria'],
    unitType: 'number_higher_better',
  },
  {
    canonicalKey: 'power_output',
    label: 'Potência de Saída / Carregamento',
    category: 'Bateria & Energia',
    synonyms: ['potência', 'potência máxima', 'potência de saída', 'potência total', 'watts', 'saída de energia', 'saída usb-c', 'w max'],
    unitType: 'number_higher_better',
  },
  {
    canonicalKey: 'fast_charging_protocols',
    label: 'Protocolos de Carga Rápida',
    category: 'Bateria & Energia',
    synonyms: ['protocolos suportados', 'protocolos de carregamento', 'protocolos', 'fast charge', 'power delivery', 'quick charge', 'pd', 'qc'],
    unitType: 'text',
  },
  {
    canonicalKey: 'recharge_time',
    label: 'Tempo de Recarga do Dispositivo',
    category: 'Bateria & Energia',
    synonyms: ['tempo de recarga', 'tempo para recarregar', 'tempo de carga', 'recarga'],
    unitType: 'number_lower_better',
  },

  // Display & Visual
  {
    canonicalKey: 'display_type',
    label: 'Tipo de Tela & Resolução',
    category: 'Display & Visual',
    synonyms: ['tela', 'tipo de tela', 'display', 'painel', 'display lcd', 'tela amoled', 'resolução'],
    unitType: 'text',
  },
  {
    canonicalKey: 'display_brightness',
    label: 'Brilho & Always-on Display',
    category: 'Display & Visual',
    synonyms: ['brilho', 'brilho da tela', 'nits', 'always-on display', 'aod'],
    unitType: 'text',
  },

  // Construção & Resistência
  {
    canonicalKey: 'water_resistance',
    label: 'Resistência à Água & Poeira',
    category: 'Construção & Proteção',
    synonyms: ['resistência à água', 'proteção contra água', 'certificação ip', 'ipx', 'ip67', 'ip68', 'ipx4', 'ipx5', '10 atm', 'à prova d água'],
    unitType: 'text',
  },
  {
    canonicalKey: 'material',
    label: 'Material de Construção',
    category: 'Construção & Proteção',
    synonyms: ['material', 'material do corpo', 'construção', 'acabamento', 'estrutura'],
    unitType: 'text',
  },
  {
    canonicalKey: 'weight',
    label: 'Peso do Produto',
    category: 'Construção & Proteção',
    synonyms: ['peso', 'peso do fone', 'peso do produto', 'peso de cada fone', 'peso total'],
    unitType: 'number_lower_better',
  },
  {
    canonicalKey: 'dimensions',
    label: 'Dimensões / Tamanho',
    category: 'Construção & Proteção',
    synonyms: ['dimensões', 'tamanho', 'medidas'],
    unitType: 'text',
  },

  // Recursos & Sistema
  {
    canonicalKey: 'app_support',
    label: 'Aplicativo Dedicado & Equalizador',
    category: 'Recursos & Software',
    synonyms: ['aplicativo', 'app dedicado', 'suporte a app', 'aplicativo dedicado', 'app', 'software'],
    unitType: 'boolean',
  },
  {
    canonicalKey: 'controls',
    label: 'Controles & Sensores',
    category: 'Recursos & Software',
    synonyms: ['controle por toque', 'botão de controle', 'controles', 'touch', 'sensores de saúde', 'modos esportivos'],
    unitType: 'text',
  },
  {
    canonicalKey: 'compatibility',
    label: 'Compatibilidade de Sistemas',
    category: 'Recursos & Software',
    synonyms: ['compatibilidade', 'sistemas compatíveis', 'suporte a notebook', 'compatível com'],
    unitType: 'text',
  },
  {
    canonicalKey: 'warranty',
    label: 'Garantia do Produto',
    category: 'Garantia & Suporte',
    synonyms: ['garantia', 'garantia do fabricante', 'garantia oficial', 'tempo de garantia', 'garantia do vendedor'],
    unitType: 'number_higher_better',
  },
];

// Helper: Normalize string for comparison
function cleanString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper: Extract key-value lines from pasted text
function extractRawKeyValues(rawText: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!rawText || !rawText.trim()) return map;

  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  for (const line of lines) {
    // Remove leading bullet marks: -, *, •, ·, >, numbers like "1.", etc.
    let cleanLine = line.replace(/^[\s\-*•·>#~]+/, '').trim();
    cleanLine = cleanLine.replace(/^\d+[\.\)]\s*/, '').trim();

    if (!cleanLine) continue;

    // Check for delimiter like :, -, =
    const colonIdx = cleanLine.indexOf(':');
    const hyphenIdx = cleanLine.indexOf(' - ');
    const eqIdx = cleanLine.indexOf('=');

    let key = '';
    let val = '';

    if (colonIdx > 1 && colonIdx < 50) {
      key = cleanLine.substring(0, colonIdx).trim();
      val = cleanLine.substring(colonIdx + 1).trim();
    } else if (hyphenIdx > 1 && hyphenIdx < 50) {
      key = cleanLine.substring(0, hyphenIdx).trim();
      val = cleanLine.substring(hyphenIdx + 3).trim();
    } else if (eqIdx > 1 && eqIdx < 50) {
      key = cleanLine.substring(0, eqIdx).trim();
      val = cleanLine.substring(eqIdx + 1).trim();
    } else {
      // Fallback: If line contains a known keyword, try to extract
      const matchedCanonical = CANONICAL_SPECS.find(c =>
        c.synonyms.some(syn => cleanLine.toLowerCase().includes(syn))
      );
      if (matchedCanonical) {
        key = matchedCanonical.label;
        val = cleanLine;
      }
    }

    if (key && val) {
      // Normalize key
      const cleanK = key.replace(/^[\(\[\{]/, '').replace(/[\)\]\}]$/, '').trim();
      if (cleanK.length >= 2 && val.length >= 1) {
        map.set(cleanK, val);
      }
    }
  }

  return map;
}

// Find matching canonical spec for a given key string
function findCanonicalSpec(key: string): CanonicalSpec | undefined {
  const cleaned = cleanString(key);
  return CANONICAL_SPECS.find(c =>
    c.synonyms.some(syn => {
      const cleanSyn = cleanString(syn);
      return cleaned.includes(cleanSyn) || cleanSyn.includes(cleaned);
    })
  );
}

// Helper: Extract numeric value for scoring/comparing
function extractNumber(val: string): number | null {
  if (!val) return null;
  // Match numbers with possible decimals like 22.5, 10.000, 500, 5.3
  const match = val.replace(/\./g, '').match(/(\d+(?:[\.,]\d+)?)/);
  if (!match) return null;
  return parseFloat(match[1].replace(',', '.'));
}

// Helper: Determine spec status & winner
function compareValues(
  val1: string,
  val2: string,
  canonical?: CanonicalSpec
): { status: SpecStatus; diffNote?: string; winner?: 'p1' | 'p2' | 'tie' | 'neutral' } {
  const has1 = Boolean(val1 && val1.trim());
  const has2 = Boolean(val2 && val2.trim());

  if (!has1 && !has2) return { status: 'both_missing', winner: 'neutral' };
  if (has1 && !has2) return { status: 'missing_2', diffNote: 'Dado ausente no Produto 2', winner: 'p1' };
  if (!has1 && has2) return { status: 'missing_1', diffNote: 'Dado ausente no Produto 1', winner: 'p2' };

  const c1 = cleanString(val1);
  const c2 = cleanString(val2);

  if (c1 === c2) {
    return { status: 'identical', diffNote: 'Valores equivalentes', winner: 'tie' };
  }

  // Check booleans (Sim vs Não)
  const isYes1 = /\b(sim|possui|suporta|incluso|ativo|true|yes|com)\b/i.test(val1);
  const isNo1 = /\b(nao|sem|nao possui|nao suporta|false|no)\b/i.test(val1);
  const isYes2 = /\b(sim|possui|suporta|incluso|ativo|true|yes|com)\b/i.test(val2);
  const isNo2 = /\b(nao|sem|nao possui|nao suporta|false|no)\b/i.test(val2);

  if ((isYes1 && isNo2) || (isNo1 && isYes2)) {
    const winner = isYes1 ? 'p1' : 'p2';
    return {
      status: 'divergent',
      diffNote: isYes1 ? 'Vantagem: Presente apenas no Produto 1' : 'Vantagem: Presente apenas no Produto 2',
      winner,
    };
  }

  // Check numeric comparisons based on unitType
  const n1 = extractNumber(val1);
  const n2 = extractNumber(val2);

  if (n1 !== null && n2 !== null && n1 !== n2 && canonical?.unitType) {
    if (canonical.unitType === 'number_higher_better' || canonical.unitType === 'version_higher_better') {
      const winner = n1 > n2 ? 'p1' : 'p2';
      const diff = Math.abs(n1 - n2);
      return {
        status: 'divergent',
        diffNote: n1 > n2 ? `Produto 1 superior (+${diff})` : `Produto 2 superior (+${diff})`,
        winner,
      };
    } else if (canonical.unitType === 'number_lower_better') {
      const winner = n1 < n2 ? 'p1' : 'p2';
      const diff = Math.abs(n1 - n2);
      return {
        status: 'divergent',
        diffNote: n1 < n2 ? `Produto 1 melhor (-${diff})` : `Produto 2 melhor (-${diff})`,
        winner,
      };
    }
  }

  return {
    status: 'divergent',
    diffNote: 'Diferença técnica identificada',
    winner: 'neutral',
  };
}

// Generate Financial Audit
export function calculateFinancials(p1: ProductInput, p2: ProductInput): FinancialComparison {
  const p1Base = parseFloat(p1.price.replace(',', '.')) || 0;
  const p1Ship = parseFloat(p1.shipping.replace(',', '.')) || 0;
  const p1Total = p1Base + p1Ship;

  const p2Base = parseFloat(p2.price.replace(',', '.')) || 0;
  const p2Ship = parseFloat(p2.shipping.replace(',', '.')) || 0;
  const p2Total = p2Base + p2Ship;

  const diffNominal = Math.abs(p1Total - p2Total);
  const baseForPercent = Math.max(p1Total, p2Total) || 1;
  const diffPercent = Math.round((diffNominal / baseForPercent) * 100);

  let cheaperSlot: 'p1' | 'p2' | 'equal' = 'equal';
  let summaryText = 'Os dois produtos têm o mesmo custo total na porta.';

  if (p1Total < p2Total) {
    cheaperSlot = 'p1';
    summaryText = `O Produto 1 é R$ ${diffNominal.toFixed(2).replace('.', ',')} (${diffPercent}%) mais barato no valor final.`;
  } else if (p2Total < p1Total) {
    cheaperSlot = 'p2';
    summaryText = `O Produto 2 é R$ ${diffNominal.toFixed(2).replace('.', ',')} (${diffPercent}%) mais barato no valor final.`;
  }

  return {
    p1Base,
    p1Ship,
    p1Total,
    p2Base,
    p2Ship,
    p2Total,
    diffNominal,
    diffPercent,
    cheaperSlot,
    summaryText,
  };
}

// Master Audit Engine
export function auditProducts(p1: ProductInput, p2: ProductInput): AuditResult {
  const map1 = extractRawKeyValues(p1.rawText);
  const map2 = extractRawKeyValues(p2.rawText);

  // Group by canonical specs or custom discovered keys
  const specItems: SpecItem[] = [];
  const processedCanonicalKeys = new Set<string>();
  const processedRawKeys1 = new Set<string>();
  const processedRawKeys2 = new Set<string>();

  // 1. Process Canonical Specs present in either product
  for (const canonical of CANONICAL_SPECS) {
    let foundKey1: string | undefined;
    let foundVal1 = '';
    let foundKey2: string | undefined;
    let foundVal2 = '';

    for (const [k1, v1] of map1.entries()) {
      if (canonical.synonyms.some(syn => cleanString(k1).includes(cleanString(syn)))) {
        foundKey1 = k1;
        foundVal1 = v1;
        processedRawKeys1.add(k1);
        break;
      }
    }

    for (const [k2, v2] of map2.entries()) {
      if (canonical.synonyms.some(syn => cleanString(k2).includes(cleanString(syn)))) {
        foundKey2 = k2;
        foundVal2 = v2;
        processedRawKeys2.add(k2);
        break;
      }
    }

    if (foundKey1 || foundKey2) {
      processedCanonicalKeys.add(canonical.canonicalKey);
      const comparison = compareValues(foundVal1, foundVal2, canonical);

      specItems.push({
        id: `spec-${canonical.canonicalKey}`,
        category: canonical.category,
        key: canonical.canonicalKey,
        label: canonical.label,
        val1: foundVal1 || 'Não informado',
        val2: foundVal2 || 'Não informado',
        status: comparison.status,
        diffNote: comparison.diffNote,
        winner: comparison.winner,
      });
    }
  }

  // 2. Process remaining unprocessed keys from Product 1
  for (const [k1, v1] of map1.entries()) {
    if (processedRawKeys1.has(k1)) continue;

    // Check if Product 2 has exact or similar key
    let matchingKey2: string | undefined;
    let val2 = '';

    for (const [k2, v2] of map2.entries()) {
      if (!processedRawKeys2.has(k2) && cleanString(k1) === cleanString(k2)) {
        matchingKey2 = k2;
        val2 = v2;
        processedRawKeys2.add(k2);
        break;
      }
    }

    const comparison = compareValues(v1, val2);
    specItems.push({
      id: `custom-1-${cleanString(k1)}`,
      category: 'Especificações Gerais',
      key: cleanString(k1),
      label: k1,
      val1: v1,
      val2: val2 || 'Não informado',
      status: comparison.status,
      diffNote: comparison.diffNote,
      winner: comparison.winner,
      isCustom: true,
    });
  }

  // 3. Process remaining unprocessed keys from Product 2
  for (const [k2, v2] of map2.entries()) {
    if (processedRawKeys2.has(k2)) continue;

    const comparison = compareValues('', v2);
    specItems.push({
      id: `custom-2-${cleanString(k2)}`,
      category: 'Especificações Gerais',
      key: cleanString(k2),
      label: k2,
      val1: 'Não informado',
      val2: v2,
      status: comparison.status,
      diffNote: comparison.diffNote,
      winner: comparison.winner,
      isCustom: true,
    });
  }

  // Financials
  const financial = calculateFinancials(p1, p2);

  // Calculate Statistics
  let identicalCount = 0;
  let divergentCount = 0;
  let missingCount = 0;
  let p1Wins = 0;
  let p2Wins = 0;

  const strengthsP1: string[] = [];
  const strengthsP2: string[] = [];

  for (const item of specItems) {
    if (item.status === 'identical') identicalCount++;
    else if (item.status === 'divergent') divergentCount++;
    else missingCount++;

    if (item.winner === 'p1' && item.val1 !== 'Não informado') {
      p1Wins++;
      strengthsP1.push(`${item.label}: ${item.val1} (vs ${item.val2 !== 'Não informado' ? item.val2 : 'Ausente no P2'})`);
    } else if (item.winner === 'p2' && item.val2 !== 'Não informado') {
      p2Wins++;
      strengthsP2.push(`${item.label}: ${item.val2} (vs ${item.val1 !== 'Não informado' ? item.val1 : 'Ausente no P1'})`);
    }
  }

  // Build Executive Verdict
  const p1Name = p1.name.trim() || 'Produto 1';
  const p2Name = p2.name.trim() || 'Produto 2';

  let verdictTitle = '';
  let costBenefitVerdict = '';
  let recommendation: 'p1' | 'p2' | 'situational' | 'tie' = 'situational';

  if (p1Wins > p2Wins && financial.cheaperSlot === 'p1') {
    recommendation = 'p1';
    verdictTitle = `Vitória Clara do Produto 1: Mais barato e tecnicamente superior`;
    costBenefitVerdict = `O ${p1Name} entrega especificações técnicas superiores (${p1Wins} vantagens comprovadas) custando R$ ${financial.diffNominal.toFixed(2).replace('.', ',')} a menos que o ${p2Name}. É a escolha definitiva de compra com 100% de vantagem no custo-benefício.`;
  } else if (p2Wins > p1Wins && financial.cheaperSlot === 'p2') {
    recommendation = 'p2';
    verdictTitle = `Vitória Clara do Produto 2: Mais barato e tecnicamente superior`;
    costBenefitVerdict = `O ${p2Name} supera o ${p1Name} em ${p2Wins} atributos técnicos essenciais com um valor total R$ ${financial.diffNominal.toFixed(2).replace('.', ',')} menor. Não há motivo técnico ou financeiro para escolher a outra opção.`;
  } else if (p1Wins > p2Wins && financial.cheaperSlot === 'p2') {
    recommendation = 'p1';
    verdictTitle = `Upgrade Técnico Justificado no Produto 1`;
    costBenefitVerdict = `O ${p1Name} custa R$ ${financial.diffNominal.toFixed(2).replace('.', ',')} (${financial.diffPercent}%) a mais, porém compensa o valor extra entregando ${p1Wins} recursos superiores cruciais (como ${strengthsP1.slice(0, 2).map(s => s.split(':')[0]).join(' e ')}). Vale o investimento adicional se você busca durabilidade e performance.`;
  } else if (p2Wins > p1Wins && financial.cheaperSlot === 'p1') {
    recommendation = 'p2';
    verdictTitle = `Upgrade Técnico Justificado no Produto 2`;
    costBenefitVerdict = `O ${p2Name} custa R$ ${financial.diffNominal.toFixed(2).replace('.', ',')} (${financial.diffPercent}%) a mais, mas justifica plenamente a diferença com recursos técnicos superiores (${strengthsP2.slice(0, 2).map(s => s.split(':')[0]).join(' e ')}). Para quem precisa de melhor desempenho, o acréscimo compensa.`;
  } else if (financial.cheaperSlot === 'p1') {
    recommendation = 'p1';
    verdictTitle = `Equilíbrio Técnico com Vantagem de Preço para o Produto 1`;
    costBenefitVerdict = `Com fichas técnicas muito semelhantes (${identicalCount} itens equivalentes), o ${p1Name} se consagra a compra mais racional por custar R$ ${financial.diffNominal.toFixed(2).replace('.', ',')} a menos na porta de entrega.`;
  } else if (financial.cheaperSlot === 'p2') {
    recommendation = 'p2';
    verdictTitle = `Equilíbrio Técnico com Vantagem de Preço para o Produto 2`;
    costBenefitVerdict = `Com especificações niveladas, o ${p2Name} é a melhor opção em economia direta, poupando R$ ${financial.diffNominal.toFixed(2).replace('.', ',')} (${financial.diffPercent}%) no checkout.`;
  } else {
    recommendation = 'tie';
    verdictTitle = `Empate Técnico e Financeiro`;
    costBenefitVerdict = `Ambos os produtos entregam proposta de valor e preços idênticos. A decisão final deve ser pautada na reputação da loja ou velocidade de entrega da plataforma.`;
  }

  // Default strengths if none discovered by rules
  if (strengthsP1.length === 0) {
    strengthsP1.push(financial.cheaperSlot === 'p1' ? 'Menor preço total desembolsado' : 'Ficha técnica pronta para uso');
  }
  if (strengthsP2.length === 0) {
    strengthsP2.push(financial.cheaperSlot === 'p2' ? 'Menor preço total desembolsado' : 'Ficha técnica pronta para uso');
  }

  return {
    product1: {
      name: p1Name,
      platform: p1.platform,
      totalPrice: financial.p1Total,
    },
    product2: {
      name: p2Name,
      platform: p2.platform,
      totalPrice: financial.p2Total,
    },
    financial,
    specs: specItems,
    verdict: {
      strengthsP1,
      strengthsP2,
      verdictTitle,
      costBenefitVerdict,
      recommendation,
      targetAudienceP1: `Ideal para quem prioriza: ${financial.cheaperSlot === 'p1' ? 'economia máxima' : 'especificações avançadas'}`,
      targetAudienceP2: `Ideal para quem prioriza: ${financial.cheaperSlot === 'p2' ? 'economia máxima' : 'especificações avançadas'}`,
    },
    generatedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    stats: {
      totalSpecs: specItems.length,
      identicalCount,
      divergentCount,
      missingCount,
    },
  };
}
