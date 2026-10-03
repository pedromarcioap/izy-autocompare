import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();

// Disable the X-Powered-By header to avoid disclosing the Express version.
app.disable('x-powered-by');

const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI client (server-side only)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint: Dynamic Multi-Slot Cross-Audit API
app.post('/api/ai-audit', async (req, res) => {
  try {
    const { slots, baseSlotId = 1 } = req.body;

    if (!slots || !Array.isArray(slots) || slots.filter(Boolean).length === 0) {
      return res.status(400).json({ error: 'Nenhum slot fornecido para auditoria.' });
    }

    const activeSlots = slots.filter(Boolean);

    // Build context prompt with the raw texts of all active slots
    let slotsPromptText = '';
    activeSlots.forEach((slot: any) => {
      const specsText = slot.raw_specs || (slot.specs
        ? Object.entries(slot.specs)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join('\n')
        : '');

      slotsPromptText += `\n--- SLOT ${slot.id} (${slot.platform}) ${slot.id === baseSlotId ? '[SLOT BASE DE REFERÊNCIA]' : ''} ---
Título: ${slot.title || 'Sem título'}
Preço: R$ ${slot.price || 0} | Frete: R$ ${slot.shipping || 0}
Ficha Técnica / Texto Bruto (raw_specs):
${specsText || slot.title || 'Nenhuma especificação informada'}
`;
    });

    const systemInstruction = `Você é um Auditor Técnico Especialista em Produtos, Autopeças e E-commerce.
Sua missão é analisar rigorosamente os dados de produtos capturados em até 5 slots (Slot 1 a Slot 5) e gerar um relatório comparativo técnico e financeiro estruturado.

DIRETRIZES DE AUDITORIA (100% DINÂMICAS E MUTÁVEIS):
1. Extração Dinâmica e Agnóstica de Categoria:
   - Os produtos podem pertencer a QUALQUER categoria: Veículos & Autopeças (pastilhas, amortecedores, velas, filtros, etc.), Papelaria & Livros (cadernos, papéis, sketchbooks), Ferramentas Elétricas/Manuais, Hardware & Informática, Áudio, Vestuário, etc.
   - NUNCA assuma esquemas pré-fixados de uma única categoria. Adapte as especificações e o vocabulário à categoria real dos produtos analisados.

2. Extração Minuciosa do Título e Descrição:
   - Se a ficha técnica (raw_specs) for sucinta, extraia ativamente todas as especificações presentes no título e no texto.
   - Exemplos em Autopeças: Modelo/Veículo compatível (ex: Gol G5, Civic, Corolla), Faixa de Anos (ex: 2008 a 2014), Posição/Lado de montagem (Dianteiro, Traseiro, Par), Código OEM/Part Number, Fabricante da peça (Bosch, Fras-le, Cofap), Material (Cerâmica, Semi-metálica), etc.
   - Exemplos em Papelaria: Gramatura (180g/m², 300g), Quantidade de folhas/páginas (50 folhas, 100 fls), Formato (A4, A5), Tipo de capa (Capa dura, Espiral), Composição da fibra (100% algodão, celulose), etc.
   - Exemplos em Outras Categorias: Tensão/Voltagem, Torque, Bateria, Potência, Garantia, Dimensões, etc.

3. Matriz Canônica (Chave a Chave):
   - Crie uma linha para cada propriedade técnica relevante identificada entre os anúncios.
   - O Slot ${baseSlotId} é a BASE DE REFERÊNCIA de confronto.
   - Para cada um dos slots avaliados, preencha o valor e classifique a relação vs o Slot ${baseSlotId} como:
     * [Idêntico]: Especificação tecnicamente equivalente ao Slot Base.
     * [Superior (+)]: Especificação quantitativa ou qualitativa superior (ex: maior garantia, mais folhas, maior torque, material nobre).
     * [Inferior (-)]: Especificação inferior (ex: menor durabilidade, menor garantia, menos peças).
     * [Divergente]: Especificação diferente ou incompatível (ex: compatível com veículo diferente, posição traseira vs dianteira, cor diferente).
     * [Não informado]: Quando o vendedor não informar o atributo.

4. Veredito Técnico e Comercial Contextualizado:
   - Identifique armadilhas de preço baixo (ex.: Slot X é mais barato por ter material inferior, omitir código OEM, oferecer menos unidades/folhas ou ter menor período de garantia).
   - Indique se a opção de menor custo é uma compra segura (equivalente) ou se exige cautela técnica.
   - Em autopeças, reforce a importância da compatibilidade de modelo, ano e posição antes da compra.

FORMATO DE RETORNO OBRIGATÓRIO (JSON PURO):
{
  "category": "Nome exato da categoria identificada (ex: Veículos & Autopeças, Papelaria & Artigos de Arte, etc.)",
  "reference_slot": ${baseSlotId},
  "specs_matrix": [
    {
      "attribute": "Nome da Especificação (ex: Compatibilidade / Veículos ou Gramatura / Espessura)",
      "slot_1": "Valor do Slot 1",
      "slot_2": "Valor do Slot 2 (Classificação)",
      "slot_3": "Valor do Slot 3 (Classificação)",
      "slot_4": "Valor do Slot 4",
      "slot_5": "Valor do Slot 5"
    }
  ],
  "technical_verdict": "Veredito técnico de 2 a 3 frases apontando claramente as divergências do produto mais barato vs o Slot Base e qual oferece o melhor custo-benefício real."
}`;

    const prompt = `Analise detalhadamente os dados dos seguintes produtos capturados nos slots e gere a matriz de confronto técnico e financeiro:

${slotsPromptText}

Gere o JSON rigorosamente estruturado conforme as instruções.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const jsonText = response.text?.trim() || '{}';
    const parsedData = JSON.parse(jsonText);

    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Error in /api/ai-audit:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Falha ao processar auditoria cruzada com IA.',
    });
  }
});

// Vite Middleware for SPA serving in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

await startServer();
