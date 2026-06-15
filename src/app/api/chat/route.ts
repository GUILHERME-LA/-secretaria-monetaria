import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});

const OLLAMA_CLOUD_URL = "https://ollama.com/api/chat";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3:8b-cloud";

function buildSystemPrompt(categoriesByType: Record<string, string[]>) {
  const receita = categoriesByType.receita || [];
  const despesa = categoriesByType.despesa || [];

  return `Você é um assistente financeiro que extrai dados de transações de mensagens e imagens do usuário.

Categorias existentes do usuário:
- receita: ${receita.join(", ") || "(nenhuma)"}
- despesa: ${despesa.join(", ") || "(nenhuma)"}

Regras:
1. Analise a mensagem e extraia: tipo (receita/despesa), descrição curta, valor numérico, categoria, data
2. Se a descrição se encaixa em uma categoria existente, use-a
3. Se não se encaixa em nenhuma existente, crie uma nova categoria (retorne "criar_categoria": true)
4. Para categorias novas, escolha um nome curto e claro em português
5. Se não tiver certeza, use "Outros"
6. Considere contexto brasileiro: "mercado" = Alimentação, "uber" = Transporte, "aluguel" = Moradia, "ifood" = Alimentação, "netflix" = Assinaturas, etc.
7. Se a mensagem não for sobre uma transação financeira, retorne {"erro": "mensagem explicativa"}
8. Se receber uma imagem (comprovante, nota fiscal, recibo), extraia: valor, descrição do estabelecimento, data, e sugira uma categoria
9. Para imagens de comprovantes Pix, extraia: valor, destinatário/remetente, data
10. Para imagens de boletos, extraia: valor, beneficiário, data de vencimento

Responda APENAS com JSON, sem markdown, sem formatação:
{"tipo":"receita ou despesa","descricao":"texto curto","valor":numero,"categoria":"nome da categoria","data":"YYYY-MM-DD","criar_categoria":false}

Se criar_categoria=true, a categoria será criada automaticamente.`;
}

export async function POST(request: NextRequest) {
  const { message, image, imageMimeType } = await request.json();

  if (!message || typeof message !== "string") {
    return NextResponse.json({ erro: "Mensagem vazia." }, { status: 400 });
  }

  const apiKey = process.env.OLLAMA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { erro: "API key do Ollama não configurada. Crie uma em https://ollama.com/settings/keys" },
      { status: 500 }
    );
  }

  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const catResult = await pool.query(
      `SELECT nome, tipo FROM sm_categorias WHERE user_id = $1`,
      [user.id]
    );

    const categoriesByType: Record<string, string[]> = { receita: [], despesa: [] };
    for (const row of catResult.rows) {
      categoriesByType[row.tipo]?.push(row.nome);
    }

    const userMessage: any = { role: "user", content: message };
    if (image && typeof image === "string") {
      userMessage.images = [image];
    }

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
          userMessage,
        ],
        stream: false,
        think: false,
        options: { temperature: 0.1 },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { erro: `Ollama Cloud error ${res.status}: ${errText}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const rawText = data?.message?.content || "";
    const text = rawText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      return NextResponse.json({ erro: "Não consegui processar. Tente novamente." });
    }
    const parsed = JSON.parse(text.substring(jsonStart, jsonEnd + 1));

    if (parsed.erro) {
      return NextResponse.json({ erro: parsed.erro });
    }

    if (!parsed.tipo || !parsed.descricao || !parsed.valor || !parsed.categoria) {
      return NextResponse.json({
        erro: "Não consegui entender a transação. Tente ser mais específico.",
      });
    }

    if (!parsed.data) {
      const hoje = new Date();
      parsed.data = hoje.toISOString().slice(0, 10);
    }

    return NextResponse.json({ success: true, transacao: parsed });
  } catch (err: any) {
    return NextResponse.json(
      { erro: `Erro ao processar: ${err.message}` },
      { status: 500 }
    );
  }
}
