import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});

interface Transaction {
  date: string;
  descricao: string;
  valor: number;
  tipo: "receita" | "despesa";
  categoria_nubank?: string;
  identificador?: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { transactions } = (await request.json()) as {
    transactions: Transaction[];
  };

  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma transação enviada" },
      { status: 400 }
    );
  }

  let importadas = 0;
  let duplicadas = 0;

  for (const t of transactions) {
    if (!t.date || !t.descricao || t.valor == null || isNaN(t.valor)) continue;

    const exists = await pool.query(
      `SELECT id FROM sm_transacoes
       WHERE user_id = $1 AND data = $2 AND descricao = $3 AND valor = $4`,
      [user.id, t.date, t.descricao, t.valor]
    );

    if (exists.rows.length > 0) {
      duplicadas++;
      continue;
    }

    await pool.query(`SELECT inserir_transacao($1, $2, $3, $4, $5, $6, $7)`, [
      user.id,
      t.tipo,
      null,
      t.descricao,
      t.valor,
      t.date,
      "confirmada",
    ]);
    importadas++;
  }

  return NextResponse.json({
    success: true,
    data: { importadas, duplicadas, total: transactions.length },
  });
}
