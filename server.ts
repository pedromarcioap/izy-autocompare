import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

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

// Endpoint: Dynamic AI Specification Extraction & Cross-Audit
app.post('/api/ai-audit', async (req, res) => {
  try {
    const { slots } = req.body;

    if (!slots || !Array.isArray(slots) || slots.filter(Boolean).length === 0) {
      return res.status(400).json({ error: 'Nenhum slot fornecido para auditoria.' });
    }

    const activeSlots = slots.filter(Boolean);

    // Build context prompt with the raw texts of all active slots
    let slotsPromptText = '';
    activeSlots.forEach((slot: any) => {
      const specsText = slot.specs
        ? Object.entries(slot.specs)
            .map(([k, v]) => `- ${k}: ${v}`)
            .join('\n')
        : '';

      slotsPromptText += `\n--- SLOT ${slot.id} (${slot.platform}) ---
Título: ${slot.title || 'Sem título'}
Preço: R$ ${slot.price || 0} | Frete: R$ ${slot.shipping || 0}
Texto / Ficha Técnica Bruta:
${specsText || slot.rawText || 'Nenhuma especificação bruta informada'}
`;
    });

    const systemInstruction = `Você é um motor analítico e agnóstico de extração de dados e auditoria técnica para e-commerce.
Sua missão é extrair DINAMICAMENTE todas as propriedades e especificações técnicas encontradas nos anúncios dos slots, sem nenhuma categoria ou lista pré-fixada. Funcione para QUALQUER produto (ferramentas, vestuário, eletrônicos, cosméticos, papelaria, automotivo, etc.).

Execute o processo em 3 etapas estritas:
Etapa 1 - Mineração e Fusão: Varrer o texto bruto de todos os slots preenchidos e extrair todas as propriedades técnicas informadas.
Etapa 2 - Normalização Semântica de Vocabulário: Mapear termos sinônimos para um nome limpo e comum (ex: "Torque máximo" vs "Força de aperto" -> "Torque", "Composição do tecido" vs "Material" -> "Composição", "Volume líquido" vs "Conteúdo" -> "Volume").
Etapa 3 - Confronto Cruzado Tendo o Slot 1 como Parâmetro:
  - Para cada linha gerada dinamicamente:
    * Defina "slot_1_value" com o valor do Slot 1 (ou "Não informado" se ausente).
    * Compare os Slots 2, 3, 4 e 5 contra o Slot 1.
    * Status permitido para cada slot comparado:
      - "equal": Se a especificação for idêntica ou equivalente direta ao Slot 1.
      - "divergent": Se houver diferença técnica, numérica ou de recurso em relação ao Slot 1.
      - "missing": Se o vendedor daquele slot não informou o dado.

Gere SEMPRE um JSON válido conforme o esquema solicitado.`;

    const prompt = `Analise os seguintes produtos capturados nos slots e gere a matriz dinâmica de confronto técnico tendo o Slot 1 como referência:

${slotsPromptText}

Retorne estritamente o JSON no seguinte formato:
{
  "detected_category": "Categoria inferida automaticamente (ex: Ferramentas Elétricas, Cosméticos, Vestuário, etc.)",
  "comparison_matrix": [
    {
      "attribute_name": "Nome dinâmico da especificação normalizada",
      "slot_1_value": "Valor no Slot 1 (Base)",
      "comparisons": {
        "slot_2": { "value": "Valor no Slot 2", "status": "equal" | "divergent" | "missing" },
        "slot_3": { "value": "Valor no Slot 3", "status": "equal" | "divergent" | "missing" },
        "slot_4": { "value": "Valor no Slot 4", "status": "equal" | "divergent" | "missing" },
        "slot_5": { "value": "Valor no Slot 5", "status": "equal" | "divergent" | "missing" }
      }
    }
  ],
  "executive_summary": "Duas frases diretas resumindo qual slot oferece o melhor conjunto de especificações técnicas reais frente ao preço cobrado."
}`;

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
      error: error.message || 'Falha ao processar auditoria com IA.',
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
