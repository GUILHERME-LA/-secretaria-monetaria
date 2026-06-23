import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { generateInsights } from "@/lib/insights-engine";
import type { Insight } from "@/lib/insights-engine";

const OLLAMA_CLOUD_URL = "https://ollama.com/api/chat";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3:8b-cloud";

function buildPrompt(data: {
  receitas: number;
  despesas: number;
  variacaoReceitas: number | null;
  variacaoDespesas: number | null;
  pieData: { nome: string; valor: number }[];
  recentMonths: { mes: string; receitas: number; despesas: number }[];
}): string {
  const saldo = data.receitas - data.despesas;
  const proporcao = data.receitas > 0 ? Math.round((data.despesas / data.receitas) * 100) : 0;
  const mesesRestantes = 12 - (new Date().getMonth() + 1);
  const projecaoEconomia = saldo > 0 ? `Se mantiver este ritmo, em ${mesesRestantes} meses pode acumular R$ ${(saldo * mesesRestantes).toFixed(2)}.` : "";

  let detalheCategorias = "";
  if (data.pieData.length > 0 && data.despesas > 0) {
    detalheCategorias = data.pieData
      .map((c) => {
        const pct = Math.round((c.valor / data.despesas) * 100);
        return `  - ${c.nome}: R$ ${c.valor.toFixed(2)} (${pct}% do total)`;
      })
      .join("\n");
  }

  let analiseTendencia = "";
  if (data.recentMonths.length >= 2) {
    const recentes = data.recentMonths.slice(-3);
    const despesasRecentes = recentes.map((m) => m.despesas);
    const mediaDespesas = despesasRecentes.reduce((a, b) => a + b, 0) / despesasRecentes.length;
    const variacaoRecente = despesasRecentes.length >= 2
      ? Math.round(((despesasRecentes[despesasRecentes.length - 1] - despesasRecentes[0]) / despesasRecentes[0]) * 100)
      : 0;

    analiseTendencia = `\nTENDÊNCIA: Média de despesas nos últimos ${recentes.length} meses: R$ ${mediaDespesas.toFixed(2)}. Variação acumulada no período: ${variacaoRecente > 0 ? "+" : ""}${variacaoRecente}%.`;

    const mesesPositivos = recentes.filter((m) => m.receitas >= m.despesas).length;
    if (mesesPositivos === recentes.length) {
      analiseTendencia += ` Todos os meses fecharam no azul.`;
    } else if (mesesPositivos === 0) {
      analiseTendencia += ` Atenção: nenhum mês fechou no azul.`;
    }
  }

  return `Você é um analista financeiro sênior especializado em finanças pessoais. Analise os dados abaixo com profundidade e gere insights profissionais em português brasileiro.

CONTEXTO DO MÊS ATUAL:
- Receitas: R$ ${data.receitas.toFixed(2)}
- Despesas: R$ ${data.despesas.toFixed(2)}
- Saldo: R$ ${saldo.toFixed(2)} (${saldo >= 0 ? "positivo" : "negativo"})
- Proporção despesa/receita: ${proporcao}%${proporcao > 90 ? " (MARGEM CRÍTICA)" : proporcao > 75 ? " (margem apertada)" : proporcao < 50 ? " (margem confortável)" : ""}
- Variação de receitas vs mês anterior: ${data.variacaoReceitas !== null ? (data.variacaoReceitas > 0 ? "+" : "") + data.variacaoReceitas + "%" : "primeiro mês"}
- Variação de despesas vs mês anterior: ${data.variacaoDespesas !== null ? (data.variacaoDespesas > 0 ? "+" : "") + data.variacaoDespesas + "%" : "primeiro mês"}
${projecaoEconomia ? `- Projeção: ${projecaoEconomia}` : ""}

DETALHAMENTO DAS DESPESAS${detalheCategorias ? `:\n${detalheCategorias}` : ": sem dados detalhados"}

HISTÓRICO RECENTE:
${data.recentMonths.length > 0 ? data.recentMonths.map((m) => `  ${m.mes}: Receita R$ ${m.receitas.toFixed(2)} | Despesa R$ ${m.despesas.toFixed(2)} | Saldo R$ ${(m.receitas - m.despesas).toFixed(2)}`).join("\n") : "  Sem histórico disponível."}
${analiseTendencia}

INSTRUÇÕES PARA OS INSIGHTS:
Gere 2 a 4 insights que cubram DIFERENTES aspectos. Use esta estrutura:

1. **Tendência ou Padrão** — analise a evolução dos gastos/receitas. Há tendência de alta, baixa ou estabilidade?
2. **Alerta ou Oportunidade** — aponte um risco real (gasto crescente, margem apertada) OU uma oportunidade (saldo sobrando, economia potencial)
3. **Recomendação Acionável** — sugira uma ação concreta que o usuário pode tomar (ex: "revisar plano de internet", "separar X por mês para reserva")
4. **Conquista ou Ponto Positivo** — destaque algo que o usuário está fazendo bem

REGRAS DE QUALIDADE:
- Seja específico: use números reais, percentuais e comparações
- Seja acionável: toda recomendação deve ser algo que o usuário possa fazer
- Linguagem profissional mas acessível: evite jargão financeiro complexo, explique termos se necessário
- Tom respeitoso e construtivo: não assuste o usuário, mas seja honesto sobre riscos
- Variação positiva de gastos NÃO é boa (significa que gastou mais)
- Se os dados mostrarem margem crítica (>90%), o alerta deve ser claro mas com sugestão prática
- Se não houver dados suficientes para análises robustas, foque em orientações gerais úteis

Responda APENAS com um array JSON válido. NADA de markdown, NADA de texto antes ou depois:
[
  {"type":"positive|negative|info","icon":"🎯","title":"Título Profissional","description":"Descrição completa com números, contexto e recomendação prática."}
]

Se não conseguir gerar insights de qualidade, retorne [].`;
}

export async function POST(request: NextRequest) {
  const payload = await request.json();

  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const fallback = generateInsights(
    payload.receitas,
    payload.despesas,
    payload.variacaoReceitas,
    payload.variacaoDespesas,
    payload.pieData || [],
    payload.recentMonths || []
  );

  const apiKey = process.env.OLLAMA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: true, data: fallback });
  }

  try {
    const res = await fetch(OLLAMA_CLOUD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: buildPrompt(payload) },
          { role: "user", content: "Gere os insights com base nos dados fornecidos." },
        ],
        stream: false,
        think: false,
        options: { temperature: 0.5 },
      }),
    });

    if (!res.ok) {
      console.warn("Ollama insights error, falling back to rule-based");
      return NextResponse.json({ success: true, data: fallback });
    }

    const data = await res.json();
    const rawText = data?.message?.content || "";
    const text = rawText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    const jsonStart = text.indexOf("[");
    const jsonEnd = text.lastIndexOf("]");
    if (jsonStart === -1 || jsonEnd === -1) {
      return NextResponse.json({ success: true, data: fallback });
    }

    const parsed: Insight[] = JSON.parse(text.substring(jsonStart, jsonEnd + 1));

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json({ success: true, data: fallback });
    }

    const valid = parsed.filter(
      (i) => i.type && i.icon && i.title && i.description
    );

    return NextResponse.json({ success: true, data: valid.length > 0 ? valid.slice(0, 4) : fallback });
  } catch (err) {
    console.warn("Ollama insights exception, falling back to rule-based");
    return NextResponse.json({ success: true, data: fallback });
  }
}
