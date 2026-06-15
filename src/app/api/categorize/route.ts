import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});

const OLLAMA_CLOUD_URL = "https://ollama.com/api/chat";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3:8b-cloud";

interface CategorizeItem {
  descricao: string;
  tipo: "receita" | "despesa";
}

function buildSystemPrompt(categoriesByType: Record<string, string[]>) {
  const receita = categoriesByType.receita || [];
  const despesa = categoriesByType.despesa || [];

  return `Você é um assistente financeiro que categoriza transações.

Categorias existentes do usuário:
- receita: ${receita.join(", ") || "(nenhuma)"}
- despesa: ${despesa.join(", ") || "(nenhuma)"}

Regras:
1. Analise a descrição de cada transação e escolha a categoria existente mais adequada
2. Se nenhuma categoria existente se encaixar bem, crie uma nova categoria (retorne "criar": true)
3. Para categorias novas, escolha um nome curto e claro em português (ex: "Delivery", "Pets", "Viagens")
4. Se não tiver certeza absoluta, use a categoria "Outros"
5. Considere o contexto brasileiro: "mercado" = Alimentação, "uber" = Transporte, "aluguel" = Moradia, etc.

Responda APENAS com um JSON array, sem markdown, sem formatação:
[
  {"index": 0, "categoria": "nome", "criar": false},
  {"index": 1, "categoria": "nome nova", "criar": true}
]

O array deve ter exatamente o mesmo número de itens que as transações enviadas, na mesma ordem.`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { transactions } = (await request.json()) as {
      transactions: CategorizeItem[];
    };

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma transação enviada" },
        { status: 400 }
      );
    }

    const catResult = await pool.query(
      `SELECT nome, tipo FROM sm_categorias WHERE user_id = $1`,
      [user.id]
    );

    const categoriesByType: Record<string, string[]> = { receita: [], despesa: [] };
    for (const row of catResult.rows) {
      categoriesByType[row.tipo]?.push(row.nome);
    }

    const apiKey = process.env.OLLAMA_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key do Ollama não configurada" },
        { status: 500 }
      );
    }

    const transactionsText = transactions
      .map((t, i) => `${i}: [${t.tipo}] ${t.descricao}`)
      .join("\n");

    const res = await fetch(OLLAMA_CLOUD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: buildSystemPrompt(categoriesByType) },
          { role: "user", content: transactionsText },
        ],
        stream: false,
        think: false,
        options: { temperature: 0.1 },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Ollama Cloud error ${res.status}: ${errText}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const rawText = data?.message?.content || "";
    const text = rawText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    const jsonStart = text.indexOf("[");
    const jsonEnd = text.lastIndexOf("]");
    if (jsonStart === -1 || jsonEnd === -1) {
      return NextResponse.json({ error: "Resposta inválida da IA" });
    }
    const parsed = JSON.parse(text.substring(jsonStart, jsonEnd + 1));

    if (!Array.isArray(parsed)) {
      return NextResponse.json(
        { error: "Resposta inválida da IA" },
        { status: 502 }
      );
    }

    const results = transactions.map((t, i) => {
      const match = parsed.find((p: any) => p.index === i);
      return {
        index: i,
        categoria: match?.categoria || "Outros",
        criar: match?.criar || false,
      };
    });

    const toCreate = results.filter((r) => r.criar);
    const createdCategories: Record<string, string> = {};

    for (const r of toCreate) {
      const color = `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`;
      const insertResult = await pool.query(
        `SELECT inserir_categoria($1, $2, $3, $4) AS id`,
        [user.id, r.categoria, transactions[0]?.tipo || "despesa", color]
      );
      createdCategories[r.categoria] = insertResult.rows[0]?.id;
    }

    const finalResults = results.map((r) => ({
      ...r,
      existente: !r.criar || !!createdCategories[r.categoria],
    }));

    return NextResponse.json({
      success: true,
      data: {
        categorias: finalResults,
        criadas: Object.keys(createdCategories),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json(
      { error: `Erro no servidor: ${message}` },
      { status: 500 }
    );
  }
}
