import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { Pool } from "pg";
import { parseNubankCsv } from "@/lib/parse-nubank-csv";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
  }

  const content = await file.text();
  const transactions = parseNubankCsv(content);

  if (transactions.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma transação encontrada no arquivo" },
      { status: 400 }
    );
  }

  let importadas = 0;
  let duplicadas = 0;

  for (const t of transactions) {
    const exists = await pool.query(
      `SELECT id FROM sm_transacoes
       WHERE user_id = $1 AND data = $2 AND descricao = $3 AND valor = $4`,
      [user.id, t.date, t.descricao, t.valor]
    );

    if (exists.rows.length > 0) {
      duplicadas++;
      continue;
    }

    await pool.query(
      `SELECT inserir_transacao($1, $2, $3, $4, $5, $6, $7)`,
      [user.id, t.tipo, null, t.descricao, t.valor, t.date, "confirmada"]
    );
    importadas++;
  }

  return NextResponse.json({
    success: true,
    data: { importadas, duplicadas, total: transactions.length },
  });
}
