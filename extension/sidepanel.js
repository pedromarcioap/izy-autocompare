/**
 * AutoCompare Multi-Marketplace - SidePanel Controller (Manifest V3)
 * Motor Agnóstico e Mutável de Análise de Especificações e Confronto Multi-Categoria
 * Suporta Papelaria, Veículos & Autopeças, Ferramentas, Informática, Áudio, etc.
 */

const EDITORIAL_SYSTEM_INSTRUCTION = `Você é um Consultor Especialista e Auditor Técnico em E-commerce, Produtos e Análise Comparativa de Alto Nível.
Sua missão é gerar uma análise editorial aprofundada, humana, técnica e com acabamento de consultoria artística/especializada comparando os produtos fornecidos nos slots (Slot 1 a Slot 5).

ESTRUTURA MANDATÓRIA DA RESPOSTA (ESTRITAMENTE NESTAS 3 SEÇÕES EM MARKDOWN FORMATADO):

### 1. Introdução e Contexto
Uma frase introdutória clara identificando os produtos comparados, as plataformas e o foco da auditoria.

### 2. Tabela: "Comparativo Geral dos Produtos"
Uma tabela Markdown limpa com as seguintes colunas essenciais:
| Slot / Item | Produto / Marca | Preço Médio (BRL) | Qtd. de Folhas / Páginas / Unidades | Especificações Centrais de Performance | Qualidade, Construção e Acabamento |
| :--- | :--- | :--- | :--- | :--- | :--- |

(Preencha cada linha para todos os slots ativos com precisão técnica e métricas reais extraídas dos anúncios).

### 3. "Análise Detalhada por Critérios" (Dissecação em Prosa)
Subseções analíticas aprofundadas abordando os pilares de decisão de compra:

#### Faixa de Preço e Custo-Benefício
Discuta quem atua na faixa de entrada (para uso despretensioso/volume) e quem atua no segmento premium/profissional, justificando o salto de preço.

#### Volume e Autonomia
Comparação direta de quantidade de folhas, páginas, peças, capacidade, bateria ou durabilidade entre as opções.

#### Qualidade dos Materiais e Performance
Comparação minuciosa do comportamento prático dos materiais (ex.: resistência do papel à água/técnicas mistas, estabilidade térmica, etc.). Indique claramente quem suporta uso exigente e quem serve apenas para estudo ou uso leve.

#### Construção e Acabamento
Avaliação da durabilidade física, encadernação/carcaça, usabilidade prática (ex.: abertura plana lay-flat, conexões, robustez).`;

let currentSlots = [null, null, null, null, null];
let selectedBaseSlot = 1;
let currentAIResult = null;
let currentAIEditorialReport = '';
let geminiApiKey = '';
let isGeneratingEditorial = false;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  loadSlotsFromStorage();
  setupEventListeners();
});

// Load slots from chrome.storage.local
function loadSlotsFromStorage() {
  chrome.storage.local.get(['slots', 'selectedBaseSlot', 'geminiApiKey'], (result) => {
    if (result.slots && Array.isArray(result.slots) && result.slots.length === 5) {
      currentSlots = result.slots;
    } else {
      currentSlots = [null, null, null, null, null];
      chrome.storage.local.set({ slots: currentSlots });
    }
    if (result.selectedBaseSlot) {
      selectedBaseSlot = result.selectedBaseSlot;
    }
    if (result.geminiApiKey) {
      geminiApiKey = result.geminiApiKey;
      const input = document.getElementById('inputGeminiApiKey');
      if (input) input.value = geminiApiKey;
    }
    renderUI();
  });
}

// Setup buttons and interactions
function setupEventListeners() {
  // Capture to first available slot
  document.getElementById('btnCaptureCurrent').addEventListener('click', () => {
    const freeSlotIdx = currentSlots.indexOf(null);
    if (freeSlotIdx === -1) {
      showStatus('Todos os 5 slots estão ocupados! Limpe um slot ou selecione diretamente.', 'error');
      return;
    }
    void captureActiveTabToSlot(freeSlotIdx);
  });

  // Direct slot buttons (Slot 1 to 5)
  document.querySelectorAll('.btn-slot-direct').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const slotIdx = Number.parseInt(e.target.dataset.slot, 10);
      void captureActiveTabToSlot(slotIdx);
    });
  });

  // Clear all slots
  document.getElementById('btnClearAll').addEventListener('click', () => {
    if (confirm('Deseja realmente limpar todos os 5 slots?')) {
      currentSlots = [null, null, null, null, null];
      selectedBaseSlot = 1;
      currentAIEditorialReport = '';
      chrome.storage.local.set({ slots: currentSlots, selectedBaseSlot: 1 }, () => {
        renderUI();
        showStatus('Todos os slots foram limpos.', 'success');
      });
    }
  });

  // Toggle API Key section
  document.getElementById('btnToggleApiKey')?.addEventListener('click', () => {
    const sec = document.getElementById('apiKeySection');
    if (sec) {
      sec.style.display = sec.style.display === 'none' ? 'block' : 'none';
    }
  });

  // Save API Key
  document.getElementById('btnSaveApiKey')?.addEventListener('click', () => {
    const input = document.getElementById('inputGeminiApiKey');
    if (input) {
      geminiApiKey = input.value.trim();
      chrome.storage.local.set({ geminiApiKey }, () => {
        showStatus('Chave de API Gemini salva com sucesso!', 'success');
        const sec = document.getElementById('apiKeySection');
        if (sec) sec.style.display = 'none';
        void generateAndRenderEditorialReport(true);
      });
    }
  });

  // Regenerate Report
  document.getElementById('btnRegenerateReport')?.addEventListener('click', () => {
    void generateAndRenderEditorialReport(true);
  });

  // Copy full formatted markdown report
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
    if (!tab?.id) {
      showStatus('Nenhuma aba ativa encontrada.', 'error');
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PRODUCT_DATA' }, async (response) => {
      if (chrome.runtime.lastError || !response?.success) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js'],
          });

          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PRODUCT_DATA' }, (retryRes) => {
              if (retryRes?.success) {
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
    price: typeof data.price === 'number' ? data.price : Number.parseFloat(data.price) || 0,
    shipping: typeof data.shipping === 'number' ? data.shipping : Number.parseFloat(data.shipping) || 0,
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
  const activeIds = currentSlots.filter(s => s !== null).map(s => s.id);
  if (!activeIds.includes(selectedBaseSlot) && activeIds.length > 0) {
    selectedBaseSlot = activeIds[0];
  }
  chrome.storage.local.set({ slots: currentSlots, selectedBaseSlot }, () => {
    renderUI();
    showStatus(`Slot ${slotIndex + 1} limpo.`, 'info');
  });
}

