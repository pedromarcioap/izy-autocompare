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
      const specsText = slot.specs
        ? Object.entries(slot.specs)
            .map(([k, v]) => `- ${k}: ${v}`)
            .join('\n')
        : '';

      slotsPromptText += `\n--- SLOT ${slot.id} (${slot.platform}) ${slot.id === baseSlotId ? '[SLOT BASE DE REFERÊNCIA]' : ''} ---
Título: ${slot.title || 'Sem título'}
Preço: R$ ${slot.price || 0} | Frete: R$ ${slot.shipping || 0}
Texto / Ficha Técnica Bruta:
${specsText || slot.rawText || 'Nenhuma especificação bruta informada'}
`;
    });

    const systemInstruction = `Você é um motor analítico de inteligência artificial para comparação cruzada técnica e de preços de múltiplos produtos em e-commerce (até 5 slots).

Regras de Operação:
1. Agnosticismo Total: Não use categorias ou listas estáticas pré-fixadas. Extraia dinamicamente apenas o que os anúncios informam (qualquer nicho: ferramentas, cosméticos, vestuário, eletrônicos, etc.).
2. Normalização Semântica de Vocabulário: Una termos sinônimos sob o mesmo atributo padronizado.
3. Comparação Cruzada Entre Cada Slot:
   - O Slot ${baseSlotId} é o Slot Base de Referência.
   - Para CADA atributo encontrado:
     * Extraia o valor de cada slot (Slot 1 ao Slot 5) ou preencha com "Não informado" se ausente.
     * Compare cada slot contra a Base (Slot ${baseSlotId}):
       - "base": para o próprio slot base.
       - "equal": se o valor for idêntico ou equivalente técnico direto.
       - "divergent": se houver diferença de especificações técnicas, potência, versão, volume, etc.
       - "missing": se o dado não foi informado no anúncio.
     * Gere uma análise cruzada (cross_analysis) identificando quais slots são idênticos entre si e quais divergem.
4. Resumo Executivo: Confronte os prós e contras técnicos de cada slot frente ao preço total cobrado.`;

    const prompt = `Analise e execute a comparação cruzada de todas as especificações técnicas entre os seguintes produtos capturados nos slots:

${slotsPromptText}

Slot Base Selecionado: Slot ${baseSlotId}

Retorne estritamente um JSON no seguinte formato:
{
  "detected_category": "Categoria inferida automaticamente (ex: Ferramentas Elétricas, Cosméticos, Vestuário, etc.)",
  "base_slot_id": ${baseSlotId},
  "comparison_matrix": [
    {
      "attribute_name": "Nome dinâmico da especificação normalizada",
      "slot_1_value": "Valor no Slot 1",
      "slot_values": {
        "slot_1": "Valor no Slot 1 ou Não informado",
        "slot_2": "Valor no Slot 2 ou Não informado",
        "slot_3": "Valor no Slot 3 ou Não informado",
        "slot_4": "Valor no Slot 4 ou Não informado",
        "slot_5": "Valor no Slot 5 ou Não informado"
      },
      "comparisons": {
        "slot_1": { "value": "Valor", "status": "base | equal | divergent | missing", "diffNote": "Nota breve" },
        "slot_2": { "value": "Valor", "status": "base | equal | divergent | missing", "diffNote": "Nota breve" },
        "slot_3": { "value": "Valor", "status": "base | equal | divergent | missing", "diffNote": "Nota breve" },
        "slot_4": { "value": "Valor", "status": "base | equal | divergent | missing", "diffNote": "Nota breve" },
        "slot_5": { "value": "Valor", "status": "base | equal | divergent | missing", "diffNote": "Nota breve" }
      },
      "cross_analysis": {
        "identical_groups": ["Slot 1 e Slot 3 são idênticos"],
        "divergences": ["Slot 2 é 17 Nm menor que a base"],
        "has_disparity": true,
        "winner_slot": 1
      }
    }
  ],
  "executive_summary": "Duas a três frases confrontando detalhadamente as diferenças técnicas e o custo-benefício de cada slot em relação aos outros."
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
