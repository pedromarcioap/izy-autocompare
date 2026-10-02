import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
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

    const systemInstruction = `Você é um Auditor Técnico Especialista em Produtos e E-commerce.
Sua missão é analisar os dados de até 5 produtos capturados nos slots (Slot 1 a Slot 5) e gerar um relatório comparativo rigoroso.

DIRETRIZES DE AUDITORIA:
1. Extração Dinâmica e Agnóstica: O produto pode ser qualquer coisa (artigos de arte, hardware, roupas, ferramentas, papelaria, etc.). Não use esquemas pré-fixados.
2. Fallback por Título: Se o campo 'raw_specs' de algum slot contiver apenas o título ou pouca informação, EXTRAIA AS ESPECIFICAÇÕES DIRETAMENTE DO TÍTULO (ex.: gramatura '180GSM', composição '50% Cotton', encadernação 'Hardcover', dimensões 'A5 / 8.3x5.9in', número de folhas/páginas, voltagem, torque, etc.).
3. Matriz Canônica (Chave a Chave):
   - Crie uma linha para cada propriedade relevante encontrada (ex.: Dimensões/Tamanho, Gramatura/Espessura, Material/Composição da Fibra, Quantidade de Folhas/Páginas, Tipo de Encadernação/Capa, Indicação de Uso, etc.).
   - O Slot 1 é SEMPRE a base de referência.
   - Para os Slots 2, 3, 4 e 5, preencha o valor correspondente e classifique na própria string como:
     * [Idêntico]: Especificação equivalente ou igual ao Slot 1.
     * [Divergente]: Especificação diferente (indicar se é superior, inferior ou alternativa).
     * [Não informado]: Quando não houver dado disponível nem no título nem no texto.
4. Veredito Técnico e Comercial:
   - Aponte "falsos matches" de preço baixo (ex.: o Slot X é muito mais barato porque usa papel fino de 70g ou apenas 30 folhas, enquanto o Slot 1 oferece 180g com 50% algodão).
   - Destaque o real campeão de custo-benefício técnico.

FORMATO DE RETORNO OBRIGATÓRIO (JSON PURO):
{
  "category": "Nome da categoria inferida",
  "reference_slot": 1,
  "specs_matrix": [
    {
      "attribute": "Nome da Especificação (ex: Gramatura)",
      "slot_1": "180 g/m²",
      "slot_2": "Não informada (Inferior)",
      "slot_3": "180 g/m² (Idêntico)",
      "slot_4": "Não informada",
      "slot_5": "160 g/m² (Ligeiramente inferior)"
    }
  ],
  "technical_verdict": "Texto de 2 a 3 frases explicando as armadilhas de preço e qual oferece a melhor especificação técnica real."
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

startServer();