// Helper: Format BRL
function formatCurrency(val) {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Helper: Normalize string for comparison (removes accents, punctuation, repeated spaces)
function cleanStr(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * =====================================================================
 * MOTOR UNIVERSAL E MUTÁVEL DE ESPECIFICAÇÕES (CATEGORY-AGNOSTIC)
 * Suporta Autopeças & Veículos, Papelaria & Livros, Ferramentas, etc.
 * =====================================================================
 */

// Dicionário canônico de agrupamento de sinônimos multi-categoria
const SYNONYM_MAP = {
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

// Normaliza o nome de um atributo usando a tabela canônica
function canonicalizeAttributeName(rawKey) {
  if (!rawKey) return '';
  const trimmed = rawKey.trim();
  const cleanKey = cleanStr(trimmed);
  if (SYNONYM_MAP[cleanKey]) {
    return SYNONYM_MAP[cleanKey];
  }
  // Capitaliza a primeira letra de cada palavra caso não esteja mapeada
  return trimmed
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// Expressões regulares e listas para extração heurística de atributos
const KV_LINE_REGEX = /^[\s\-*•#]?\s*([^:：]{2,35})[:：]\s*(.{2,120})$/;
const FORBIDDEN_KEYS_REGEX = /^(https?|www|http|image|html|slot|preco|frete|link)/i;

const AUTOMAKER_REGEX = /\b(Volkswagen|VW|Chevrolet|GM|Fiat|Ford|Toyota|Honda|Hyundai|Renault|Nissan|Jeep|Peugeot|Citro[eë]n|Mitsubishi|BMW|Mercedes(?:-Benz)?|Audi)\b/i;
const POPULAR_CAR_MODELS = [
  'Gol', 'Voyage', 'Saveiro', 'Fox', 'Parati', 'CrossFox', 'Polo', 'Golf', 'Virtus', 'Nivus', 'T-Cross',
  'Corsa', 'Celta', 'Onix', 'Prisma', 'Astra', 'Vectra', 'Montana', 'Spin', 'Tracker',
  'Palio', 'Uno', 'Siena', 'Strada', 'Mobi', 'Argo', 'Cronos', 'Toro', 'Punto',
  'Ka', 'Fiesta', 'EcoSport', 'Focus', 'Ranger',
  'Civic', 'Fit', 'City', 'HR-V', 'CR-V',
  'Corolla', 'Yaris', 'Hilux', 'Etios',
  'HB20', 'Creta',
  'Sandero', 'Logan', 'Duster', 'Kicks', 'March', 'Renegade', 'Compass'
];
const CAR_GENERATION_REGEX = /\b(Gol|Voyage|Saveiro|Fox|Parati|Polo|Golf)\s*(G[1-8])\b/i;

const YEAR_RANGE_REGEX = /\b(?:anos?\s+)?(?:19|20)\d{2}\s*(?:ate|[a\-/])\s*(?:19|20)\d{2}\b/i;
const YEAR_SINGLE_REGEX = /\b(?:(?:19|20)\d{2}\+|anos?\s+(?:19|20)\d{2})\b/i;
const POSITION_REGEX = /\b(par dianteiro|par traseiro|dianteir[oa]|traseir[oa]|diant\b|tras\b|esquerd[oa]|direit[oa]|superior|inferior|traseiro\/dianteiro)\b/i;
const OEM_REGEX = /\b(?:OEM|part\s*number|c[oó]d(?:igo)?(?:\s*(?:original|pe[cç]a))?)[:\s]*([A-Z0-9.-]{5,18})\b/i;
const PARTS_BRAND_REGEX = /\b(Bosch|Cofap|Nakata|Fras-le|TRW|Cobreq|Mahle|Magneti Marelli|Valeo|NGK|Delphi|Denso|Monroe|Sachs|Hipper Freios|Willtec|Dayco|Gates|Continental|Contitech|SKF)\b/i;

const PART_TYPE_KEYWORDS = [
  /pastilhas? de freio/i,
  /discos? de freio/i,
  /amortecedores?/i,
  /velas? de igni[cç][aã]o/i,
  /filtro de (?:[oó]leo|ar|combust[ií]vel)/i,
  /bomba (?:d['’]?[aá]gua|de combust[ií]vel)/i,
  /correia dentada/i,
  /radiador/i,
  /sensor de oxig[eê]nio/i,
  /terminal de dire[cç][aã]o/i,
  /piv[oô] de suspens[aã]o/i,
];

function findPartType(text) {
  for (const regex of PART_TYPE_KEYWORDS) {
    const match = regex.exec(text);
    if (match) return match[0];
  }
  return null;
}

const PART_MAT_REGEX = /\b(cer[aâ]mica|semi-met[aá]lica|org[aâ]nica|met[aá]lica|a[cç]o carbono|alum[ií]nio|ferro fundido)\b/i;

const GSM_REGEX = /(\d{2,4})\s*(gsm|g\/m²|g\/m2|g\b|gr\b)/i;
const SHEETS_REGEX = /(\d{1,4})\s*(?:folhas|fls|pages|p[aá]ginas|pags|sheets)\b/i;
const PAPER_SIZE_REGEX = /\b[AB][2-6]\b/i;
const DIMENSIONS_REGEX = /\b\d+(?:[.,]\d+)?\s*x\s*\d+(?:[.,]\d+)?/i;
const UNIT_SUFFIX_REGEX = /^\s*(?:cm|mm|in|pol(?:egadas)?)\b/i;
const FIBER_PERCENT_REGEX = /\d{1,3}%\s*(?:algod[aã]o|cotton|celulose|poli[eé]ster)/i;
const MATERIAL_TYPE_REGEX = /(?:papel\s*(?:kraft|couch[eê])|couro(?:\s*(?:pu|leg[ií]timo))?)/i;
const COVER_REGEX = /\b(hardcover|capa dura|softcover|capa comum|espiral|wire-o|costurado|brochura)\b/i;
const TEXTURE_REGEX = /\b(gr[aã]o fino|gr[aã]o rugoso|acetinado|cold pressed|hot pressed|satinado|torchon)\b/i;

const VOLT_REGEX = /(\b\d{1,3}V\b|bivolt)/i;
const TORQUE_REGEX = /(\d{1,3})\s*(?:nm|n\.m)/i;
const BT_REGEX = /(?:bluetooth|bt)\s*(\d+\.\d+)/i;
const BAT_REGEX = /\b(\d+(?:\.\d+)?\s*m?Ah)\b/i;
const KIT_COMBO_REGEX = /\b(?:kit|jogo)\b(?:\s*com)?\s*\d+(?:\s*(?:pe[cç]as|unidades|un))?/i;
const ITEM_COUNT_REGEX = /\b\d+\s*(?:pe[cç]as|unidades|un)\b/i;
const PAIR_REGEX = /\bpar\b/i;
const WAR_REGEX = /(\d{1,2}\s*(?:meses|anos?|dias)(?:\s*de\s*garantia)?)/i;

function findPaperDimensions(text) {
  const paperMatch = PAPER_SIZE_REGEX.exec(text);
  if (paperMatch) return paperMatch[0].toUpperCase();

  const match = DIMENSIONS_REGEX.exec(text);
  if (!match) return null;

  const afterMatch = text.slice(match.index + match[0].length);
  const unitMatch = UNIT_SUFFIX_REGEX.exec(afterMatch);
  return (unitMatch ? `${match[0]}${unitMatch[0]}` : match[0]).toUpperCase();
}

function findCarModel(text) {
  const genMatch = CAR_GENERATION_REGEX.exec(text);
  if (genMatch) return `${genMatch[1]} ${genMatch[2].toUpperCase()}`;
  for (const model of POPULAR_CAR_MODELS) {
    const regex = new RegExp(String.raw`\b${model}\b`, 'i');
    if (regex.test(text)) return model;
  }
  return null;
}

function extractStructuredSpecs(slotSpecs, specs) {
  for (const [k, v] of Object.entries(slotSpecs)) {
    if (k && typeof v === 'string' && v.trim().length > 0) {
      const canonicalKey = canonicalizeAttributeName(k);
      specs[canonicalKey] = v.trim();
    }
  }
}

function extractKeyValueLines(textSource, specs) {
  const lines = textSource.split('\n');
  for (const line of lines) {
    const match = KV_LINE_REGEX.exec(line);
    if (!match) continue;
    const rawK = match[1].trim();
    const rawV = match[2].trim();
    if (!FORBIDDEN_KEYS_REGEX.test(rawK)) {
      const canonicalKey = canonicalizeAttributeName(rawK);
      if (!specs[canonicalKey]) {
        specs[canonicalKey] = rawV;
      }
    }
  }
}

function extractVehicleCompatibility(fullText, specs) {
  const automakerMatch = AUTOMAKER_REGEX.exec(fullText);
  if (automakerMatch && !specs['Montadora / Fabricante do Veículo']) {
    specs['Montadora / Fabricante do Veículo'] = automakerMatch[0].toUpperCase() === 'VW' ? 'Volkswagen (VW)' : automakerMatch[0];
  }

  const carModel = findCarModel(fullText);
  if (carModel && !specs['Compatibilidade / Veículos']) {
    specs['Compatibilidade / Veículos'] = carModel;
  }

  const yearMatch = YEAR_RANGE_REGEX.exec(fullText) || YEAR_SINGLE_REGEX.exec(fullText);
  if (yearMatch && !specs['Ano / Compatibilidade']) {
    specs['Ano / Compatibilidade'] = yearMatch[0];
  }
}

function extractPartDetails(fullText, specs) {
  const posMatch = POSITION_REGEX.exec(fullText);
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

  const partsBrandMatch = PARTS_BRAND_REGEX.exec(fullText);
  if (partsBrandMatch && !specs['Marca / Fabricante']) {
    specs['Marca / Fabricante'] = partsBrandMatch[0];
  }

  const partTypeMatch = findPartType(fullText);
  if (partTypeMatch && !specs['Tipo de Peça / Aplicação']) {
    specs['Tipo de Peça / Aplicação'] = partTypeMatch.charAt(0).toUpperCase() + partTypeMatch.slice(1).toLowerCase();
  }

  const partMatMatch = PART_MAT_REGEX.exec(fullText);
  if (partMatMatch && !specs['Material / Composição']) {
    specs['Material / Composição'] = partMatMatch[0].charAt(0).toUpperCase() + partMatMatch[0].slice(1).toLowerCase();
  }
}

function extractAutomotiveSpecs(fullText, specs) {
  extractVehicleCompatibility(fullText, specs);
  extractPartDetails(fullText, specs);
}

function extractStationerySpecs(fullText, specs) {
  const gsmMatch = GSM_REGEX.exec(fullText);
  if (gsmMatch && !specs['Gramatura / Espessura']) {
    specs['Gramatura / Espessura'] = `${gsmMatch[1]} g/m²`;
  }

  const sheetsMatch = SHEETS_REGEX.exec(fullText);
  if (sheetsMatch && !specs['Quantidade de Folhas / Páginas']) {
    specs['Quantidade de Folhas / Páginas'] = `${sheetsMatch[1]} folhas`;
  }

  const sizeValue = findPaperDimensions(fullText);
  if (sizeValue && !specs['Dimensões / Formato']) {
    specs['Dimensões / Formato'] = sizeValue;
  }

  const paperCompMatch = FIBER_PERCENT_REGEX.exec(fullText) || MATERIAL_TYPE_REGEX.exec(fullText);
  if (paperCompMatch && !specs['Composição / Fibra'] && !specs['Material / Composição']) {
    specs['Composição / Fibra'] = paperCompMatch[0];
  }

  const coverMatch = COVER_REGEX.exec(fullText);
  if (coverMatch && !specs['Tipo de Capa / Encadernação']) {
    specs['Tipo de Capa / Encadernação'] = coverMatch[0].toLowerCase().includes('hardcover') || coverMatch[0].toLowerCase().includes('capa dura')
      ? 'Capa Dura (Hardcover)'
      : coverMatch[0];
  }

  const textureMatch = TEXTURE_REGEX.exec(fullText);
  if (textureMatch && !specs['Textura / Grão do Papel']) {
    specs['Textura / Grão do Papel'] = textureMatch[0];
  }
}

function extractToolElectronicsSpecs(fullText, specs) {
  const voltMatch = VOLT_REGEX.exec(fullText);
  if (voltMatch && !specs['Tensão / Voltagem']) {
    specs['Tensão / Voltagem'] = voltMatch[0].toUpperCase();
  }

  const torqueMatch = TORQUE_REGEX.exec(fullText);
  if (torqueMatch && !specs['Torque Máximo']) {
    specs['Torque Máximo'] = `${torqueMatch[1]} Nm`;
  }

  const btMatch = BT_REGEX.exec(fullText);
  if (btMatch && !specs['Versão do Bluetooth']) {
    specs['Versão do Bluetooth'] = `Bluetooth ${btMatch[1]}`;
  }

  const batMatch = BAT_REGEX.exec(fullText);
  if (batMatch && !specs['Capacidade da Bateria']) {
    specs['Capacidade da Bateria'] = batMatch[0];
  }

  const kitMatch = KIT_COMBO_REGEX.exec(fullText) || ITEM_COUNT_REGEX.exec(fullText) || PAIR_REGEX.exec(fullText);
  if (kitMatch && !specs['Conteúdo da Embalagem / Acessórios']) {
    specs['Conteúdo da Embalagem / Acessórios'] = kitMatch[0];
  }

  const warMatch = WAR_REGEX.exec(fullText);
  if (warMatch && !specs['Garantia']) {
    specs['Garantia'] = warMatch[0];
  }
}

/**
 * Extrator e Analisador Dinâmico de Especificações
 * Minera metadados estruturados, linhas Chave:Valor do texto e padrões contextuais
 */
function analyzeProductSpecs(slot) {
  const specs = {};
  if (!slot) return specs;

  // 1. Incorpora especificações estruturadas já capturadas da página (tabelas, json-ld)
  if (slot.specs && typeof slot.specs === 'object') {
    extractStructuredSpecs(slot.specs, specs);
  }

  // 2. Minera linhas com padrão Chave: Valor a partir do texto bruto (raw_specs / descrição)
  const textSource = [slot.raw_specs, slot.description].filter(Boolean).join('\n');
  if (textSource) {
    extractKeyValueLines(textSource, specs);
  }

  // 3. Mineração Heurística Agnóstica no Título e Descrição
  const fullText = `${slot.title || ''} ${textSource}`.trim();
  extractAutomotiveSpecs(fullText, specs);
  extractStationerySpecs(fullText, specs);
  extractToolElectronicsSpecs(fullText, specs);

  return specs;
}

/**
 * Inferência Dinâmica e Mutável da Categoria
 */
function detectCategoryDynamically(activeSlots) {
  const combinedText = activeSlots
    .map(s => `${s.title} ${Object.keys(s.specs || {}).join(' ')} ${Object.values(s.specs || {}).join(' ')}`)
    .join(' ')
    .toLowerCase();

  // Prioridades de detecção por densidade de termos
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

  // Fallback Inteligente: Extrai os termos mais recorrentes do título
  const words = combinedText
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4 && !/^(produto|shopee|aliexpress|frete|gratis|envio|pronta|entrega|original|novo)$/.test(w));

  const wordCounts = {};
  words.forEach(w => { wordCounts[w] = (wordCounts[w] || 0) + 1; });
  const sortedWords = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]);
  if (sortedWords.length > 0) {
    const topWord = sortedWords[0][0];
    return `Artigos Gerais (${topWord.charAt(0).toUpperCase() + topWord.slice(1)})`;
  }

  return 'Artigos Gerais & E-commerce';
}

function compareOemAttribute(cleanB, cleanT, targetVal) {
  const oemB = cleanB.replace(/[^a-z0-9]/g, '');
  const oemT = cleanT.replace(/[^a-z0-9]/g, '');
  if (oemB && oemT && (oemB === oemT || oemB.includes(oemT) || oemT.includes(oemB))) {
    return {
      status: 'equal',
      cleanValue: targetVal,
      badgeText: 'Idêntico (OEM)',
      badgeClass: 'badge-equal',
      diffNote: 'Código OEM equivalente',
    };
  }
  return null;
}

function comparePositionAttribute(cleanB, cleanT, targetVal) {
  const isFrontB = cleanB.includes('diant');
  const isFrontT = cleanT.includes('diant');
  const isRearB = cleanB.includes('tras');
  const isRearT = cleanT.includes('tras');

  if ((isFrontB && isFrontT) || (isRearB && isRearT)) {
    return {
      status: 'equal',
      cleanValue: targetVal,
      badgeText: 'Idêntico',
      badgeClass: 'badge-equal',
      diffNote: 'Mesma posição de montagem',
    };
  }

  if ((isFrontB && isRearT) || (isRearB && isFrontT)) {
    return {
      status: 'divergent',
      cleanValue: targetVal,
      badgeText: 'Alerta: Posição Incompatível',
      badgeClass: 'badge-danger',
      diffNote: 'Atenção: Um é Dianteiro e outro é Traseiro!',
    };
  }

  return null;
}

function compareYearAttribute(baseVal, targetVal) {
  const yearsB = (baseVal.match(/\b(?:19|20)\d{2}\b/g) || []).map(Number);
  const yearsT = (targetVal.match(/\b(?:19|20)\d{2}\b/g) || []).map(Number);
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
        badgeClass: 'badge-equal',
        diffNote: 'Mesma faixa de anos de compatibilidade',
      };
    }
    return {
      status: 'divergent',
      cleanValue: targetVal,
      badgeText: 'Divergente',
      badgeClass: 'badge-divergent',
      diffNote: `Faixa de anos diferente (${targetVal} vs ${baseVal})`,
    };
  }
  return null;
}

function compareNumericAttribute(baseVal, targetVal, cleanB, cleanT) {
  const allNumsB = baseVal.match(/\b(\d+(?:[.,]\d+)?)\b/g) || [];
  const allNumsT = targetVal.match(/\b(\d+(?:[.,]\d+)?)\b/g) || [];

  if (allNumsB.length === 1 && allNumsT.length === 1) {
    const valB = Number.parseFloat(allNumsB[0].replace(',', '.'));
    const valT = Number.parseFloat(allNumsT[0].replace(',', '.'));

    // Mesma unidade e mesmo número
    if (valB === valT && cleanB.replace(/[\d.,\s]/g, '') === cleanT.replace(/[\d.,\s]/g, '')) {
      return {
        status: 'equal',
        cleanValue: targetVal,
        badgeText: 'Idêntico',
        badgeClass: 'badge-equal',
        diffNote: 'Valor e unidade equivalentes',
      };
    }

    // Diferença quantificável (superior ou inferior)
    if (valT > valB) {
      return {
        status: 'divergent',
        cleanValue: targetVal,
        badgeText: 'Superior (+)',
        badgeClass: 'badge-superior',
        diffNote: `Superior ao Base (${targetVal} vs ${baseVal})`,
      };
    }
    if (valT < valB) {
      return {
        status: 'divergent',
        cleanValue: targetVal,
        badgeText: 'Inferior (-)',
        badgeClass: 'badge-inferior',
        diffNote: `Inferior ao Base (${targetVal} vs ${baseVal})`,
      };
    }
  }
  return null;
}

/**
 * Comparador Semântico de Valores de Especificação
 * Identifica se dois valores são tecnicamente idênticos, divergentes (superiores/inferiores) ou omitidos
 */
function compareAttributeValues(baseVal, targetVal, attributeName) {
  if (!targetVal || targetVal === 'Não informado' || targetVal === '—') {
    return {
      status: 'missing',
      cleanValue: 'Não informada',
      badgeText: 'Não informado',
      badgeClass: 'badge-missing',
      diffNote: 'Dado não informado pelo vendedor',
    };
  }

  if (!baseVal || baseVal === 'Não informado' || baseVal === '—') {
    return {
      status: 'divergent',
      cleanValue: targetVal,
      badgeText: 'Divergente',
      badgeClass: 'badge-divergent',
      diffNote: 'Disponível apenas neste anúncio',
    };
  }

  const cleanB = cleanStr(baseVal);
  const cleanT = cleanStr(targetVal);

  // Equivalência exata ou normalizada
  if (cleanB === cleanT) {
    return {
      status: 'equal',
      cleanValue: targetVal,
      badgeText: 'Idêntico',
      badgeClass: 'badge-equal',
      diffNote: 'Especificação técnica equivalente',
    };
  }

  // Equivalência de códigos OEM
  if (attributeName.includes('OEM') || attributeName.includes('Código')) {
    const oemRes = compareOemAttribute(cleanB, cleanT, targetVal);
    if (oemRes) return oemRes;
  }

  // Comparação de Posição / Lado de Peças Automotivas
  if (attributeName.includes('Posição') || attributeName.includes('Lado')) {
    const posRes = comparePositionAttribute(cleanB, cleanT, targetVal);
    if (posRes) return posRes;
  }

  // Comparação de Faixas de Anos
  if (attributeName.includes('Ano')) {
    const yearRes = compareYearAttribute(baseVal, targetVal);
    if (yearRes) return yearRes;
  }

  // Equivalência numérica com unidades únicas
  const numRes = compareNumericAttribute(baseVal, targetVal, cleanB, cleanT);
  if (numRes) return numRes;

  return {
    status: 'divergent',
    cleanValue: targetVal,
    badgeText: 'Divergente',
    badgeClass: 'badge-divergent',
    diffNote: `Divergência técnica vs Base (${baseVal})`,
  };
}

/**
 * Construtor do Veredito Dinâmico e Contextual
 */
function generateDynamicVerdict(activeSlots, baseSlotId, specsMatrix, category) {
  const baseSlot = activeSlots.find(s => s.id === baseSlotId) || activeSlots[0];

  // Encontra o slot com menor desembolso total
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

  // Analisa as divergências do slot mais barato em relação ao slot base
  const compromises = [];
  const missingData = [];

  specsMatrix.forEach(row => {
    const rawVal = row[`slot_${minSlot.id}`] || '';
    if (/não informad/i.test(rawVal)) {
      missingData.push(row.attribute);
    } else if (/inferior/i.test(rawVal) || /incompat[ií]vel/i.test(rawVal)) {
      compromises.push(`${row.attribute} (${rawVal})`);
    }
  });

  let verdictText = '';

  if (minSlot.id === baseSlot.id) {
    verdictText = `🏆 <strong>Melhor Escolha Absoluta:</strong> O <strong>Slot ${baseSlot.id}</strong> reúne o menor desembolso total (${formatCurrency(minTotal)}) e serve como a melhor referência técnica para a categoria <em>${category}</em>, sem concessões na qualidade ou compatibilidade.`;
  } else if (compromises.length > 0) {
    verdictText = `⚠️ <strong>Alerta de Trade-Off Técnico:</strong> O <strong>Slot ${minSlot.id}</strong> é mais barato (${formatCurrency(minTotal)}, economia de ${formatCurrency(priceDiff)} / -${priceDiffPct}%), mas apresenta <strong>reduções técnicas relevantes</strong> em relação ao Slot ${baseSlot.id}: <em>${compromises.slice(0, 3).join(', ')}</em>. O <strong>Slot ${baseSlot.id}</strong> continua sendo a recomendação técnica mais sólida e durável.`;
  } else if (missingData.length >= 2) {
    verdictText = `🔍 <strong>Atenção às Omissões Técnicas:</strong> O <strong>Slot ${minSlot.id}</strong> lidera em preço (${formatCurrency(minTotal)}), contudo o anúncio não informa atributos cruciais como: <em>${missingData.slice(0, 3).join(', ')}</em>. Recomenda-se confirmar a compatibilidade exata com o vendedor antes de comprar.`;
  } else {
    verdictText = `✅ <strong>Campeão em Custo-Benefício:</strong> O <strong>Slot ${minSlot.id}</strong> oferece o menor desembolso total (${formatCurrency(minTotal)}), gerando uma economia de ${formatCurrency(priceDiff)} (-${priceDiffPct}%) em comparação com o Slot ${baseSlot.id}, mantendo especificações técnicas equivalentes nos principais atributos avaliados.`;
  }

  // Dica específica para a categoria de Veículos e Peças
  if (category.includes('Veículos') || category.includes('Autopeças')) {
    verdictText += `<br><span style="display:inline-block; margin-top:6px; color:#38bdf8;">🚗 <strong>Aviso de Autopeças:</strong> Verifique sempre o código OEM e a compatibilidade do ano e da posição (dianteira/traseira) com o manual do seu veículo antes de finalizar.</span>`;
  }

  return verdictText;
}

/**
 * Motor Dinâmico de Extração e Confronto de Especificações (specs_matrix)
 */
function processAIAuditLocal(slots, baseSlotId = 1) {
  const activeSlots = slots.filter(s => s !== null);
  const baseSlot = activeSlots.find(s => s.id === baseSlotId) || activeSlots[0] || slots[0];
  const effectiveBaseId = baseSlot ? baseSlot.id : 1;

  // 1. Detecta a Categoria de Forma Dinâmica e Mutável
  const category = detectCategoryDynamically(activeSlots);

  // 2. Extrai e enriquece especificações de cada produto ativamente
  const slotSpecsEnriched = {};
  const allAttributesMap = new Map(); // cleanKey -> Canonical Display Label

  activeSlots.forEach(slot => {
    const enriched = analyzeProductSpecs(slot);
    slotSpecsEnriched[slot.id] = enriched;

    Object.keys(enriched).forEach(attrName => {
      const cleanK = cleanStr(attrName);
      if (cleanK && !allAttributesMap.has(cleanK)) {
        allAttributesMap.set(cleanK, attrName);
      }
    });
  });

  // 3. Monta a Matriz Canônica (specs_matrix)
  const specs_matrix = [];

  allAttributesMap.forEach((displayLabel, cleanKey) => {
    const baseRawVal = slotSpecsEnriched[effectiveBaseId]
      ? findSpecValueExact(slotSpecsEnriched[effectiveBaseId], cleanKey)
      : null;
    const baseValueDisplay = baseRawVal || 'Não informado';

    const matrixRow = {
      attribute: displayLabel,
      slot_1: 'Não informada',
      slot_2: '—',
      slot_3: '—',
      slot_4: '—',
      slot_5: '—',
      _comparisons: {},
    };

    // Avalia cada um dos 5 slots
    for (let slotNum = 1; slotNum <= 5; slotNum++) {
      const slotKey = `slot_${slotNum}`;
      const slotObj = slots[slotNum - 1];

      if (!slotObj) {
        matrixRow[slotKey] = '—';
        continue;
      }

      const slotVal = slotSpecsEnriched[slotNum]
        ? findSpecValueExact(slotSpecsEnriched[slotNum], cleanKey)
        : null;

      if (slotNum === effectiveBaseId) {
        matrixRow[slotKey] = slotVal || 'Não informado';
        matrixRow._comparisons[slotKey] = {
          status: 'base',
          cleanValue: slotVal || 'Não informado',
          badgeText: 'Base',
          badgeClass: 'badge-base',
          diffNote: 'Base de Referência',
        };
      } else {
        const comp = compareAttributeValues(baseValueDisplay, slotVal, displayLabel);
        matrixRow[slotKey] = comp.cleanValue ? `${comp.cleanValue} (${comp.badgeText})` : comp.badgeText;
        matrixRow._comparisons[slotKey] = comp;
      }
    }

    specs_matrix.push(matrixRow);
  });

  // 4. Gera Veredito Técnico Dinâmico
  const technical_verdict = generateDynamicVerdict(activeSlots, effectiveBaseId, specs_matrix, category);

  return {
    category,
    reference_slot: effectiveBaseId,
    specs_matrix,
    technical_verdict,
  };
}

// Auxiliar: Busca valor na ficha por chave normalizada sem falso positivo por substring
function findSpecValueExact(specs, targetCleanKey) {
  if (!specs) return null;
  // 1. Tenta correspondência exata
  for (const [k, v] of Object.entries(specs)) {
    if (cleanStr(k) === targetCleanKey) return v;
  }
  // 2. Tenta por sinônimo canônico
  const mappedTarget = SYNONYM_MAP[targetCleanKey];
  if (mappedTarget) {
    const cleanMapped = cleanStr(mappedTarget);
    for (const [k, v] of Object.entries(specs)) {
      if (cleanStr(k) === cleanMapped) return v;
    }
  }
  return null;
}

function createActiveSlotCard(slot, i, isBase) {
  const slotEl = document.createElement('div');
  const slotId = i + 1;
  const isShopee = slot.platform.toLowerCase().includes('shopee');
  const totalPrice = (slot.price || 0) + (slot.shipping || 0);

  slotEl.className = 'slot-card';
  if (isBase) slotEl.style.border = '2px solid #06b6d4';

  const imageHtml = slot.image
    ? `<img src="${slot.image}" alt="" style="width: 36px; height: 36px; object-fit: cover; border-radius: 6px; border: 1px solid #1e293b; background: #000;" />`
    : `<div style="width: 36px; height: 36px; background: #1e293b; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 16px;">📦</div>`;

  const baseBadge = isBase ? ' (Base)' : '';
  const baseBtnBg = isBase ? '#0284c7' : '#1e293b';
  const baseBtnColor = isBase ? '#fff' : '#94a3b8';
  const baseBtnText = isBase ? '★ Base' : 'Tornar Base';

  slotEl.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <span class="badge ${isShopee ? 'badge-shopee' : 'badge-ali'}">Slot ${slotId} • ${slot.platform}${baseBadge}</span>
      <button class="btn-clear-slot" data-slot="${i}" style="background: transparent; border: none; color: #f43f5e; cursor: pointer; font-size: 12px;" title="Limpar este slot">✕</button>
    </div>
    <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
      ${imageHtml}
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
      <div style="display: flex; gap: 4px;">
        <button class="btn-set-base" data-slot="${slotId}" style="background: ${baseBtnBg}; border: 1px solid #334155; border-radius: 4px; padding: 2px 4px; color: ${baseBtnColor}; cursor: pointer;">${baseBtnText}</button>
        <button class="btn-recapture" data-slot="${i}" style="background: #1e293b; border: 1px solid #334155; border-radius: 4px; padding: 2px 4px; color: #94a3b8; cursor: pointer;">Recapturar</button>
      </div>
    </div>
  `;
  return slotEl;
}

function createEmptySlotCard(i) {
  const slotEl = document.createElement('div');
  const slotId = i + 1;
  slotEl.className = 'slot-card slot-empty';
  slotEl.innerHTML = `
    <div>
      <div style="font-weight: 700; font-size: 11px; color: #475569; margin-bottom: 2px;">SLOT ${slotId} LIVRE</div>
      <button class="btn-capture-slot" data-slot="${i}" style="font-size: 10px; color: #38bdf8; background: transparent; border: 1px dashed #0284c7; padding: 3px 6px; border-radius: 4px; cursor: pointer;">
        + Capturar Aba
      </button>
    </div>
  `;
  return slotEl;
}

function createSlotCardElement(slot, i, isBase) {
  return slot ? createActiveSlotCard(slot, i, isBase) : createEmptySlotCard(i);
}

function attachSlotCardListeners(container) {
  container.querySelectorAll('.btn-clear-slot').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = Number.parseInt(e.currentTarget.dataset.slot, 10);
      clearSingleSlot(idx);
    });
  });

  container.querySelectorAll('.btn-capture-slot, .btn-recapture').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = Number.parseInt(e.currentTarget.dataset.slot, 10);
      void captureActiveTabToSlot(idx);
    });
  });

  container.querySelectorAll('.btn-set-base').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const slotId = Number.parseInt(e.currentTarget.dataset.slot, 10);
      selectedBaseSlot = slotId;
      chrome.storage.local.set({ selectedBaseSlot });
      renderUI();
    });
  });
}

function renderSlotCardsStrip() {
  const container = document.getElementById('slotsContainer');
  if (!container) return;
  container.innerHTML = '';

  for (let i = 0; i < 5; i++) {
    const slot = currentSlots[i];
    const isBase = (i + 1) === selectedBaseSlot;
    const slotEl = createSlotCardElement(slot, i, isBase);
    container.appendChild(slotEl);
  }

  attachSlotCardListeners(container);
}

function renderBaseSlotButtons(activeProducts) {
  const baseSlotButtonsContainer = document.getElementById('baseSlotButtons');
  if (!baseSlotButtonsContainer) return;
  baseSlotButtonsContainer.innerHTML = '';

  activeProducts.forEach(p => {
    const btn = document.createElement('button');
    const isBase = p.id === selectedBaseSlot;
    btn.className = 'btn-secondary';
    btn.style.cssText = isBase
      ? 'padding: 2px 8px; font-size: 11px; background: #0284c7; color: #fff; font-weight: 700; border-color: #38bdf8;'
      : 'padding: 2px 8px; font-size: 11px;';
    btn.textContent = `Slot ${p.id}${isBase ? ' ★' : ''}`;
    btn.addEventListener('click', () => {
      selectedBaseSlot = p.id;
      chrome.storage.local.set({ selectedBaseSlot });
      renderUI();
    });
    baseSlotButtonsContainer.appendChild(btn);
  });
}

// Render Master UI
function renderUI() {
  const activeProducts = currentSlots.filter(s => s !== null);
  const activeCount = activeProducts.length;

  const countLabel = document.getElementById('slotCountLabel');
  if (countLabel) countLabel.innerText = `${activeCount}/5`;

  // Garante que o slot base selecionado existe nos ativos
  const activeIds = activeProducts.map(p => p.id);
  if (!activeIds.includes(selectedBaseSlot) && activeIds.length > 0) {
    selectedBaseSlot = activeIds[0];
  }

  // 1. Render Slot Cards Strip
  renderSlotCardsStrip();

  // 2. Renderiza os Botões Seletores da Base de Confronto
  renderBaseSlotButtons(activeProducts);

  // 3. Toggle Comparison Section
  const compSection = document.getElementById('comparisonSection');
  const emptyState = document.getElementById('emptyComparisonState');

  if (activeCount >= 2) {
    if (compSection) compSection.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';

    currentAIResult = processAIAuditLocal(currentSlots, selectedBaseSlot);

    renderFinancialMatrix(activeProducts);
    renderSpecsMatrixTable(currentAIResult, activeProducts);
    void generateAndRenderEditorialReport(false);
  } else {
    if (compSection) compSection.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    currentAIResult = null;
    currentAIEditorialReport = '';
  }
}

// Render Financial Matrix Table
function renderFinancialMatrix(activeProducts) {
  const table = document.getElementById('financialTable');
  if (!table) return;
  
  let minTotal = Infinity;
  activeProducts.forEach(p => {
    const total = (p.price || 0) + (p.shipping || 0);
    if (total < minTotal) minTotal = total;
  });

  let html = `
    <thead>
      <tr>
        <th style="width: 140px;">Indicador</th>
        ${activeProducts.map(p => {
          const isBase = p.id === selectedBaseSlot;
          return `
            <th class="${isBase ? 'base-col-header' : ''}">
              <div style="display: flex; align-items: center; gap: 4px;">
                <span class="badge" style="background: ${isBase ? '#0284c7' : '#1e293b'}; color: #fff;">Slot ${p.id}${isBase ? ' (Base)' : ''}</span>
                <span style="max-width: 90px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.platform}</span>
              </div>
            </th>
          `;
        }).join('')}
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
              ${isCheapest ? `<div class="badge badge-cheapest" style="margin-top: 2px;">★ Mais Econômico</div>` : ''}
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
          if (diff === 0) return `<td style="color: #34d399; font-weight: 600;">Menor Custo (0%)</td>`;
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
  if (!table) return;

  let html = `
    <thead>
      <tr>
        <th style="width: 140px;">Especificação Canônica</th>
        ${activeProducts.map(p => {
          const isBase = p.id === selectedBaseSlot;
          return `
            <th class="${isBase ? 'base-col-header' : ''}">
              <div style="font-weight: 700;">Slot ${p.id} ${isBase ? '(Base)' : ''}</div>
              <div style="font-size: 10px; color: #94a3b8; font-weight: normal; max-width: 110px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${p.title}">${p.title}</div>
            </th>
          `;
        }).join('')}
      </tr>
    </thead>
    <tbody>
  `;

  if (!aiResult?.specs_matrix?.length) {
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
            const isBase = p.id === selectedBaseSlot;
            const comp = row._comparisons ? row._comparisons[`slot_${p.id}`] : null;
            const rawVal = row[`slot_${p.id}`] || 'Não informada';
            const parenIdx = rawVal.indexOf(' (');
            const cleanVal = comp?.cleanValue || (parenIdx !== -1 ? rawVal.slice(0, parenIdx).trim() : rawVal.trim());

            let badgeHtml = '';
            let cellClass = '';

            if (isBase) {
              badgeHtml = `<div style="font-size: 9px; color: #38bdf8; font-weight: 700; margin-top: 2px;">★ Base</div>`;
              cellClass = 'base-col-cell';
            } else if (comp) {
              if (comp.status === 'equal') {
                badgeHtml = `<div style="font-size: 9px; color: #34d399; font-weight: 700; margin-top: 2px;">[${comp.badgeText}]</div>`;
                cellClass = 'bg-emerald-950/10';
              } else if (comp.status === 'missing') {
                badgeHtml = `<div style="font-size: 9px; color: #64748b; margin-top: 2px;">[${comp.badgeText}]</div>`;
              } else if (comp.badgeText.includes('Superior')) {
                badgeHtml = `<div style="font-size: 9px; color: #10b981; font-weight: 700; margin-top: 2px;">[${comp.badgeText}]</div>`;
                cellClass = 'bg-emerald-950/10';
              } else if (comp.badgeText.includes('Inferior') || comp.badgeText.includes('Alerta')) {
                badgeHtml = `<div style="font-size: 9px; color: #f43f5e; font-weight: 700; margin-top: 2px;">[${comp.badgeText}]</div>`;
                cellClass = 'disparity-cell';
              } else {
                badgeHtml = `<div style="font-size: 9px; color: #f59e0b; font-weight: 700; margin-top: 2px;">[${comp.badgeText}]</div>`;
                cellClass = 'disparity-cell';
              }
            } else {
              badgeHtml = `<div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">—</div>`;
            }

            return `
              <td class="${cellClass}" style="font-family: monospace;" title="${comp?.diffNote || ''}">
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

/**
 * =====================================================================
 * GERADOR EDITORIAL COMPARATIVO & INTEGRAÇÃO GEMINI IA
 * =====================================================================
 */

// Extrai Marca/Fabricante provável do slot
function extractBrandFromSlot(slot) {
  if (!slot) return 'Genérico / Não informado';
  const specs = slot.specs || {};
  for (const [k, v] of Object.entries(specs)) {
    if (/marca|fabricante|brand|manufacturer/i.test(k) && v) return v.trim();
  }
  const titleParts = (slot.title || '').split(/[\s\-–—|,]+/);
  if (titleParts.length > 0 && titleParts[0].length >= 3 && !/kit|conjunto|jogo|caderno|papel|par|pastilha|parafusadeira/i.test(titleParts[0])) {
    return titleParts[0];
  }
  return 'Não especificada';
}

// Unidades de volume reconhecidas para extração rápida
const VOLUME_UNIT_SET = new Set([
  'folha', 'folhas', 'fl', 'fls',
  'pagina', 'paginas', 'página', 'páginas', 'pag', 'pags', 'pg', 'pgs',
  'peca', 'pecas', 'peça', 'peças', 'pc', 'pcs', 'pç', 'pças',
  'item', 'itens',
  'un', 'unid', 'unids', 'unidade', 'unidades'
]);
const NUMBER_UNIT_MATCH_REGEX = /\b(\d+)\s*([a-zçáàâãéêíóôõú]+)/gi;
const BATTERY_UNIT_REGEX = /\b(\d+(?:\.\d+)?)\s*(mah|ah|v)\b/i;
const PERF_REGEX_1 = /gramatura|gsm|densidade|peso|papel|fibra|algod[aã]o|celulose/i;
const PERF_REGEX_2 = /pot[eê]ncia|torque|rpm|tens[aã]o|voltagem|chipset|processador/i;
const PERF_REGEX_3 = /mem[oó]ria|resolu[cç][aã]o|fluxo|capacidade|fric[cç][aã]o/i;
const EDITORIAL_GSM_REGEX = /\b(\d+)\s*(g\/?m[²2]?|gsm|g\b)/i;
const EDITORIAL_COTTON_REGEX = /\b(100%\s*algod[aã]o|puro\s*algod[aã]o|celulose|mista)\b/i;
const EDITORIAL_POWER_REGEX = /\b(\d+)\s*(w|v|nm|rpm|mah|ah)\b/i;

// Extrai Quantidade de Folhas/Páginas/Unidades/Volume
function extractVolumeFromSlot(slot) {
  if (!slot) return '1 Unidade';
  const fullText = `${slot.title || ''} ${JSON.stringify(slot.specs || {})}`;
  const matches = fullText.matchAll(NUMBER_UNIT_MATCH_REGEX);
  for (const match of matches) {
    if (VOLUME_UNIT_SET.has(match[2].toLowerCase())) {
      return `${match[1]} ${match[2]}`;
    }
  }
  const batteryMatch = BATTERY_UNIT_REGEX.exec(fullText);
  if (batteryMatch) {
    return `Autonomia: ${batteryMatch[1]}${batteryMatch[2]}`;
  }
  return '1 Unidade informada';
}

// Extrai Especificações Centrais de Performance
function extractPerformanceSpecsFromSlot(slot) {
  if (!slot) return 'Especificação padrão';
  const specs = slot.specs || {};
  const findings = [];
  
  for (const [k, v] of Object.entries(specs)) {
    if (PERF_REGEX_1.test(k) || PERF_REGEX_2.test(k) || PERF_REGEX_3.test(k)) {
      findings.push(`${k}: ${v}`);
    }
  }

  if (findings.length > 0) {
    return findings.slice(0, 3).join(' • ');
  }

  // Fallback via regex no título
  const title = slot.title || '';
  const gsmMatch = EDITORIAL_GSM_REGEX.exec(title);
  const cottonMatch = EDITORIAL_COTTON_REGEX.exec(title);
  const powerMatch = EDITORIAL_POWER_REGEX.exec(title);

  const fallbackParts = [];
  if (gsmMatch) fallbackParts.push(`Gramatura: ${gsmMatch[0]}`);
  if (cottonMatch) fallbackParts.push(`Composição: ${cottonMatch[0]}`);
  if (powerMatch) fallbackParts.push(`Potência/Elétrica: ${powerMatch[0]}`);

  return fallbackParts.length > 0 ? fallbackParts.join(' • ') : 'Desempenho padrão de catálogo';
}

// Extrai Qualidade, Construção e Acabamento
function extractQualityFinishFromSlot(slot) {
  if (!slot) return 'Acabamento comercial padrão';
  const specs = slot.specs || {};
  const findings = [];

  for (const [k, v] of Object.entries(specs)) {
    if (/capa|encaderna[cç][aã]o|costura|wire-o|espiral|revestimento|acabamento|material|carca[cç]a|estrutura|durabilidade|oem|posi[cç][aã]o/i.test(k)) {
      findings.push(`${k}: ${v}`);
    }
  }

  if (findings.length > 0) {
    return findings.slice(0, 2).join(' • ');
  }

  const title = (slot.title || '').toLowerCase();
  if (title.includes('capa dura') || title.includes('hardcover')) return 'Capa dura estruturada com encadernação firme';
  if (title.includes('lay-flat') || title.includes('costurado')) return 'Abertura plana 180° com costura reforçada';
  if (title.includes('brushless') || title.includes('sem escova')) return 'Motor Brushless de alta durabilidade e baixo atrito';
  if (title.includes('cer[aâ]mic') || title.includes('original')) return 'Composto de alta estabilidade e durabilidade estrutural';

  return 'Construção comercial padrão com acabamento convencional';
}

/**
 * Construtor Heurístico de Alta Qualidade do Relatório Editorial Comparativo (Fallback Dinâmico)
 * Estrutura rigorosamente as 3 seções obrigatórias
 */
function generateEditorialReportMarkdown(activeSlots, baseSlotId, specsMatrix, category) {
  const baseSlot = activeSlots.find(s => s.id === baseSlotId) || activeSlots[0];
  
  // 1. Identifica produtos e faixas de preço
  let minTotal = Infinity;
  let maxTotal = -Infinity;
  let minSlot = activeSlots[0];
  let maxSlot = activeSlots[0];

  activeSlots.forEach(s => {
    const tot = (s.price || 0) + (s.shipping || 0);
    if (tot < minTotal) {
      minTotal = tot;
      minSlot = s;
    }
    if (tot > maxTotal) {
      maxTotal = tot;
      maxSlot = s;
    }
  });

  const namesList = activeSlots.map(s => `**Slot ${s.id}** (${s.platform} - _${s.title.slice(0, 45)}..._)`).join(', ');

  // SEÇÃO 1: Introdução e Contexto
  let md = `### 1. Introdução e Contexto\n\n`;
  md += `Esta auditoria técnica comparativa avalia minuciosamente as propostas de valor entre ${namesList}, confrontando parâmetros de custo total, especificações de rendimento e robustez de construção para a categoria **${category}**.\n\n`;

  // SEÇÃO 2: Tabela: Comparativo Geral dos Produtos
  md += `### 2. Tabela: "Comparativo Geral dos Produtos"\n\n`;
  md += `| Slot / Item | Produto / Marca | Preço Médio (BRL) | Qtd. de Folhas / Páginas / Unidades | Especificações Centrais de Performance | Qualidade, Construção e Acabamento |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  activeSlots.forEach(s => {
    const total = (s.price || 0) + (s.shipping || 0);
    const brand = extractBrandFromSlot(s);
    const volume = extractVolumeFromSlot(s);
    const perf = extractPerformanceSpecsFromSlot(s);
    const finish = extractQualityFinishFromSlot(s);
    const isBase = s.id === baseSlotId;

    md += `| **Slot ${s.id}** (${s.platform})${isBase ? ' ★ Base' : ''} | **${brand}** - ${s.title.slice(0, 35)}... | \`${formatCurrency(total)}\` | ${volume} | ${perf} | ${finish} |\n`;
  });

  md += `\n`;

  // SEÇÃO 3: Análise Detalhada por Critérios (Dissecação em Prosa)
  md += `### 3. "Análise Detalhada por Critérios" (Dissecação em Prosa)\n\n`;

  // Faixa de Preço e Custo-Benefício
  md += `#### Faixa de Preço e Custo-Benefício\n`;
  if (minSlot.id === maxSlot.id) {
    md += `Os produtos avaliados operam em patamar de preço muito próximo (\`${formatCurrency(minTotal)}\`), de modo que a decisão de compra deve se basear exclusivamente na qualidade intrínseca dos materiais e na procedência do vendedor.\n\n`;
  } else {
    const diff = maxTotal - minTotal;
    const diffPct = minTotal > 0 ? Math.round((diff / minTotal) * 100) : 0;
    md += `O **Slot ${minSlot.id} (${minSlot.platform})** posiciona-se diretamente na faixa de entrada com desembolso total de **${formatCurrency(minTotal)}**, tornando-se a alternativa ideal para quem busca volume de produção ou uso despretensioso sem onerar o orçamento. Por outro lado, o **Slot ${maxSlot.id} (${maxSlot.platform})** atua no segmento premium/profissional a **${formatCurrency(maxTotal)}** (+${diffPct}% / +${formatCurrency(diff)}), salto de valor que se justifica pela entrega de maior rigor construtivo, certificações e estabilidade sob carga severa.\n\n`;
  }

  // Volume e Autonomia
  md += `#### Volume e Autonomia\n`;
  const volumes = activeSlots.map(s => `**Slot ${s.id}**: ${extractVolumeFromSlot(s)}`).join(' vs ');
  md += `Na comparação direta de capacidade e rendimento (${volumes}), nota-se que as opções de entrada buscam maximizar o retorno quantitativo por real investido, enquanto os modelos superiores priorizam a constância métrica e a preservação da integridade física durante ciclos extensos de uso.\n\n`;

  // Qualidade dos Materiais e Performance
  md += `#### Qualidade dos Materiais e Performance\n`;
  md += `A dissecação dos materiais revela distinções fundamentais de comportamento prático: enquanto o **Slot ${baseSlot.id}** (${baseSlot.platform}) assegura estabilidade técnica e resistência compatível com aplicações exigentes (suportando técnicas mistas, cargas térmicas ou fricção contínua), alternativas mais acessíveis servem com louvor para estudo, tarefas diárias e operação leve, mas demandam cautela contra deformações precoces quando expostas a estresse elevado.\n\n`;

  // Construção e Acabamento
  md += `#### Construção e Acabamento\n`;
  md += `No quesito integridade física e usabilidade, o **Slot ${baseSlot.id}** destaca-se pela solidez estrutural e refinamento ergonômico (garantindo abertura plana lay-flat, conexões seguras e durabilidade da carcaça). Os demais slots oferecem acabamentos funcionais para o dia a dia, sendo indispensável validar tolerâncias e encaixes antes de aplicações críticas.\n`;

  return md;
}

