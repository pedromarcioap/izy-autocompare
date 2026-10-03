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

    const systemInstruction = `Você é um Auditor Técnico Especialista em Produtos, Autopeças e E-commerce de Alta Precisão.
Sua missão é interpretar profundamente o conteúdo técnico de até 5 produtos capturados em slots (Slot 1 a Slot 5) e gerar um relatório comparativo estruturado, inter-relacionando as especificações de cada produto.

DIRETRIZES DE INTERPRETAÇÃO E INTER-RELAÇÃO (DINÂMICAS E MULTI-CATEGORIA):
1. Normalização Semântica e Cruzamento Inteligente:
   - Produtos podem usar termos diferentes para o mesmo conceito (ex: "Mandril 3/8" vs "10mm sem chave", "Motor Brushless" vs "Sem escovas de carvão", "2000mAh" vs "2.0Ah", "100% algodão" vs "Puro algodão", "Dianteiro" vs "Frontal").
   - Inter-relacione e unifique esses conceitos sob um mesmo "attribute_name" padronizado.
   - Agrupe as especificações em categorias temáticas naturais (ex: "Desempenho & Potência", "Alimentação & Bateria", "Construção & Dimensões", "Compatibilidade & Aplicação", "Acessórios & Embalagem", "Garantia & Procedência").

2. Interpretação Técnica e Análise de Relação (ai_interpretation):
   - Para CADA especificação identificada, forneça uma análise inteligente (ai_interpretation) explicando o relacionamento prático entre os produtos (ex: por que um é melhor, se são 100% equivalentes, ou se há risco de incompatibilidade).
   - Indique o vencedor da especificação (winner_slot) quando aplicável.
   - Indique o impacto prático (practical_impact) no dia a dia do usuário.

3. Classificação Rigorosa vs Slot Base (Slot ${baseSlotId}):
   - Slot ${baseSlotId} é a BASE DE REFERÊNCIA de confronto.
   - Para cada slot avaliado vs a Base, defina status:
     * "base": Para o próprio Slot ${baseSlotId}.
     * "equal": Tecnologicamente equivalente ou idêntico ao Slot Base.
     * "superior": Especificação quantitativa ou qualitativa superior (ex: maior autonomia, material cerâmico vs orgânico, maior garantia, motor brushless).
     * "inferior": Especificação inferior ao Slot Base (ex: menor capacidade, menor potência, menor garantia).
     * "divergent": Especificação divergente que afeta compatibilidade ou propósito (ex: ano de veículo diferente, posição traseira vs dianteira, tipo de encaixe).
     * "missing": Quando o atributo não foi informado pelo vendedor.

4. Detecção Ativa de Armadilhas Comerciais e Vantagens (key_findings):
   - Destaque se o produto mais barato economiza em peças essenciais (ex: vende apenas 2 pastilhas em vez de 4, bateria menor, ausência de carregador, garantia de 90 dias vs 12 meses).
   - Identifique riscos de incompatibilidade veicular ou técnica.

FORMATO DE RETORNO OBRIGATÓRIO (JSON PURO E VÁLIDO):
{
  "category": "Nome da Categoria Detectada (ex: Veículos & Autopeças, Ferramentas Elétricas, Papelaria & Arte)",
  "reference_slot": ${baseSlotId},
  "key_findings": {
    "top_advantages": [
      { "slot_id": 1, "title": "Vantagem Marcante", "detail": "Explicação objetiva da superioridade técnica" }
    ],
    "critical_warnings": [
      { "title": "Alerta de Armadilha / Incompatibilidade", "detail": "Detalhes sobre o risco ou divergência", "affected_slots": [3] }
    ],
    "convergences": [
      "Pontos em que os produtos são 100% equivalentes"
    ]
  },
  "comparison_matrix": [
    {
      "id": "spec_1",
      "category": "Desempenho & Potência",
      "attribute_name": "Nome Padronizado da Especificação",
      "description": "Breve explicação do atributo",
      "slot_values": {
        "slot_1": "Valor extraído do Slot 1",
        "slot_2": "Valor extraído do Slot 2",
        "slot_3": "Valor extraído do Slot 3",
        "slot_4": "Valor extraído do Slot 4",
        "slot_5": "Valor extraído do Slot 5"
      },
      "comparisons": {
        "slot_1": {
          "value": "Valor formatado",
          "status": "base",
          "statusLabel": "Base de Referência",
          "diffNote": "Referência inicial",
          "isAdvantage": false
        },
        "slot_2": {
          "value": "Valor formatado",
          "status": "superior",
          "statusLabel": "Superior (+50% torque)",
          "diffNote": "+15 Nm a mais de torque",
          "isAdvantage": true
        }
      },
      "ai_interpretation": {
        "summary": "Explicação técnica da IA inter-relacionando os produtos neste item.",
        "winner_slot": 2,
        "practical_impact": "Permite perfurar materiais mais densos sem travamento do motor.",
        "severity": "high"
      }
    }
  ],
  "scores_by_slot": [
    {
      "slot_id": 1,
      "advantages_count": 2,
      "draws_count": 3,
      "disadvantages_count": 1,
      "missing_count": 0
    }
  ],
  "technical_verdict": "Veredito técnico de 2 a 4 frases avaliando se a economia financeira compensa tecnicamente ou se há armadilhas.",
  "executive_summary": "Resumo executivo completo das correlações."
}`;

    const prompt = `Interprete profundamente os dados dos produtos abaixo, inter-relacione todas as especificações e gere a matriz comparativa:

${slotsPromptText}

Gere o JSON estritamente estruturado e detalhado conforme as instruções.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
