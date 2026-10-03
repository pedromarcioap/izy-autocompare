import {
  ProductSlot,
  DynamicComparisonResult,
  DynamicComparisonRow,
  SpecsMatrixRow,
  ComparisonStatus,
  PairwiseComparison,
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
  'capacidade da bateria': 'Capacidade da Bateria',
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

export function canonicalizeAttributeName(rawKey: string): string {
  if (!rawKey) return '';
  const trimmed = rawKey.trim();
  const cleanKey = cleanStr(trimmed);
  if (SYNONYM_MAP[cleanKey]) {
    return SYNONYM_MAP[cleanKey];
  }
  return trimmed
    .replace(/[_\-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Analisador Dinâmico e Agnóstico de Especificações
 * Minera especificações estruturadas, descritivas e heurísticas para qualquer nicho
 */
export function analyzeProductSpecs(slot: ProductSlot): Record<string, string> {
  const specs: Record<string, string> = {};
  if (!slot) return specs;

  // 1. Incorpora especificações estruturadas
  if (slot.specs && typeof slot.specs === 'object') {
    for (const [k, v] of Object.entries(slot.specs)) {
      if (k && v && typeof v === 'string' && v.trim().length > 0) {
        specs[canonicalizeAttributeName(k)] = v.trim();
      }
    }
  }

  // 2. Minera linhas Chave: Valor do texto
  const textSource = [slot.raw_specs, slot.rawText].filter(Boolean).join('\n');
  if (textSource) {
    const lines = textSource.split('\n');
    for (const line of lines) {
      const match = line.match(/^[\s\-*•#]?\s*([^:：]{2,35})[:：]\s*(.{2,120})$/);
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

  // 3. Heurística Inteligente Universal (Autopeças, Papéis, Ferramentas, etc.)
  const fullText = `${slot.title || ''} ${textSource}`.trim();

  // --- AUTOPEÇAS & VEÍCULOS ---
  const automakerMatch = fullText.match(/\b(Volkswagen|VW|Chevrolet|GM|Fiat|Ford|Toyota|Honda|Hyundai|Renault|Nissan|Jeep|Peugeot|Citro[eë]n|Mitsubishi|BMW|Mercedes(?:-Benz)?|Audi)\b/i);
  if (automakerMatch && !specs['Montadora / Fabricante do Veículo']) {
    specs['Montadora / Fabricante do Veículo'] = automakerMatch[0].toUpperCase() === 'VW' ? 'Volkswagen (VW)' : automakerMatch[0];
  }

  const carModelMatch = fullText.match(/\b((?:Gol|Voyage|Saveiro|Fox|Parati|CrossFox|Polo|Golf|Virtus|Nivus|T-Cross)(?:\s*G[1-8])?|(?:Corsa|Celta|Onix|Prisma|Astra|Vectra|Montana|Spin|Tracker)|(?:Palio|Uno|Siena|Strada|Mobi|Argo|Cronos|Toro|Punto)|(?:Ka|Fiesta|EcoSport|Focus|Ranger)|(?:Civic|Fit|City|HR-V|CR-V)|(?:Corolla|Yaris|Hilux|Etios)|(?:HB20|Creta)|(?:Sandero|Logan|Duster|Kicks|March|Renegade|Compass))\b/i);
  if (carModelMatch && !specs['Compatibilidade / Veículos']) {
    specs['Compatibilidade / Veículos'] = carModelMatch[0];
  }

  const yearMatch = fullText.match(/\b((?:19\d\d|20\d\d)\s*(?:a|ate|-|\/)\s*(?:19\d\d|20\d\d)|\b(?:19\d\d|20\d\d)\+|\bano[s]?\s*(?:19\d\d|20\d\d)(?:\s*a\s*(?:19\d\d|20\d\d))?)\b/i);
  if (yearMatch && !specs['Ano / Compatibilidade']) {
    specs['Ano / Compatibilidade'] = yearMatch[0];
  }

  const posMatch = fullText.match(/\b(par dianteiro|par traseiro|dianteir[oa]|traseir[oa]|diant\b|tras\b|esquerd[oa]|direit[oa]|superior|inferior|traseiro\/dianteiro)\b/i);
  if (posMatch && !specs['Posição / Lado de Montagem']) {
    const rawPos = posMatch[0].toLowerCase();
    let normPos = posMatch[0];
    if (rawPos.includes('diant')) normPos = 'Dianteira / Dianteiro';
    else if (rawPos.includes('tras')) normPos = 'Traseira / Traseiro';
    specs['Posição / Lado de Montagem'] = normPos;
  }

  const oemMatch = fullText.match(/\b(?:OEM|c[oó]d(?:igo)?(?:\s*original|\s*pe[cç]a)?|part\s*number)[:\s]*([A-Z0-9.\-]{5,18})\b/i);
  if (oemMatch && !specs['Código da Peça / OEM']) {
    specs['Código da Peça / OEM'] = oemMatch[1];
  }

  const partsBrandMatch = fullText.match(/\b(Bosch|Cofap|Nakata|Fras-le|TRW|Cobreq|Mahle|Magneti Marelli|Valeo|NGK|Delphi|Denso|Monroe|Sachs|Hipper Freios|Willtec|Dayco|Gates|Continental|Contitech|SKF)\b/i);
  if (partsBrandMatch && !specs['Marca / Fabricante']) {
    specs['Marca / Fabricante'] = partsBrandMatch[0];
  }

  const partTypeMatch = fullText.match(/\b(pastilha(?:s)? de freio|disco(?:s)? de freio|amortecedor(?:es)?|vela(?:s)? de igni[cç][aã]o|filtro de [oó]leo|filtro de ar|filtro de combust[ií]vel|correia dentada|bomba d['’]?[aá]gua|bomba de combust[ií]vel|radiador|sensor de oxig[eê]nio|terminal de dire[cç][aã]o|piv[oô] de suspens[aã]o)\b/i);
  if (partTypeMatch && !specs['Tipo de Peça / Aplicação']) {
    specs['Tipo de Peça / Aplicação'] = partTypeMatch[0].charAt(0).toUpperCase() + partTypeMatch[0].slice(1).toLowerCase();
  }

  const partMatMatch = fullText.match(/\b(cer[aâ]mica|semi-met[aá]lica|org[aâ]nica|met[aá]lica|a[cç]o carbono|alum[ií]nio|ferro fundido)\b/i);
  if (partMatMatch && !specs['Material / Composição']) {
    specs['Material / Composição'] = partMatMatch[0].charAt(0).toUpperCase() + partMatMatch[0].slice(1).toLowerCase();
  }

  // --- PAPELARIA & LIVROS ---
  const gsmMatch = fullText.match(/(\d{2,4})\s*(gsm|g\/m²|g\/m2|g\b|gr\b)/i);
  if (gsmMatch && !specs['Gramatura / Espessura']) {
    specs['Gramatura / Espessura'] = `${gsmMatch[1]} g/m²`;
  }

  const sheetsMatch = fullText.match(/(\d{1,4})\s*(?:folhas|fls|pages|p[aá]ginas|pags|sheets)\b/i);
  if (sheetsMatch && !specs['Quantidade de Folhas / Páginas']) {
    specs['Quantidade de Folhas / Páginas'] = `${sheetsMatch[1]} folhas`;
  }

  const sizeMatch = fullText.match(/\b(A2|A3|A4|A5|A6|B4|B5|B6|\d+(?:[.,]\d+)?\s*x\s*\d+(?:[.,]\d+)?\s*(?:cm|mm|in|polegadas)?)\b/i);
  if (sizeMatch && !specs['Dimensões / Formato']) {
    specs['Dimensões / Formato'] = sizeMatch[0].toUpperCase();
  }

  const paperCompMatch = fullText.match(/(\d{1,3}%\s*(?:algod[aã]o|cotton|celulose|poli[eé]ster)|100%\s*celulose|papel\s*kraft|papel\s*couch[eê]|couro\s*(?:pu|leg[ií]timo)?)/i);
  if (paperCompMatch && !specs['Composição / Fibra'] && !specs['Material / Composição']) {
    specs['Composição / Fibra'] = paperCompMatch[0];
  }

  const coverMatch = fullText.match(/\b(hardcover|capa dura|softcover|capa comum|espiral|wire-o|costurado|brochura)\b/i);
  if (coverMatch && !specs['Tipo de Capa / Encadernação']) {
    specs['Tipo de Capa / Encadernação'] = coverMatch[0].toLowerCase().includes('hardcover') || coverMatch[0].toLowerCase().includes('capa dura')
      ? 'Capa Dura (Hardcover)'
      : coverMatch[0];
  }

  // --- FERRAMENTAS & ELETRÔNICOS ---
  const voltMatch = fullText.match(/(\b\d{1,3}V\b|bivolt|110V|220V)/i);
  if (voltMatch && !specs['Tensão / Voltagem']) {
    specs['Tensão / Voltagem'] = voltMatch[0].toUpperCase();
  }

  const torqueMatch = fullText.match(/(\d{1,3})\s*(?:nm|n\.m)/i);
  if (torqueMatch && !specs['Torque Máximo']) {
    specs['Torque Máximo'] = `${torqueMatch[1]} Nm`;
  }

  const btMatch = fullText.match(/(?:bluetooth|bt)\s*(\d+\.\d+)/i);
  if (btMatch && !specs['Versão do Bluetooth']) {
    specs['Versão do Bluetooth'] = `Bluetooth ${btMatch[1]}`;
  }

  const batMatch = fullText.match(/(\d+(?:\.\d+)?\s*(?:mAh|Ah))\b/i);
  if (batMatch && !specs['Capacidade da Bateria']) {
    specs['Capacidade da Bateria'] = batMatch[0];
  }

  const kitMatch = fullText.match(/\b(kit(?:\s*com)?\s*\d+\s*(?:pe[cç]as|unidades|un)?|jogo(?:\s*com)?\s*\d+\s*pe[cç]as|par\b|\d+\s*(?:pe[cç]as|unidades|un\b))/i);
  if (kitMatch && !specs['Conteúdo da Embalagem / Acessórios']) {
    specs['Conteúdo da Embalagem / Acessórios'] = kitMatch[0];
  }

  const warMatch = fullText.match(/(\d{1,2}\s*(?:meses|ano[s]?|dias)\s*(?:de\s*garantia)?)/i);
  if (warMatch && !specs['Garantia']) {
    specs['Garantia'] = warMatch[0];
  }

  return specs;
}

/**
 * Inferência Dinâmica de Categoria
 */
export function detectCategoryDynamically(activeSlots: ProductSlot[]): string {
  const combinedText = activeSlots
    .map(s => `${s.title} ${Object.keys(s.specs || {}).join(' ')} ${Object.values(s.specs || {}).join(' ')}`)
    .join(' ')
    .toLowerCase();

  if (/pastilha|disco de freio|amortecedor|autope[cç]a|automotivo|veiculo|motor|filtro de [oó]leo|vela de igni|correia|oem|suspensao|par dianteiro|par traseiro|gol g|corsa|civic|corolla|palio/i.test(combinedText)) {
    return 'Veículos & Autopeças';
  }
  if (/sketchbook|caderno|papel\b|folhas|a4|a5|a3|gramatura|gsm|aquarela|hardcover|encaderna|canson|tilibra|offset|desenho/i.test(combinedText)) {
    return 'Papelaria & Artigos de Arte';
  }
  if (/parafusadeira|furadeira|torque|mandril|rpm|impacto|brushless|esmerilhadeira|martelete|makita|dewalt|bosch ferramenta/i.test(combinedText)) {
    return 'Ferramentas Elétricas & Manuais';
  }
  if (/fone|bluetooth|tws|anc|fone de ouvido|headphone|earbuds|soundcore|caixa de som|audio/i.test(combinedText)) {
    return 'Áudio & Fones de Ouvido';
  }
  if (/placa de video|ssd|memoria ram|processador|ryzen|intel core|hardware|notebook|teclado mecanico|monitor/i.test(combinedText)) {
    return 'Informática & Hardware';
  }
  if (/serum|vitamina c|anti-idade|facial|pele|fps|protetor solar|hidratante|acido hialuronico|shampoo/i.test(combinedText)) {
    return 'Cosméticos & Cuidados Pessoais';
  }
  if (/camiseta|camisa|algodao|pima|linho|tecido|gola|calca|bermuda|vestuario|jaqueta/i.test(combinedText)) {
    return 'Vestuário & Moda Têxtil';
  }
  if (/air fryer|cafeteira|aspirador|ventilador|eletrodomestico|panela eletrica/i.test(combinedText)) {
    return 'Eletrodomésticos & Casa';
  }

  const words = combinedText
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4 && !/^(produto|shopee|aliexpress|frete|gratis|envio|pronta|entrega|original|novo)$/.test(w));

  const counts: Record<string, number> = {};
  words.forEach(w => { counts[w] = (counts[w] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0) {
    const top = sorted[0][0];
    return `Artigos Gerais (${top.charAt(0).toUpperCase() + top.slice(1)})`;
  }

  return 'Artigos Gerais & E-commerce';
}

/**
 * Comparador Semântico de Atributos
 */
function compareAttributeValues(
  baseVal: string | null,
  targetVal: string | null,
  attributeName: string
): { status: ComparisonStatus; cleanValue: string; badgeText: string; diffNote: string } {
  if (!targetVal || targetVal === 'Não informado' || targetVal === '—') {
    return {
      status: 'missing',
      cleanValue: 'Não informada',
      badgeText: 'Não informado',
      diffNote: 'Dado não informado pelo vendedor',
    };
  }

  if (!baseVal || baseVal === 'Não informado' || baseVal === '—') {
    return {
      status: 'divergent',
      cleanValue: targetVal,
      badgeText: 'Divergente',
      diffNote: 'Disponível apenas neste anúncio',
    };
  }

  const cleanB = cleanStr(baseVal);
  const cleanT = cleanStr(targetVal);

  if (cleanB === cleanT) {
    return {
      status: 'equal',
      cleanValue: targetVal,
      badgeText: 'Idêntico',
      diffNote: 'Especificação técnica equivalente',
    };
  }

  // Códigos OEM
  if (attributeName.includes('OEM') || attributeName.includes('Código')) {
    const oemB = cleanB.replace(/[^a-z0-9]/g, '');
    const oemT = cleanT.replace(/[^a-z0-9]/g, '');
    if (oemB && oemT && (oemB === oemT || oemB.includes(oemT) || oemT.includes(oemB))) {
      return {
        status: 'equal',
        cleanValue: targetVal,
        badgeText: 'Idêntico (OEM)',
        diffNote: 'Código OEM equivalente',
      };
    }
  }

  // Comparação de Posição / Lado de Peças Automotivas
  if (attributeName.includes('Posição') || attributeName.includes('Lado')) {
    const isFrontB = cleanB.includes('diant');
    const isFrontT = cleanT.includes('diant');
    const isRearB = cleanB.includes('tras');
    const isRearT = cleanT.includes('tras');

    if ((isFrontB && isFrontT) || (isRearB && isRearT)) {
      return {
        status: 'equal',
        cleanValue: targetVal,
        badgeText: 'Idêntico',
        diffNote: 'Mesma posição de montagem',
      };
    }

    if ((isFrontB && isRearT) || (isRearB && isFrontT)) {
      return {
        status: 'divergent',
        cleanValue: targetVal,
        badgeText: 'Alerta: Posição Incompatível',
        diffNote: 'Atenção: Um é Dianteiro e outro é Traseiro!',
      };
    }
  }

  // Comparação de Faixas de Anos
  if (attributeName.includes('Ano')) {
    const yearsB = (baseVal.match(/\b(19\d\d|20\d\d)\b/g) || []).map(Number);
    const yearsT = (targetVal.match(/\b(19\d\d|20\d\d)\b/g) || []).map(Number);
    if (yearsB.length > 0 && yearsT.length > 0) {
      const minB = Math.min(...yearsB);
      const maxB = Math.max(...yearsB);
      const minT = Math.min(...yearsT);
      const maxT = Math.max(...yearsT);

      if (minB === minT && maxB === maxT) {
        return {
          status: 'equal',
          cleanValue: targetVal,
          badgeText: 'Idêntico',
          diffNote: 'Mesma faixa de anos de compatibilidade',
        };
      }
      return {
        status: 'divergent',
        cleanValue: targetVal,
        badgeText: 'Divergente',
        diffNote: `Faixa de anos diferente (${targetVal} vs ${baseVal})`,
      };
    }
  }

  // Unidades e valores numéricos únicos (ex: 12V vs 12 Volts, 180 g/m² vs 180gsm)
  const allNumsB = baseVal.match(/\b(\d+(?:[.,]\d+)?)\b/g) || [];
  const allNumsT = targetVal.match(/\b(\d+(?:[.,]\d+)?)\b/g) || [];

  if (allNumsB.length === 1 && allNumsT.length === 1) {
    const valB = parseFloat(allNumsB[0].replace(',', '.'));
    const valT = parseFloat(allNumsT[0].replace(',', '.'));

    if (valB === valT && cleanB.replace(/[\d.,\s]/g, '') === cleanT.replace(/[\d.,\s]/g, '')) {
      return {
        status: 'equal',
        cleanValue: targetVal,
        badgeText: 'Idêntico',
        diffNote: 'Valor e unidade equivalentes',
      };
    }

    if (valT > valB) {
      return {
        status: 'divergent',
        cleanValue: targetVal,
        badgeText: 'Superior (+)',
        diffNote: `Superior ao Base (${targetVal} vs ${baseVal})`,
      };
    } else if (valT < valB) {
      return {
        status: 'divergent',
        cleanValue: targetVal,
        badgeText: 'Inferior (-)',
        diffNote: `Inferior ao Base (${targetVal} vs ${baseVal})`,
      };
    }
  }

  return {
    status: 'divergent',
    cleanValue: targetVal,
    badgeText: 'Divergente',
    diffNote: `Divergência técnica vs Base (${baseVal})`,
  };
}

/**
 * Construtor do Veredito Dinâmico e Contextual
 */
function generateDynamicVerdict(
  activeSlots: ProductSlot[],
  baseSlotId: number,
  specsMatrix: SpecsMatrixRow[],
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
  const priceDiff = Math.abs(baseTotal - minTotal);
  const priceDiffPct = baseTotal > 0 ? Math.round((priceDiff / baseTotal) * 100) : 0;

  const compromises: string[] = [];
  const missingData: string[] = [];

  specsMatrix.forEach(row => {
    const rawVal = row[`slot_${minSlot.id}`] || '';
    if (/não informad/i.test(rawVal)) {
      missingData.push(row.attribute);
    } else if (/inferior/i.test(rawVal) || /incompat[ií]vel/i.test(rawVal)) {
      compromises.push(`${row.attribute} (${rawVal})`);
    }
  });

  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  let verdict = '';
  if (minSlot.id === baseSlot.id) {
    verdict = `O Slot ${baseSlot.id} reúne o menor desembolso total (${formatBRL(minTotal)}) e serve como a melhor referência técnica para a categoria ${category}, sem concessões na qualidade ou compatibilidade.`;
  } else if (compromises.length > 0) {
    verdict = `O Slot ${minSlot.id} é a opção mais econômica (${formatBRL(minTotal)}, economia de ${formatBRL(priceDiff)} / -${priceDiffPct}%), mas apresenta reduções técnicas em relação ao Slot ${baseSlot.id}: ${compromises.slice(0, 3).join(', ')}. O Slot ${baseSlot.id} continua sendo a recomendação técnica mais sólida.`;
  } else if (missingData.length >= 2) {
    verdict = `O Slot ${minSlot.id} possui o menor preço (${formatBRL(minTotal)}), contudo o anúncio não informa atributos cruciais como: ${missingData.slice(0, 3).join(', ')}. Recomenda-se cautela ou confirmação prévia com o vendedor.`;
  } else {
    verdict = `O Slot ${minSlot.id} oferece o melhor custo-benefício (${formatBRL(minTotal)}), gerando uma economia de ${formatBRL(priceDiff)} (-${priceDiffPct}%) em comparação com o Slot ${baseSlot.id}, mantendo especificações técnicas equivalentes.`;
  }

  if (category.includes('Veículos') || category.includes('Autopeças')) {
    verdict += ` Em autopeças, certifique-se da compatibilidade do código OEM, ano e posição de montagem antes de comprar.`;
  }

  return verdict;
}

// Auxiliar: Busca valor na ficha por chave normalizada sem colisão de substring
function findMatchingValueExact(specs: Record<string, string>, targetCleanKey: string): string | null {
  if (!specs) return null;
  for (const [k, v] of Object.entries(specs)) {
    if (cleanStr(k) === targetCleanKey) return v;
  }
  const mapped = SYNONYM_MAP[targetCleanKey];
  if (mapped) {
    const cleanMapped = cleanStr(mapped);
    for (const [k, v] of Object.entries(specs)) {
      if (cleanStr(k) === cleanMapped) return v;
    }
  }
  return null;
}

/**
 * Fallback Dinâmico Heurístico Autônomo e Mutável
 */
export function generateDynamicFallbackAudit(
  slots: (ProductSlot | null)[],
  baseSlotId = 1
): DynamicComparisonResult {
  const activeSlots = slots.filter((s): s is ProductSlot => s !== null);
  const baseSlot = slots[baseSlotId - 1] || activeSlots[0] || slots[0];
  const effectiveBaseId = baseSlot ? baseSlot.id : 1;

  // 1. Categoria Dinâmica
  const detectedCategory = detectCategoryDynamically(activeSlots);

  // 2. Extrai e enriquece especificações de cada produto
  const slotSpecsEnriched: Record<number, Record<string, string>> = {};
  const allAttributesMap = new Map<string, string>(); // cleanKey -> DisplayLabel

  activeSlots.forEach(slot => {
    const enriched = analyzeProductSpecs(slot);
    slotSpecsEnriched[slot.id] = enriched;

    Object.keys(enriched).forEach(rawKey => {
      const cleanK = cleanStr(rawKey);
      if (cleanK && !allAttributesMap.has(cleanK)) {
        allAttributesMap.set(cleanK, rawKey);
      }
    });
  });

  // 3. Constrói a Matriz de Comparação e Specs Matrix
  const comparisonMatrix: DynamicComparisonRow[] = [];
  const specs_matrix: SpecsMatrixRow[] = [];

  allAttributesMap.forEach((displayLabel, cleanKey) => {
    const s1Raw = slotSpecsEnriched[1] ? findMatchingValueExact(slotSpecsEnriched[1], cleanKey) : null;
    const slot_1_value = s1Raw || 'Não informado';

    const baseRaw = slotSpecsEnriched[effectiveBaseId]
      ? findMatchingValueExact(slotSpecsEnriched[effectiveBaseId], cleanKey)
      : null;
    const baseValueNormalized = baseRaw || 'Não informado';

    const slot_values: Record<string, string> = {};
    const comparisons: Record<string, { value: string; status: ComparisonStatus; diffNote?: string }> = {};

    const matrixRow: SpecsMatrixRow = {
      attribute: displayLabel,
      slot_1: slot_1_value,
    };

    for (let i = 0; i < 5; i++) {
      const slotNum = i + 1;
      const slotObj = slots[i];
      const slotKeyName = `slot_${slotNum}`;

      if (!slotObj) {
        slot_values[slotKeyName] = '—';
        continue;
      }

      const rawVal = slotSpecsEnriched[slotNum]
        ? findMatchingValueExact(slotSpecsEnriched[slotNum], cleanKey)
        : null;
      const valDisplay = rawVal || 'Não informado';
      slot_values[slotKeyName] = valDisplay;

      if (slotNum === effectiveBaseId) {
        matrixRow[slotKeyName] = valDisplay;
        comparisons[slotKeyName] = {
          value: valDisplay,
          status: 'base',
          diffNote: 'Base de Referência',
        };
      } else {
        const comp = compareAttributeValues(baseValueNormalized, rawVal, displayLabel);
        matrixRow[slotKeyName] = comp.cleanValue ? `${comp.cleanValue} (${comp.badgeText})` : comp.badgeText;
        comparisons[slotKeyName] = {
          value: comp.cleanValue || valDisplay,
          status: comp.status,
          diffNote: comp.diffNote,
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

  // 4. Comparações Pareadas Cruzadas (Slot A vs Slot B)
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

  // 5. Veredito Técnico Dinâmico
  const technicalVerdict = generateDynamicVerdict(activeSlots, effectiveBaseId, specs_matrix, detectedCategory);

  return {
    detected_category: detectedCategory,
    base_slot_id: effectiveBaseId,
    comparison_matrix: comparisonMatrix,
    specs_matrix,
    technical_verdict: technicalVerdict,
    pairwise_matrix,
    executive_summary: technicalVerdict,
  };
}

// Chamada Principal do Serviço (Tenta Backend IA ou faz Fallback Dinâmico)
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

        if (d.specs_matrix && Array.isArray(d.specs_matrix)) {
          const comparison_matrix: DynamicComparisonRow[] = d.specs_matrix.map((row: any) => {
            const attrName = row.attribute || row.attribute_name || 'Especificação';
            const s1Val = row.slot_1 || row.slot_1_value || 'Não informado';
            const baseVal = row[`slot_${baseSlotId}`] || s1Val;

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
              else if (/idêntico|identico|equal/i.test(rawStr) || cleanStr(cleanVal) === cleanStr(baseVal)) status = 'equal';

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
    console.warn('Backend /api/ai-audit indisponível, usando fallback dinâmico local:', err);
  }

  return generateDynamicFallbackAudit(slots, baseSlotId);
}