async function requestGeminiModel(modelName, promptText, apiKey) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: EDITORIAL_SYSTEM_INSTRUCTION }]
      },
      contents: [{
        parts: [{ text: promptText }]
      }],
      generationConfig: {
        temperature: 0.25,
      }
    })
  });

  if (response.ok) {
    const resJson = await response.json();
    const text = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text && text.trim().length > 0) {
      return { success: true, text: text.trim() };
    }
  }

  const errData = await response.json().catch(() => ({}));
  const errorMsg = errData?.error?.message || `HTTP ${response.status} em ${modelName}`;
  return { success: false, error: new Error(errorMsg) };
}

async function tryModelsSequentially(models, promptText, apiKey) {
  let lastError = null;
  const executeAttempt = async (index) => {
    if (index >= models.length) {
      throw lastError || new Error('Não foi possível obter resposta da API Gemini.');
    }
    const model = models[index];
    try {
      const result = await requestGeminiModel(model, promptText, apiKey);
      if (result.success) return result.text;
      lastError = result.error;
    } catch (err) {
      lastError = err;
    }
    return executeAttempt(index + 1);
  };
  return executeAttempt(0);
}

/**
 * Chamada Direta à API Google Gemini (via Fetch HTTP)
 */
async function callGeminiApiDirectly(activeSlots, baseSlotId, apiKey) {
  let promptText = `Gere o Relatório Editorial Comparativo estruturado estritamente nas 3 seções obrigatórias para os produtos abaixo:\n\n`;
  
  activeSlots.forEach(slot => {
    const specsText = slot.raw_specs || (slot.specs
      ? Object.entries(slot.specs).map(([k, v]) => `- ${k}: ${v}`).join('\n')
      : '');
    const isBase = slot.id === baseSlotId;
    const totalVal = ((slot.price || 0) + (slot.shipping || 0)).toFixed(2);
    promptText += `--- SLOT ${slot.id} (${slot.platform}) ${isBase ? '[SLOT BASE DE REFERÊNCIA]' : ''} ---\n`;
    promptText += `Título: ${slot.title || 'Sem título'}\n`;
    promptText += `Preço: R$ ${slot.price || 0} | Frete: R$ ${slot.shipping || 0} | Desembolso Total: R$ ${totalVal}\n`;
    promptText += `Ficha Técnica / Texto Bruto:\n${specsText || slot.title}\n\n`;
  });

  const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
  return tryModelsSequentially(modelsToTry, promptText, apiKey);
}

