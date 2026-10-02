import { ProductInput } from '../types/audit';

export interface SamplePreset {
  id: string;
  title: string;
  description: string;
  category: string;
  product1: ProductInput;
  product2: ProductInput;
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'tws-earbuds',
    title: 'Fones Bluetooth TWS: ANC Avançado vs Modelo Básico',
    description: 'QCY T13 ANC com cancelamento ativo de 28dB vs Fone TWS básico estéreo',
    category: 'Áudio & Gadgets',
    product1: {
      name: 'Fone TWS QCY T13 ANC com Cancelamento Ativo de Ruído',
      price: '79.90',
      shipping: '0.00',
      platform: 'Shopee',
      rawText: `- Versão Bluetooth: 5.3 (Ultra baixa latência 68ms)
- Cancelamento Ativo de Ruído (ANC): Sim, até 28dB de atenuação
- Modo Transparência: Sim, capta voz externa sem tirar o fone
- Drivers de Áudio: 10mm Bio-diafragma Dinâmico
- Microfones: 4 Microfones com tecnologia ENC (redução de ruído em chamadas)
- Capacidade da Bateria dos Fones: 45mAh cada
- Capacidade do Estojo de Carregamento: 380mAh
- Autonomia de Reprodução: 7 horas contínuas (ANC desligado) / 5.5 horas (ANC ligado)
- Autonomia Total com Estojo: Até 30 horas
- Conector de Carregamento: USB Tipo-C (Carga Rápida: 10 min = 60 min de música)
- Resistência à Água: Certificação IPX5 (proteção contra suor e respingos de chuva)
- Controle por Toque: Sim (Play/Pause, Faixas, Volume, Ativar ANC, Assistente de Voz)
- Aplicativo Dedicado: Sim (QCY App com equalizador de 10 bandas e customização de toques)
- Peso de cada fone: 4.2g
- Compatibilidade: Android, iOS, Windows e macOS
- Garantia do Fabricante: 6 meses`,
    },
    product2: {
      name: 'Fone Bluetooth Sem Fio TWS Básico Estéreo Pro',
      price: '34.50',
      shipping: '14.90',
      platform: 'AliExpress',
      rawText: `Especificações do Produto:
* Conexão Bluetooth 5.0
* Cancelamento de Ruído: Passivo apenas (borrachinhas de silicone intra-auricular)
* Modo Transparência: Não possui
* Driver de som: 8mm estéreo
* Microfone: 1 microfone embutido básico
* Bateria do fone: 30mAh
* Bateria da case: 250mAh
* Duração da bateria: cerca de 3 a 4 horas de uso contínuo
* Tempo total com estojo: aproximadamente 12 a 14 horas
* Entrada de carregamento: Micro-USB
* Proteção contra água: IPX4 (respingos leves)
* Botão de controle: Botão de toque simples (play/pause)
* Suporte a App: Não possui aplicativo
* Peso: 4.8g
* Garantia: 30 dias do vendedor`,
    },
  },
  {
    id: 'power-bank',
    title: 'Power Bank 10.000mAh: Carregamento Rápido 22.5W vs Padrão 10W',
    description: 'Bateria portátil Baseus 22.5W PD USB-C vs Power Bank Genérico 10W',
    category: 'Acessórios & Energia',
    product1: {
      name: 'Power Bank Baseus Bipow Pro 10000mAh 22.5W Fast Charge PD/QC',
      price: '119.00',
      shipping: '0.00',
      platform: 'AliExpress',
      rawText: `Especificações Técnicas:
- Capacidade Nominal: 10.000mAh / 3.7V (37Wh)
- Potência Máxima de Saída: 22.5W
- Protocolos Suportados: Power Delivery 3.0 (PD), Quick Charge 3.0 (QC3.0), AFC, FCP, SCP
- Portas de Saída: 2x USB-A (até 22.5W) + 1x USB-C Bidirecional (até 20W PD)
- Portas de Entrada: USB-C (18W PD) para recarga ultrarrápida da bateria
- Display: Visor Digital LED com porcentagem exata da bateria (0-100%)
- Tempo de Recarga do Power Bank: Aprox. 2.8 horas com carregador 18W
- Proteções de Segurança: Proteção contra sobretensão, sobrecorrente, curto-circuito e superaquecimento (NTC)
- Homologação / Certificação: CE, FCC, RoHS
- Material do Corpo: Policarbonato antichamas + ABS fosco texturizado
- Dimensões: 132 x 62 x 19 mm
- Peso: 200g
- Garantia: 12 meses`,
    },
    product2: {
      name: 'Carregador Portátil Slim 10.000mAh Básico com Cabo Embutido',
      price: '59.90',
      shipping: '12.00',
      platform: 'Shopee',
      rawText: `Ficha Técnica:
- Capacidade: 10.000mAh
- Potência de saída: 10W Máximo (5V / 2.1A)
- Protocolo de carregamento rápido: Não suporta Fast Charge / Sem PD
- Saídas: 2 portas USB-A normais (5V 2A) + cabos embutidos
- Entrada de carga: Micro USB e Tipo-C básica (5V 2A - 10W)
- Indicador de bateria: 4 LEDs luminosos simples (25%, 50%, 75%, 100%)
- Tempo para recarregar o aparelho: Cerca de 6 a 7 horas
- Material: Plástico rígido
- Proteção: Placa controladora básica
- Dimensões: 140 x 70 x 20 mm
- Peso: 235g
- Garantia: 3 meses`,
    },
  },
  {
    id: 'smartwatch',
    title: 'Smartwatch Fitness: Tela AMOLED + GPS vs Tela TFT Básico',
    description: 'Relógio esportivo com GPS integrado e Alexa vs Smartwatch básico com bluetooth call',
    category: 'Wearables & Relógios',
    product1: {
      name: 'Smartwatch Amazfit Active Edge GPS Integrado Tela AMOLED 1.32"',
      price: '489.00',
      shipping: '0.00',
      platform: 'Mercado Livre',
      rawText: `- Tipo de Tela: AMOLED Ultra HD de 1.32 polegadas (Resolução 390x390, 326 PPI)
- Brilho da Tela: Até 1000 nits com ajuste automático e Always-on Display (AOD)
- Localização e GPS: GPS Integrado com 5 sistemas de posicionamento por satélite (GNSS)
- Sensores de Saúde: BioTracker PPG óptico (Frequência Cardíaca 24h, Oxigenação SpO2, Estresse e Sono REM)
- Modos Esportivos: 130+ modalidades esportivas com reconhecimento automático de treino
- Resistência à Água: 10 ATM (100 metros de profundidade, indicado para natação e mergulho)
- Autonomia da Bateria: Até 16 dias de uso típico / 24 dias em modo econômico / 20 horas em GPS contínuo
- Bateria: 370mAh de polímero de lítio
- Conectividade: Bluetooth 5.2 BLE + Wi-Fi 2.4GHz
- Notificações e Chamadas: Notificações de apps e controle de câmera/música
- Compatibilidade: Zepp OS 3.0 (Android 7.0+ / iOS 14.0+)
- Material: Caixa de polímero de alta resistência e pulseira de silicone hipoalergênica
- Peso: 34g (sem pulseira)
- Garantia: 12 meses oficial`,
    },
    product2: {
      name: 'Smartwatch D20 / Y68 Pro Monitor Cardíaco e Passômetro',
      price: '39.90',
      shipping: '15.00',
      platform: 'Shopee',
      rawText: `Especificações:
* Tela: LCD TFT de 1.3 polegadas (Resolução 240x240 pixels)
* Brilho: Fixo manual sem Always-on
* GPS: Não tem GPS integrado (utiliza GPS do celular se conectado)
* Sensores: Sensor de batimentos cardíacos simples e contador de passos
* Modos de exercício: 3 modos (Caminhada, Corrida, Pular Corda)
* Resistência à água: IP67 resistente apenas a respingos do dia a dia (não pode mergulhar nem tomar banho)
* Bateria: 150mAh
* Duração da bateria: 2 a 3 dias de uso moderado / 5 dias em standby
* Conexão: Bluetooth 4.0
* Carregamento: Direto no USB do relógio (sem cabo)
* Aplicativo: FitPro
* Material: Plástico ABS e pulseira de TPU
* Peso: 45g
* Garantia: 30 dias`,
    },
  },
  {
    id: 'charger-gan',
    title: 'Carregador de Parede: GaN 65W 3 Portas vs Carregador 20W Standard',
    description: 'Tecnologia GaN III para Notebooks e Celulares vs Carregador padrão 20W',
    category: 'Acessórios & Energia',
    product1: {
      name: 'Carregador Turbo GaN III 65W Fast Charger 3 Portas (2x USB-C + 1x USB-A)',
      price: '135.00',
      shipping: '0.00',
      platform: 'AliExpress',
      rawText: `- Tecnologia: Nitreto de Gálio (GaN III Pro) de alta eficiência energética
- Potência Total de Saída: 65W Max
- Portas: 2x USB-C + 1x USB-A
- Saída USB-C1 / C2: 5V/3A, 9V/3A, 12V/3A, 15V/3A, 20V/3.25A (65W Max PD 3.0)
- Suporte a Notebook: Sim, carrega MacBook Pro/Air, Dell XPS, Lenovo ThinkPad e tablets
- Protocolos de Carregamento: PD3.0, QC4+, QC3.0, PPS (3.3V-11V/3A), SCP 22.5W, AFC
- Bivolt Automático: 100V-240V ~ 50/60Hz 1.5A
- Proteções: Controle inteligente de temperatura BCT, proteção contra sobretensão e sobrecarga
- Tamanho: 63.5 x 36 x 32 mm (40% menor que carregadores padrão de 65W)
- Peso: 110g
- Certificações: Anatel / CE / FCC
- Garantia: 12 meses`,
    },
    product2: {
      name: 'Fonte Carregador 20W USB-C Compatível com iPhone e Android',
      price: '38.00',
      shipping: '9.90',
      platform: 'Shopee',
      rawText: `Informações do Produto:
* Tecnologia: Carregador com transformador de silício comum
* Potência Máxima: 20W
* Portas de Saída: 1 porta USB-C apenas
* Saída de energia: 5V/3A ou 9V/2.22A (20W PD)
* Compatibilidade com Notebook: Não suporta carregamento de notebooks (potência insuficiente)
* Protocolos: Power Delivery 20W padrão
* Voltagem: Bivolt 110V/220V
* Proteção: Fusível interno básico
* Dimensões: 78 x 42 x 28 mm
* Peso: 65g
* Garantia: 90 dias`,
    },
  },
];
