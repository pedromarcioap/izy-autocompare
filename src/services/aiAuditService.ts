import {
  ProductSlot,
  DynamicComparisonResult,
  DynamicComparisonRow,
  SpecsMatrixRow,
  ComparisonStatus,
  PairwiseComparison,
  SlotComparisonItem,
  SpecAIInterpretation,
  SlotScore,
} from '../types/extension';

// Helper: Normalize string for comparison (strips accents, punctuation and repeated spaces)
export function cleanStr(s: string): string {
  return (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Dicionário canônico universal multi-categoria
export const SYNONYM_MAP: Record<string, string> = {
  // --- AUTOPEÇAS & VEÍCULOS ---
  'compatibilidade de veiculos': 'Compatibilidade / Veículos',
  'veiculos compativeis': 'Compatibilidade / Veículos',
  'modelos compativeis': 'Compatibilidade / Veículos',
  'compatibilidade': 'Compatibilidade / Veículos',
  'aplicacao': 'Compatibilidade / Veículos',
  'aplicacoes': 'Compatibilidade / Veículos',
  'veiculo': 'Compatibilidade / Veículos',
  'modelo': 'Compatibilidade / Veículos',
  'montadora': 'Montadora / Fabricante do Veículo',
  'montadora compativel': 'Montadora / Fabricante do Veículo',
  'marca do veiculo': 'Montadora / Fabricante do Veículo',
  'codigo oem': 'Código da Peça / OEM',
  'oem': 'Código da Peça / OEM',
  'part number': 'Código da Peça / OEM',
  'codigo da peca': 'Código da Peça / OEM',
  'cod original': 'Código da Peça / OEM',
  'codigo original': 'Código da Peça / OEM',
  'numero de peca': 'Código da Peça / OEM',
  'numero da peca': 'Código da Peça / OEM',
  'referencia oem': 'Código da Peça / OEM',
  'posicao': 'Posição / Lado de Montagem',
  'lado': 'Posição / Lado de Montagem',
  'posicao lado': 'Posição / Lado de Montagem',
  'lado de montagem': 'Posição / Lado de Montagem',
  'posicao de montagem': 'Posição / Lado de Montagem',
  'eixo': 'Posição / Lado de Montagem',
  'ano': 'Ano / Compatibilidade',
  'anos': 'Ano / Compatibilidade',
  'anos compativeis': 'Ano / Compatibilidade',
  'ano modelo': 'Ano / Compatibilidade',
  'ano de fabricacao': 'Ano / Compatibilidade',
  'tipo de peca': 'Tipo de Peça / Aplicação',
  'sistema de freio': 'Sistema de Freio / Aplicação',
  'material da pastilha': 'Material de Fricção / Composição',
  'material de friccao': 'Material de Fricção / Composição',
  'composicao da peca': 'Material / Composição',

  // --- PAPELARIA & ARTIGOS DE ARTE ---
  'gramatura': 'Gramatura / Espessura',
  'gramatura do papel': 'Gramatura / Espessura',
  'densidade do papel': 'Gramatura / Espessura',
  'espessura do papel': 'Gramatura / Espessura',
  'gsm': 'Gramatura / Espessura',
  'folhas': 'Quantidade de Folhas / Páginas',
  'paginas': 'Quantidade de Folhas / Páginas',
  'quantidade de folhas': 'Quantidade de Folhas / Páginas',
  'numero de folhas': 'Quantidade de Folhas / Páginas',
  'qtd de folhas': 'Quantidade de Folhas / Páginas',
  'qtd folhas': 'Quantidade de Folhas / Páginas',
  'numero de paginas': 'Quantidade de Folhas / Páginas',
  'total de paginas': 'Quantidade de Folhas / Páginas',
  'formato': 'Dimensões / Formato',
  'tamanho do papel': 'Dimensões / Formato',
  'tipo de encadernacao': 'Tipo de Capa / Encadernação',
  'encadernacao': 'Tipo de Capa / Encadernação',
  'capa': 'Tipo de Capa / Encadernação',
  'tipo de capa': 'Tipo de Capa / Encadernação',
  'composicao do papel': 'Composição / Fibra',
  'tipo de papel': 'Composição / Fibra',
  'fibra': 'Composição / Fibra',
  'textura': 'Textura / Grão do Papel',
  'grao': 'Textura / Grão do Papel',
  'textura do papel': 'Textura / Grão do Papel',
  'indicacao de uso': 'Indicação de Uso / Técnica',
  'tecnica recomendada': 'Indicação de Uso / Técnica',

  // --- FERRAMENTAS & MÁQUINAS ---
  'torque maximo': 'Torque Máximo',
  'forca de aperto': 'Torque Máximo',
  'torque': 'Torque Máximo',
  'tipo de motor': 'Tipo de Motor',
  'motor': 'Tipo de Motor',
  'tamanho do mandril': 'Mandril / Encaixe',
  'mandril': 'Mandril / Encaixe',
  'encaixe': 'Mandril / Encaixe',
  'velocidade sem carga': 'Velocidade / Rotação (RPM)',
  'rotacao': 'Velocidade / Rotação (RPM)',
  'velocidade': 'Velocidade / Rotação (RPM)',
  'rpm': 'Velocidade / Rotação (RPM)',
  'tensao da bateria': 'Tensão / Voltagem',
  'voltagem': 'Tensão / Voltagem',
  'tensao': 'Tensão / Voltagem',
  'capacidade da bateria': 'Capacidade da Bateria',
  'bateria': 'Capacidade da Bateria',
  'funcao impacto': 'Função de Impacto',
  'funcao de impacto': 'Função de Impacto',
  'impacto': 'Função de Impacto',
  'iluminacao led': 'Iluminação LED',
  'luz led': 'Iluminação LED',

  // --- ELETRÔNICOS, INFORMÁTICA & ÁUDIO ---
  'versao bluetooth': 'Versão do Bluetooth',
  'conexao bluetooth': 'Versão do Bluetooth',
  'bluetooth': 'Versão do Bluetooth',
  'cancelamento de ruido': 'Cancelamento de Ruído (ANC)',
  'cancelamento ativo': 'Cancelamento de Ruído (ANC)',
  'anc': 'Cancelamento de Ruído (ANC)',
  'autonomia de bateria': 'Autonomia de Reprodução',
  'autonomia': 'Autonomia de Reprodução',
  'drivers de som': 'Driver de Áudio',
  'driver': 'Driver de Áudio',
  'microfones': 'Microfones e Chamadas',
  'microfone': 'Microfones e Chamadas',
  'resistencia a agua': 'Resistência à Água / Proteção',
  'protecao contra agua': 'Resistência à Água / Proteção',
  'armazenamento': 'Armazenamento / Capacidade',
  'memoria interna': 'Armazenamento / Capacidade',
  'memoria ram': 'Memória RAM',
  'ram': 'Memória RAM',
  'processador': 'Processador / Chipset',
  'resolucao': 'Resolução / Tela',

  // --- VESTUÁRIO & TÊXTIL ---
  'composicao do tecido': 'Composição do Tecido',
  'gramatura do tecido': 'Gramatura do Tecido',
  'tipo de gola': 'Tipo de Gola',
  'gola': 'Tipo de Gola',
  'modelagem caimento': 'Modelagem / Caimento',
  'modelagem': 'Modelagem / Caimento',
  'origem do algodao': 'Origem da Matéria-Prima',

  // --- COSMÉTICOS & SKINCARE ---
  'principio ativo': 'Princípio Ativo',
  'volume liquido': 'Volume Líquido / Peso',
  'conteudo': 'Volume Líquido / Peso',
  'volume': 'Volume Líquido / Peso',
  'tipo de pele indicado': 'Tipo de Pele Indicado',
  'tipo de pele': 'Tipo de Pele Indicado',
  'beneficio principal': 'Ação e Benefício Principal',
  'acao': 'Ação e Benefício Principal',
  'fator de protecao': 'Fator de Proteção Solar (FPS)',
  'fps': 'Fator de Proteção Solar (FPS)',

  // --- UNIVERSAL / GERAL ---
  'marca': 'Marca / Fabricante',
  'fabricante': 'Marca / Fabricante',
  'dimensoes': 'Dimensões / Formato',
  'tamanho': 'Dimensões / Formato',
  'medidas': 'Dimensões / Formato',
  'material': 'Material / Composição',
  'composicao': 'Material / Composição',
  'cor': 'Cor / Acabamento',
  'cores': 'Cor / Acabamento',
  'peso': 'Peso',
  'peso liquido': 'Peso',
  'itens inclusos': 'Conteúdo da Embalagem / Acessórios',
  'acessorios inclusos': 'Conteúdo da Embalagem / Acessórios',
  'acessorios': 'Conteúdo da Embalagem / Acessórios',
  'conteudo da embalagem': 'Conteúdo da Embalagem / Acessórios',
  'garantia': 'Garantia',
  'prazo de garantia': 'Garantia',
  'garantia do fabricante': 'Garantia',
  'origem': 'Origem / Procedência',
  'procedencia': 'Origem / Procedência',
  'condicao': 'Condição do Produto',
  'estado': 'Condição do Produto',
  'certificacao': 'Certificação / Homologação',
};

// Determina a categoria temática da especificação
export function categorizeAttribute(attrName: string): string {
  const clean = cleanStr(attrName);
  if (/compatibilidade|veiculo|modelo|ano|montadora|aplicacao|oem|part number/i.test(clean)) {
    return 'Compatibilidade & Aplicação';
  }
  if (/torque|motor|potencia|velocidade|rpm|impacto|driver|processador|memoria|ram|fps/i.test(clean)) {
    return 'Desempenho & Potência';
  }
  if (/bateria|voltagem|tensao|autonomia|recarga|alimentacao|carregamento/i.test(clean)) {
    return 'Alimentação & Bateria';
  }
  if (/material|composicao|gramatura|resistencia|protecao|textura|dimensoes|formato|peso|tela|display|gola|tecido/i.test(clean)) {
    return 'Construção & Proteção';
  }
  if (/itens inclusos|acessorios|conteudo|folhas|mandril|maleta|case|estojo|embalagem/i.test(clean)) {
    return 'Acessórios & Conteúdo';
  }
  if (/garantia|marca|fabricante|origem|certificacao|procedencia|condicao/i.test(clean)) {
    return 'Garantia & Procedência';
  }
  return 'Especificações Gerais';
}

export function canonicalizeAttributeName(rawKey: string): string {
  if (!rawKey) return '';
  const trimmed = rawKey.trim();
  const cleanKey = cleanStr(trimmed);
  if (SYNONYM_MAP[cleanKey]) {
    return SYNONYM_MAP[cleanKey];
  }
  return trimmed
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// Regexes otimizadas para mineração heurística
const KV_LINE_REGEX = /^[\s*•#-]?\s*([^:：]{2,35})[:：]\s*(.{2,120})$/;
const AUTOMAKER_REGEX = /\b(Volkswagen|VW|Chevrolet|GM|Fiat|Ford|Toyota|Honda|Hyundai|Renault|Nissan|Jeep|Peugeot|Citro[eë]n|Mitsubishi|BMW|Mercedes(?:-Benz)?|Audi)\b/i;
const CAR_MODEL_REGEX = /\b(Gol|Voyage|Saveiro|Fox|Parati|CrossFox|Polo|Golf|Virtus|Nivus|T-Cross|Corsa|Celta|Onix|Prisma|Astra|Vectra|Montana|Spin|Tracker|Palio|Uno|Siena|Strada|Mobi|Argo|Cronos|Toro|Punto|Ka|Fiesta|EcoSport|Focus|Ranger|Civic|Fit|City|HR-V|CR-V|Corolla|Yaris|Hilux|Etios|HB20|Creta|Sandero|Logan|Duster|Kicks|March|Renegade|Compass)(\s*G[1-8])?\b/i;
const YEAR_REGEX = /\b(?:(?:19|20)\d{2}\s*(?:a|ate|-|\/)\s*(?:19|20)\d{2}|(?:19|20)\d{2}\+|anos?\s*(?:19|20)\d{2}(?:\s*a\s*(?:19|20)\d{2})?)\b/i;
const POS_REGEX = /\b(par dianteiro|par traseiro|dianteir[oa]|traseir[oa]|diant\b|tras\b|esquerd[oa]|direit[oa]|superior|inferior|traseiro\/dianteiro)\b/i;
const OEM_REGEX = /\b(?:OEM|c[oó]d(?:igo)?(?:\s*(?:original|pe[cç]a))?|part\s*number)[:\s]*([A-Z0-9.-]{5,18})\b/i;
const GSM_REGEX = /(\d{2,4})\s*(gsm|g\/m²|g\/m2|g\b|gr\b)/i;
const SHEETS_REGEX = /(\d{1,4})\s*(?:folhas|fls|pages|p[aá]ginas|pags|sheets)\b/i;
const TORQUE_REGEX = /(\d{1,3})\s*(?:nm|n\.m|newton(?:\s*metros)?)\b/i;
const VOLTAGE_REGEX = /\b(\d{1,2}(?:\.\d)?)\s*(?:v|volts|v\s*max)\b/i;
const BRUSHLESS_REGEX = /\b(brushless|sem\s*escovas?|motor\s*de\s*inducao)\b/i;

function extractStructuredSpecs(slotSpecs: Record<string, string>, specs: Record<string, string>): void {
  for (const [k, v] of Object.entries(slotSpecs)) {
    if (k && typeof v === 'string' && v.trim().length > 0) {
      specs[canonicalizeAttributeName(k)] = v.trim();
    }
  }
}

function extractKeyValueLines(textSource: string, specs: Record<string, string>): void {
  const lines = textSource.split('\n');
  for (const line of lines) {
    const match = KV_LINE_REGEX.exec(line);
    if (match) {
      const rawK = match[1].trim();
      const rawV = match[2].trim();
      if (!/^(https?|www|http|image|html|slot|preco|frete|link)/i.test(rawK)) {
        const canonical = canonicalizeAttributeName(rawK);
        if (!specs[canonical]) specs[canonical] = rawV;
      }
    }
  }
}

function extractAutomotiveSpecs(fullText: string, specs: Record<string, string>): void {
  const automakerMatch = AUTOMAKER_REGEX.exec(fullText);
  if (automakerMatch && !specs['Montadora / Fabricante do Veículo']) {
    specs['Montadora / Fabricante do Veículo'] = automakerMatch[0].toUpperCase() === 'VW' ? 'Volkswagen (VW)' : automakerMatch[0];
  }

  const carModelMatch = CAR_MODEL_REGEX.exec(fullText);
  if (carModelMatch && !specs['Compatibilidade / Veículos']) {
    specs['Compatibilidade / Veículos'] = carModelMatch[0];
  }

  const yearMatch = YEAR_REGEX.exec(fullText);
  if (yearMatch && !specs['Ano / Compatibilidade']) {
    specs['Ano / Compatibilidade'] = yearMatch[0];
  }

  const posMatch = POS_REGEX.exec(fullText);
  if (posMatch && !specs['Posição / Lado de Montagem']) {
    const rawPos = posMatch[0].toLowerCase();
    let normPos = posMatch[0];
    if (rawPos.includes('diant')) normPos = 'Dianteira / Dianteiro';
    else if (rawPos.includes('tras')) normPos = 'Traseira / Traseiro';
    specs['Posição / Lado de Montagem'] = normPos;
  }

  const oemMatch = OEM_REGEX.exec(fullText);
  if (oemMatch && !specs['Código da Peça / OEM']) {
    specs['Código da Peça / OEM'] = oemMatch[1];
  }
}

function extractStationeryAndToolsSpecs(fullText: string, specs: Record<string, string>): void {
  const gsmMatch = GSM_REGEX.exec(fullText);
  if (gsmMatch && !specs['Gramatura / Espessura']) {
    specs['Gramatura / Espessura'] = `${gsmMatch[1]} g/m²`;
  }

  const sheetsMatch = SHEETS_REGEX.exec(fullText);
  if (sheetsMatch && !specs['Quantidade de Folhas / Páginas']) {
    specs['Quantidade de Folhas / Páginas'] = `${sheetsMatch[1]} folhas`;
  }

  const torqueMatch = TORQUE_REGEX.exec(fullText);
  if (torqueMatch && !specs['Torque Máximo']) {
    specs['Torque Máximo'] = `${torqueMatch[1]} Nm`;
  }

  const voltageMatch = VOLTAGE_REGEX.exec(fullText);
  if (voltageMatch && !specs['Tensão / Voltagem']) {
    specs['Tensão / Voltagem'] = `${voltageMatch[1]}V`;
  }

  const brushlessMatch = BRUSHLESS_REGEX.exec(fullText);
  if (brushlessMatch && !specs['Tipo de Motor']) {
    specs['Tipo de Motor'] = 'Brushless (Sem Escovas de Carvão)';
  }
}

/**
 * Analisador Dinâmico e Agnóstico de Especificações
 * Minera especificações estruturadas e heurísticas dos produtos
 */
export function analyzeProductSpecs(slot: ProductSlot): Record<string, string> {
  const specs: Record<string, string> = {};
  if (!slot) return specs;

  if (slot.specs && typeof slot.specs === 'object') {
    extractStructuredSpecs(slot.specs, specs);
  }

  const textSource = [slot.raw_specs, slot.rawText].filter(Boolean).join('\n');
  if (textSource) {
    extractKeyValueLines(textSource, specs);
  }

  const fullText = `${slot.title || ''} ${textSource}`.trim();
  extractAutomotiveSpecs(fullText, specs);
  extractStationeryAndToolsSpecs(fullText, specs);

  return specs;
}

function compareWarranty(
  cleanB: string,
  cleanT: string
): { status: ComparisonStatus; statusLabel: string; diffNote: string; isAdvantage: boolean } | null {
  const matchB = /\d+/.exec(cleanB);
  const matchT = /\d+/.exec(cleanT);
  const numB = Number.parseInt(matchB?.[0] || '0', 10);
  const numT = Number.parseInt(matchT?.[0] || '0', 10);
  const isYearB = cleanB.includes('ano') || cleanB.includes('anos') || cleanB.includes('12');
  const isYearT = cleanT.includes('ano') || cleanT.includes('anos') || cleanT.includes('12');
  const monthsB = isYearB && numB < 10 ? numB * 12 : numB;
  const monthsT = isYearT && numT < 10 ? numT * 12 : numT;

  if (monthsT > monthsB) {
    return {
      status: 'superior',
      statusLabel: `Superior (+${monthsT - monthsB} meses)`,
      diffNote: `${monthsT} meses vs ${monthsB} meses do Slot Base`,
      isAdvantage: true,
    };
  }
  if (monthsT < monthsB) {
    return {
      status: 'inferior',
      statusLabel: `Inferior (-${monthsB - monthsT} meses)`,
      diffNote: `Menor garantia (${monthsT} meses vs ${monthsB} meses)`,
      isAdvantage: false,
    };
  }
  return null;
}

function comparePosition(
  cleanB: string,
  cleanT: string
): { status: ComparisonStatus; statusLabel: string; diffNote: string; isAdvantage: boolean } | null {
  const isFrontB = cleanB.includes('diant');
  const isRearB = cleanB.includes('tras');
  const isFrontT = cleanT.includes('diant');
  const isRearT = cleanT.includes('tras');

  if ((isFrontB && isRearT) || (isRearB && isFrontT)) {
    return {
      status: 'divergent',
      statusLabel: '⚠️ Posição Incompatível',
      diffNote: 'Alerta crítico: Um é dianteiro e o outro é traseiro!',
      isAdvantage: false,
    };
  }
  return null;
}

function compareMaterialsAndEngines(
  cleanB: string,
  cleanT: string
): { status: ComparisonStatus; statusLabel: string; diffNote: string; isAdvantage: boolean } | null {
  if (cleanT.includes('ceramica') && !cleanB.includes('ceramica')) {
    return {
      status: 'superior',
      statusLabel: 'Superior (Cerâmica)',
      diffNote: 'Cerâmica: menor ruído, menos pó e maior durabilidade',
      isAdvantage: true,
    };
  }
  if (!cleanT.includes('ceramica') && cleanB.includes('ceramica')) {
    return {
      status: 'inferior',
      statusLabel: 'Inferior vs Cerâmica',
      diffNote: 'Composto não cerâmico tem maior desgaste',
      isAdvantage: false,
    };
  }

  if (cleanT.includes('brushless') && !cleanB.includes('brushless')) {
    return {
      status: 'superior',
      statusLabel: 'Superior (Brushless)',
      diffNote: 'Motor sem escovas: +50% vida útil e menor aquecimento',
      isAdvantage: true,
    };
  }
  if (!cleanT.includes('brushless') && cleanB.includes('brushless')) {
    return {
      status: 'inferior',
      statusLabel: 'Inferior (Com escovas)',
      diffNote: 'Motor convencional com desgaste de carvão',
      isAdvantage: false,
    };
  }

  return null;
}

function compareNumericValues(
  baseVal: string,
  targetVal: string
): { status: ComparisonStatus; statusLabel: string; diffNote: string; isAdvantage: boolean } | null {
  const numB = Number.parseFloat(baseVal.replace(/[^\d.,]/g, '').replace(',', '.'));
  const numT = Number.parseFloat(targetVal.replace(/[^\d.,]/g, '').replace(',', '.'));

  if (!Number.isNaN(numB) && !Number.isNaN(numT) && numB > 0 && numT > 0) {
    if (numT > numB) {
      const pct = Math.round(((numT - numB) / numB) * 100);
      return {
        status: 'superior',
        statusLabel: `Superior (+${pct}%)`,
        diffNote: `Valor superior (${targetVal} vs ${baseVal})`,
        isAdvantage: true,
      };
    }
    if (numT < numB) {
      const pct = Math.round(((numB - numT) / numB) * 100);
      return {
        status: 'inferior',
        statusLabel: `Inferior (-${pct}%)`,
        diffNote: `Valor inferior (${targetVal} vs ${baseVal})`,
        isAdvantage: false,
      };
    }
  }
  return null;
}

/**
 * Função de Confronto Semântico e Inter-relação Linha a Linha (Fallback Inteligente)
 */
export function evaluateSpecRelationship(
  attributeName: string,
  baseVal: string,
  targetVal: string,
  slotBaseId: number,
  targetSlotId: number
): {
  status: ComparisonStatus;
  statusLabel: string;
  diffNote: string;
  isAdvantage: boolean;
} {
  if (!targetVal || targetVal === 'Não informado' || targetVal === '—') {
    return {
      status: 'missing',
      statusLabel: 'Não informado',
      diffNote: 'Atributo omitido pelo vendedor',
      isAdvantage: false,
    };
  }

  if (targetSlotId === slotBaseId) {
    return {
      status: 'base',
      statusLabel: '★ Base Referência',
      diffNote: 'Parâmetro de confronto ativo',
      isAdvantage: false,
    };
  }

  if (!baseVal || baseVal === 'Não informado' || baseVal === '—') {
    return {
      status: 'superior',
      statusLabel: 'Superior (+)',
      diffNote: 'Informado no anúncio (omitido no Slot Base)',
      isAdvantage: true,
    };
  }

  const cleanB = cleanStr(baseVal);
  const cleanT = cleanStr(targetVal);

  if (cleanB === cleanT) {
    return {
      status: 'equal',
      statusLabel: 'Idêntico',
      diffNote: 'Especificação tecnicamente equivalente',
      isAdvantage: false,
    };
  }

  if (attributeName.includes('Garantia')) {
    const warrantyRes = compareWarranty(cleanB, cleanT);
    if (warrantyRes) return warrantyRes;
  }

  if (attributeName.includes('Posição') || attributeName.includes('Lado')) {
    const posRes = comparePosition(cleanB, cleanT);
    if (posRes) return posRes;
  }

  const matRes = compareMaterialsAndEngines(cleanB, cleanT);
  if (matRes) return matRes;

  const numRes = compareNumericValues(baseVal, targetVal);
  if (numRes) return numRes;

  return {
    status: 'divergent',
    statusLabel: 'Divergente',
    diffNote: `Especificação divergente (${targetVal} vs ${baseVal})`,
    isAdvantage: false,
  };
}

function interpretIdentical(attrName: string, firstVal: string): SpecAIInterpretation {
  return {
    summary: `Todos os produtos comparados compartilham exatamente a mesma especificação de ${attrName.toLowerCase()} (${firstVal}).`,
    winner_slot: null,
    practical_impact: 'Nenhuma diferença prática de desempenho ou compatibilidade neste atributo.',
    severity: 'low',
  };
}

function interpretAutomotiveOrPos(cleanVals: { id: number; clean: string }[]): SpecAIInterpretation {
  const hasFront = cleanVals.some(v => v.clean.includes('diant'));
  const hasRear = cleanVals.some(v => v.clean.includes('tras'));
  if (hasFront && hasRear) {
    return {
      summary: 'Atenção crítica: há incompatibilidade na posição de montagem entre os anúncios selecionados.',
      winner_slot: null,
      practical_impact: 'Verifique se seu veículo necessita de reposição dianteira ou traseira antes de fechar a compra para evitar devolução.',
      severity: 'high',
    };
  }
  return {
    summary: 'Os anúncios possuem descrições de aplicação específicas para os modelos e linhas automotivas atendidas.',
    winner_slot: null,
    practical_impact: 'Confirme o código do chassi ou modelo antes da instalação.',
    severity: 'high',
  };
}

function interpretWarranty(vals: { id: number; val: string }[]): SpecAIInterpretation {
  let maxG = 0;
  let winner_slot: number | null = null;
  vals.forEach(v => {
    const match = /\d+/.exec(v.val);
    const g = Number.parseInt(match?.[0] || '0', 10);
    if (g > maxG) {
      maxG = g;
      winner_slot = v.id;
    }
  });

  const summary = winner_slot
    ? `O Slot ${winner_slot} oferece a maior cobertura de garantia de fábrica, garantindo maior proteção pós-venda.`
    : 'Divergência nos prazos de garantia informados pelos lojistas.';

  return {
    summary,
    winner_slot,
    practical_impact: 'Garantias mais longas protegem o investimento contra defeitos ocultos de fabricação.',
    severity: 'high',
  };
}

function interpretMaterials(vals: { id: number; val: string }[]): SpecAIInterpretation {
  const ceramic = vals.find(v => cleanStr(v.val).includes('ceramica'));
  if (ceramic) {
    return {
      summary: `O Slot ${ceramic.id} utiliza composto de Cerâmica, superior em durabilidade e ausência de fuligem em relação aos compostos convencionais.`,
      winner_slot: ceramic.id,
      practical_impact: 'Frenagens mais limpas e silenciosas com vida útil prolongada.',
      severity: 'high',
    };
  }
  return {
    summary: 'Variação de materiais e compostos utilizados na fabricação dos produtos.',
    winner_slot: null,
    practical_impact: 'Impacta diretamente na durabilidade e resistência ao desgaste contínuo.',
    severity: 'high',
  };
}

function interpretNumericAttr(
  attrName: string,
  slotValues: Record<string, string>,
  vals: { id: number; val: string }[]
): SpecAIInterpretation {
  let maxNum = 0;
  let winner_slot: number | null = null;
  vals.forEach(v => {
    const n = Number.parseFloat(v.val.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (n > maxNum) {
      maxNum = n;
      winner_slot = v.id;
    }
  });

  if (winner_slot) {
    const winnerVal = slotValues[`slot_${winner_slot}`];
    return {
      summary: `O Slot ${winner_slot} se destaca com a maior entrega técnica em ${attrName.toLowerCase()} (${winnerVal}).`,
      winner_slot,
      practical_impact: 'Oferece maior força e autonomia para trabalhos pesados sem sobrecarregar o motor.',
      severity: 'high',
    };
  }
  return {
    summary: 'Diferenças na capacidade e potência entregue entre os modelos.',
    winner_slot: null,
    practical_impact: 'Define o rendimento e tempo de trabalho contínuo.',
    severity: 'high',
  };
}

/**
 * Gera interpretação de IA para uma linha de especificação
 */
function generateSpecAIInterpretation(
  attrName: string,
  _category: string,
  slotValues: Record<string, string>,
  activeSlots: ProductSlot[],
  _baseSlotId: number
): SpecAIInterpretation {
  const vals = activeSlots.map(s => ({
    id: s.id,
    val: slotValues[`slot_${s.id}`] || 'Não informado',
  }));

  const cleanVals = vals.map(v => ({ id: v.id, clean: cleanStr(v.val) }));
  const uniqueVals = Array.from(new Set(cleanVals.map(v => v.clean).filter(Boolean)));

  if (uniqueVals.length <= 1) {
    return interpretIdentical(attrName, vals[0]?.val || 'Não informado');
  }
  if (attrName.includes('Posição') || attrName.includes('Compatibilidade')) {
    return interpretAutomotiveOrPos(cleanVals);
  }
  if (attrName.includes('Garantia')) {
    return interpretWarranty(vals);
  }
  if (attrName.includes('Material') || attrName.includes('Composição')) {
    return interpretMaterials(vals);
  }
  if (attrName.includes('Torque') || attrName.includes('Bateria') || attrName.includes('Potência')) {
    return interpretNumericAttr(attrName, slotValues, vals);
  }

  return {
    summary: `Comparação detalhada de ${attrName.toLowerCase()} entre os ${activeSlots.length} produtos.`,
    winner_slot: null,
    practical_impact: 'Variações estéticas ou de formato que dependem da preferência de uso.',
    severity: 'low',
  };
}

/**
 * Construtor Completo de Auditoria Dinâmica (Fallback Inteligente Local)
 */
export function generateDynamicFallbackAudit(
  slots: (ProductSlot | null)[],
  baseSlotId = 1
): DynamicComparisonResult {
  const activeSlots = slots.filter((s): s is ProductSlot => s !== null);
  if (activeSlots.length === 0) {
    return {
      detected_category: 'Nenhum Produto Selecionado',
      base_slot_id: baseSlotId,
      comparison_matrix: [],
      specs_matrix: [],
      technical_verdict: 'Adicione pelo menos 2 produtos aos slots para iniciar o confronto técnico de especificações.',
      executive_summary: '',
      scores_by_slot: [],
    };
  }

  const effectiveBaseId = activeSlots.some(s => s.id === baseSlotId)
    ? baseSlotId
    : activeSlots[0].id;

  // 1. Minera especificações de todos os slots
  const extractedBySlot: Record<number, Record<string, string>> = {};
  const allCanonicalKeys = new Set<string>();

  activeSlots.forEach(s => {
    const sp = analyzeProductSpecs(s);
    extractedBySlot[s.id] = sp;
    Object.keys(sp).forEach(k => allCanonicalKeys.add(k));
  });

  // Determina Categoria Global
  let detectedCategory = 'Produto Geral';
  const joinedTitles = activeSlots.map(s => s.title).join(' ').toLowerCase();
  if (/pastilha|freio|amortecedor|oem|gol|voyage|fox|civic|corolla|vela|filtro/i.test(joinedTitles)) {
    detectedCategory = '🚗 Veículos & Autopeças';
  } else if (/parafusadeira|furadeira|impacto|mandril|torque|brushless|dewalt|makita|bosch/i.test(joinedTitles)) {
    detectedCategory = '⚡ Ferramentas Elétricas & Máquinas';
  } else if (/sketchbook|canson|a4|a5|gramatura|folhas|papel|hahnemuhle/i.test(joinedTitles)) {
    detectedCategory = '📄 Papelaria & Artigos de Arte';
  } else if (/fone|bluetooth|anc|headphone|earbud|audio|tws/i.test(joinedTitles)) {
    detectedCategory = '🎧 Áudio & Eletrônicos';
  }

  // 2. Constrói Matriz de Comparação de Especificações
  const comparisonMatrix: DynamicComparisonRow[] = [];
  const specs_matrix: SpecsMatrixRow[] = [];

  const topAdvantages: { slot_id: number; title: string; detail: string }[] = [];
  const criticalWarnings: { title: string; detail: string; affected_slots: number[] }[] = [];
  const convergences: string[] = [];

  const advantageCountBySlot: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const drawCountBySlot: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const disadvantageCountBySlot: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const missingCountBySlot: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  Array.from(allCanonicalKeys).forEach((attrName, idx) => {
    const category = categorizeAttribute(attrName);
    const baseVal = extractedBySlot[effectiveBaseId]?.[attrName] || 'Não informado';

    const slot_values: Record<string, string> = {};
    const comparisons: Record<string, SlotComparisonItem> = {};

    for (let i = 1; i <= 5; i++) {
      const hasSlot = activeSlots.some(s => s.id === i);
      if (hasSlot) {
        const val = extractedBySlot[i]?.[attrName] || 'Não informado';
        slot_values[`slot_${i}`] = val;

        const evalResult = evaluateSpecRelationship(attrName, baseVal, val, effectiveBaseId, i);
        comparisons[`slot_${i}`] = {
          value: val,
          status: evalResult.status,
          statusLabel: evalResult.statusLabel,
          diffNote: evalResult.diffNote,
          isAdvantage: evalResult.isAdvantage,
        };

        if (evalResult.status === 'superior' || evalResult.isAdvantage) advantageCountBySlot[i]++;
        else if (evalResult.status === 'equal' || evalResult.status === 'base') drawCountBySlot[i]++;
        else if (evalResult.status === 'inferior' || evalResult.status === 'divergent') disadvantageCountBySlot[i]++;
        else if (evalResult.status === 'missing') missingCountBySlot[i]++;
      }
    }

    const aiInterpretation = generateSpecAIInterpretation(
      attrName,
      category,
      slot_values,
      activeSlots,
      effectiveBaseId
    );

    if (aiInterpretation.winner_slot && advantageCountBySlot[aiInterpretation.winner_slot] !== undefined) {
      const winnerVal = slot_values[`slot_${aiInterpretation.winner_slot}`];
      topAdvantages.push({
        slot_id: aiInterpretation.winner_slot,
        title: `${attrName}: ${winnerVal}`,
        detail: aiInterpretation.summary,
      });
    }

    if (aiInterpretation.severity === 'high' && aiInterpretation.summary.includes('incompatibilidade')) {
      criticalWarnings.push({
        title: `Divergência Crítica em ${attrName}`,
        detail: aiInterpretation.practical_impact || 'Verifique a aplicação do produto antes da compra.',
        affected_slots: activeSlots.map(s => s.id),
      });
    }

    if (aiInterpretation.summary.includes('compartilham exatamente')) {
      convergences.push(`${attrName}: ${baseVal}`);
    }

    const row: DynamicComparisonRow = {
      id: `spec-${idx}`,
      category,
      attribute_name: attrName,
      slot_1_value: slot_values.slot_1 || 'Não informado',
      slot_values,
      comparisons,
      ai_interpretation: aiInterpretation,
    };

    comparisonMatrix.push(row);

    // Compatibilidade com specs_matrix clássico
    const matrixRow: SpecsMatrixRow = {
      category,
      attribute: attrName,
      slot_1: slot_values.slot_1 || 'Não informado',
      slot_2: slot_values.slot_2,
      slot_3: slot_values.slot_3,
      slot_4: slot_values.slot_4,
      slot_5: slot_values.slot_5,
      ai_insight: aiInterpretation.summary,
      winner: aiInterpretation.winner_slot ? `Slot ${aiInterpretation.winner_slot}` : undefined,
    };
    specs_matrix.push(matrixRow);
  });

  // Ordena matriz por categoria temática
  comparisonMatrix.sort((a, b) => (a.category || '').localeCompare(b.category || ''));

  // 3. Monta Pairwise (1 vs 1)
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
        const valA = row.slot_values[`slot_${slotA.id}`] || 'Não informado';
        const valB = row.slot_values[`slot_${slotB.id}`] || 'Não informado';

        const hasA = valA !== 'Não informado' && valA !== '—';
        const hasB = valB !== 'Não informado' && valB !== '—';

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

  // 4. Veredito Técnico e Scores
  const scores_by_slot: SlotScore[] = activeSlots.map(s => ({
    slot_id: s.id,
    advantages_count: advantageCountBySlot[s.id] || 0,
    draws_count: drawCountBySlot[s.id] || 0,
    disadvantages_count: disadvantageCountBySlot[s.id] || 0,
    missing_count: missingCountBySlot[s.id] || 0,
  }));

  const technicalVerdict = generateTechnicalVerdict(
    activeSlots,
    effectiveBaseId,
    comparisonMatrix,
    detectedCategory
  );

  return {
    detected_category: detectedCategory,
    base_slot_id: effectiveBaseId,
    comparison_matrix: comparisonMatrix,
    specs_matrix,
    technical_verdict: technicalVerdict,
    executive_summary: technicalVerdict,
    key_findings: {
      top_advantages: topAdvantages.slice(0, 4),
      critical_warnings: criticalWarnings.slice(0, 3),
      convergences: convergences.slice(0, 4),
    },
    scores_by_slot,
    pairwise_matrix,
  };
}

function generateTechnicalVerdict(
  activeSlots: ProductSlot[],
  baseSlotId: number,
  matrix: DynamicComparisonRow[],
  category: string
): string {
  const baseSlot = activeSlots.find(s => s.id === baseSlotId) || activeSlots[0];
  let minTotal = Infinity;
  let minSlot = activeSlots[0];

  activeSlots.forEach(s => {
    const tot = (s.price || 0) + (s.shipping || 0);
    if (tot < minTotal) {
      minTotal = tot;
      minSlot = s;
    }
  });

  const baseTotal = (baseSlot.price || 0) + (baseSlot.shipping || 0);
  const diff = Math.abs(baseTotal - minTotal);
  const pct = baseTotal > 0 ? Math.round((diff / baseTotal) * 100) : 0;
  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const compromises: string[] = [];
  matrix.forEach(row => {
    const comp = row.comparisons[`slot_${minSlot.id}`];
    if (comp?.status === 'inferior' || comp?.status === 'divergent') {
      compromises.push(`${row.attribute_name} (${comp.diffNote || comp.value})`);
    }
  });

  if (minSlot.id === baseSlot.id) {
    return `O Slot ${baseSlot.id} é a melhor escolha técnica e financeira (${formatBRL(minTotal)}), entregando especificações sólidas e completas para ${category} sem abrir mão de qualidade ou compatibilidade.`;
  }

  if (compromises.length > 0) {
    return `O Slot ${minSlot.id} é o mais barato (${formatBRL(minTotal)}, economia de ${formatBRL(diff)} / -${pct}%), mas exige concessões técnicas em relação ao Slot ${baseSlot.id}: ${compromises.slice(0, 2).join('; ')}. Se durabilidade e compatibilidade forem prioridade, o Slot ${baseSlot.id} oferece melhor custo-benefício real.`;
  }

  return `O Slot ${minSlot.id} entrega excelente custo-benefício (${formatBRL(minTotal)}), proporcionando uma economia real de ${formatBRL(diff)} (-${pct}%) com especificações equivalentes ao Slot Base ${baseSlot.id}.`;
}

const STATUS_LABEL_MAP: Record<ComparisonStatus, string> = {
  base: '★ Base',
  equal: 'Idêntico',
  superior: 'Superior (+)',
  inferior: 'Inferior (-)',
  divergent: 'Divergente',
  missing: 'Não informado',
};

function getStatusLabel(status: ComparisonStatus): string {
  return STATUS_LABEL_MAP[status] || 'Divergente';
}

function convertFlatSpecsMatrixToComparisonMatrix(
  specsMatrix: any[],
  baseSlotId: number
): DynamicComparisonRow[] {
  return specsMatrix.map((row: any, idx: number) => {
    const attrName = row.attribute || row.attribute_name || 'Especificação';
    const cat = row.category || categorizeAttribute(attrName);
    const s1Val = row.slot_1 || row.slot_1_value || 'Não informado';
    const baseVal = row[`slot_${baseSlotId}`] || s1Val;

    const slot_values: Record<string, string> = {
      slot_1: s1Val,
      slot_2: row.slot_2 || 'Não informado',
      slot_3: row.slot_3 || 'Não informado',
      slot_4: row.slot_4 || 'Não informado',
      slot_5: row.slot_5 || 'Não informado',
    };

    const comparisons: Record<string, SlotComparisonItem> = {};
    for (let i = 1; i <= 5; i++) {
      const sKey = `slot_${i}`;
      const rawStr = row[sKey] || 'Não informado';
      const cleanVal = rawStr.replace(/\s*\([^)]*\)/g, '').trim();

      let status: ComparisonStatus = 'divergent';
      if (i === baseSlotId) {
        status = 'base';
      } else if (/não informad|nao informad/i.test(rawStr)) {
        status = 'missing';
      } else if (/idêntico|identico|equal/i.test(rawStr) || cleanStr(cleanVal) === cleanStr(baseVal)) {
        status = 'equal';
      } else if (/superior|\(\+\)/i.test(rawStr)) {
        status = 'superior';
      } else if (/inferior|\(-\)/i.test(rawStr)) {
        status = 'inferior';
      }

      comparisons[sKey] = {
        value: cleanVal || rawStr,
        status,
        statusLabel: getStatusLabel(status),
        diffNote: rawStr,
      };
    }

    const winnerMatch = row.winner ? Number.parseInt(row.winner.replace(/\D/g, ''), 10) : null;
    const aiInterpretation: SpecAIInterpretation = {
      summary: row.ai_insight || `Análise de ${attrName} entre os slots avaliados.`,
      winner_slot: Number.isNaN(winnerMatch) ? null : winnerMatch,
      practical_impact: 'Impacto direto no uso e rendimento do produto.',
      severity: 'medium',
    };

    return {
      id: `spec-${idx}`,
      category: cat,
      attribute_name: attrName,
      slot_1_value: s1Val,
      slot_values,
      comparisons,
      ai_interpretation: aiInterpretation,
    };
  });
}

/**
 * Chamada Principal do Serviço (Tenta Backend Gemini IA ou realiza Fallback Dinâmico com IA Heurística)
 */
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

        // Se o Gemini retornou a matriz estruturada completa
        if (d.comparison_matrix && Array.isArray(d.comparison_matrix)) {
          return {
            detected_category: category,
            base_slot_id: baseSlotId,
            comparison_matrix: d.comparison_matrix,
            specs_matrix: d.specs_matrix || [],
            technical_verdict: technicalVerdict,
            executive_summary: technicalVerdict,
            key_findings: d.key_findings || { top_advantages: [], critical_warnings: [], convergences: [] },
            scores_by_slot: d.scores_by_slot || [],
            pairwise_matrix: d.pairwise_matrix,
          };
        }

        // Se retornou formato plano (specs_matrix simples), enriquece para DynamicComparisonRow[]
        if (d.specs_matrix && Array.isArray(d.specs_matrix)) {
          const comparison_matrix = convertFlatSpecsMatrixToComparisonMatrix(d.specs_matrix, baseSlotId);

          return {
            detected_category: category,
            base_slot_id: baseSlotId,
            comparison_matrix,
            specs_matrix: d.specs_matrix,
            technical_verdict: technicalVerdict,
            executive_summary: technicalVerdict,
            key_findings: d.key_findings,
            scores_by_slot: d.scores_by_slot,
          };
        }
      }
    }
  } catch (err) {
    console.warn('Backend /api/ai-audit indisponível, utilizando motor heurístico de IA local:', err);
  }

  return generateDynamicFallbackAudit(slots, baseSlotId);
}