/**
 * Chamada ao Backend local se disponível (/api/ai-audit)
 */
async function callBackendEditorialApi(activeSlots, baseSlotId) {
  const res = await fetch('http://localhost:3000/api/ai-audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slots: currentSlots, baseSlotId, report_format: 'markdown' }),
  });

  if (!res.ok) throw new Error(`Backend retornou HTTP ${res.status}`);
  const json = await res.json();
  if (json.markdown_report) return json.markdown_report;
  if (json.data?.editorial_report_markdown) return json.data.editorial_report_markdown;
  if (json.data?.technical_verdict) return json.data.technical_verdict;
  throw new Error('Nenhum markdown retornado pelo backend');
}

/**
 * Renderizador de Markdown seguro (com marked.js ou fallback estruturado)
 */
function renderMarkdownContent(container, markdownText) {
  if (!container) return;
  try {
    if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
      container.innerHTML = marked.parse(markdownText);
      return;
    }
    if (typeof window !== 'undefined' && window.marked && typeof window.marked.parse === 'function') {
      container.innerHTML = window.marked.parse(markdownText);
      return;
    }
  } catch (err) {
    console.warn('Erro ao processar markdown com marked.js:', err);
  }
  container.innerHTML = formatMarkdownFallback(markdownText);
}

function applyInlineMarkdown(md) {
  return md
    .replace(/^### (.*$)/gim, '<h3 style="color:#38bdf8; font-size:13.5px; margin-top:14px; margin-bottom:8px; font-weight:700;">$1</h3>')
    .replace(/^#### (.*$)/gim, '<h4 style="color:#f59e0b; font-size:12.5px; margin-top:12px; margin-bottom:6px; font-weight:700;">$1</h4>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong style="color:#f8fafc; font-weight:700;">$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em style="color:#94a3b8;">$1</em>')
    .replace(/`([^`]+)`/gim, '<code style="background:#1e293b; color:#38bdf8; padding:1px 5px; border-radius:4px; font-family:monospace; font-size:11px;">$1</code>');
}

function renderTableRow(line, isHeader) {
  const cells = line.slice(1, -1).split('|').map(c => c.trim());
  const tag = isHeader ? 'th' : 'td';
  const cellStyle = isHeader
    ? 'padding:8px 10px; background:#1e293b; color:#38bdf8; font-weight:700; text-transform:uppercase; font-size:10.5px; border:1px solid #334155;'
    : 'padding:8px 10px; border:1px solid #1e293b; color:#e2e8f0; font-size:11.5px; vertical-align:top;';
  const cellHtml = cells.map(c => `<${tag} style="${cellStyle}">${c}</${tag}>`).join('');
  return `<tr>${cellHtml}</tr>`;
}

function createTableHtml(tableRows) {
  if (!tableRows.length) return '';
  return `<div class="table-wrapper" style="margin:12px 0 16px 0; overflow-x:auto;"><table style="width:100%; border-collapse:collapse; background:#090d16; border:1px solid #334155;">${tableRows.join('')}</table></div>`;
}

// Fallback manual de formatação Markdown caso a lib não esteja no escopo
function formatMarkdownFallback(md) {
  if (!md) return '';
  const html = applyInlineMarkdown(md);
  const lines = html.split('\n');
  const output = [];
  let tableRows = [];

  const flushTable = () => {
    if (tableRows.length > 0) {
      output.push(createTableHtml(tableRows));
      tableRows = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushTable();
      continue;
    }

    if (line.startsWith('|') && line.endsWith('|')) {
      if (!line.includes('---')) {
        const isHeader = tableRows.length === 0;
        tableRows.push(renderTableRow(line, isHeader));
      }
      continue;
    }

    flushTable();

    if (line.startsWith('<h3') || line.startsWith('<h4')) {
      output.push(line);
    } else {
      output.push(`<p style="margin-bottom:10px; color:#cbd5e1; line-height:1.65;">${line}</p>`);
    }
  }

  flushTable();
  return output.join('\n');
}

/**
 * Dispara e Gerencia a Geração e Renderização do Relatório Editorial
 */
async function generateAndRenderEditorialReport(forceRefresh = false) {
  const activeSlots = currentSlots.filter(s => s !== null);
  if (activeSlots.length < 2) return;

  const container = document.getElementById('verdictContent');
  if (!container) return;

  if (!forceRefresh && currentAIEditorialReport) {
    renderMarkdownContent(container, currentAIEditorialReport);
    return;
  }

  isGeneratingEditorial = true;
  container.innerHTML = `
    <div class="ai-loading-skeleton">
      <div style="font-size: 11px; color: #38bdf8; font-weight: 600; margin-bottom: 4px;">
        ✨ Gerando Relatório Editorial Comparativo com IA...
      </div>
      <div class="skeleton-line" style="width: 90%;"></div>
      <div class="skeleton-line" style="width: 75%;"></div>
      <div class="skeleton-line" style="width: 85%;"></div>
      <div class="skeleton-line" style="width: 60%;"></div>
    </div>
  `;

  try {
    let reportMarkdown = '';

    // 1. Tenta chamada direta à API Gemini se chave configurada
    if (geminiApiKey) {
      try {
        reportMarkdown = await callGeminiApiDirectly(activeSlots, selectedBaseSlot, geminiApiKey);
      } catch (geminiErr) {
        console.warn('Falha na chamada direta da API Gemini:', geminiErr);
      }
    }

    // 2. Se não tem chave direta ou falhou, tenta servidor local /api/ai-audit
    if (!reportMarkdown) {
      try {
        reportMarkdown = await callBackendEditorialApi(activeSlots, selectedBaseSlot);
      } catch (backendErr) {
        // Silencioso - fallback heurístico assume
      }
    }

    // 3. Se offline ou sem retorno remoto, gera síntese editorial aprofundada estruturada
    if (!reportMarkdown) {
      const category = detectCategoryDynamically(activeSlots);
      const specsMatrix = currentAIResult?.specs_matrix || [];
      reportMarkdown = generateEditorialReportMarkdown(activeSlots, selectedBaseSlot, specsMatrix, category);
    }

    currentAIEditorialReport = reportMarkdown;
    renderMarkdownContent(container, currentAIEditorialReport);
  } catch (err) {
    console.error('Erro na geração do relatório:', err);
    container.innerHTML = `<div style="color: #f43f5e; padding: 8px;">Erro ao gerar relatório editorial: ${err.message}</div>`;
  } finally {
    isGeneratingEditorial = false;
  }
}

// Copy Formatted Markdown Report to clipboard
function copyComparisonReport() {
  if (!currentAIEditorialReport) {
    const activeProducts = currentSlots.filter(s => s !== null);
    if (activeProducts.length >= 2) {
      const category = detectCategoryDynamically(activeProducts);
      const specsMatrix = currentAIResult?.specs_matrix || [];
      currentAIEditorialReport = generateEditorialReportMarkdown(activeProducts, selectedBaseSlot, specsMatrix, category);
    }
  }

  if (!currentAIEditorialReport) {
    showStatus('Nenhum relatório disponível para cópia!', 'warning');
    return;
  }

  navigator.clipboard.writeText(currentAIEditorialReport).then(() => {
    showStatus('Relatório formatado em Markdown copiado com sucesso!', 'success');
    const btn = document.getElementById('btnCopyReport');
    if (btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = '✅ Copiado!';
      setTimeout(() => {
        btn.innerHTML = originalText;
      }, 2500);
    }
  }).catch((err) => {
    showStatus('Erro ao copiar relatório: ' + err.message, 'error');
  });
}

// Show banner status
function showStatus(message, type = 'info') {
  const el = document.getElementById('statusMessage');
  if (!el) return;
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

