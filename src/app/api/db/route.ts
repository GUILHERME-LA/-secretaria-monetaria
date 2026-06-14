import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { action, payload } = await request.json();
  if (!action || !payload) {
    return NextResponse.json({ error: "action e payload são obrigatórios" }, { status: 400 });
  }

  try {
    let result;

    switch (action) {
      case "inserir_categoria":
        result = await pool.query("SELECT inserir_categoria($1, $2, $3, $4) AS id", [user.id, payload.nome, payload.tipo, payload.cor]);
        return NextResponse.json({ success: true, data: { id: result.rows[0]?.id } });

      case "seed_categoria":
        await pool.query("SELECT seed_categoria($1, $2, $3, $4)", [user.id, payload.nome, payload.tipo, payload.cor]);
        return NextResponse.json({ success: true, data: null });

      case "inserir_transacao":
        result = await pool.query("SELECT inserir_transacao($1, $2, $3, $4, $5, $6, $7) AS id",
          [user.id, payload.tipo, payload.categoria_id, payload.descricao, payload.valor, payload.data, payload.status || "confirmada"]);
        return NextResponse.json({ success: true, data: { id: result.rows[0]?.id } });

      case "inserir_auditoria":
        result = await pool.query("SELECT inserir_auditoria($1, $2, $3, $4, $5::jsonb, $6::jsonb) AS id",
          [user.id, payload.transacao_id, payload.acao, payload.justificativa, payload.dados_anteriores, payload.dados_novos]);
        return NextResponse.json({ success: true, data: { id: result.rows[0]?.id } });

      case "inserir_recorrente":
        result = await pool.query("SELECT inserir_recorrente($1, $2, $3, $4, $5, $6) AS id",
          [user.id, payload.categoria_id, payload.descricao, payload.valor, payload.tipo, payload.dia_vencimento]);
        return NextResponse.json({ success: true, data: { id: result.rows[0]?.id } });

      case "atualizar_transacao":
        await pool.query("SELECT atualizar_transacao($1, $2, $3, $4, $5, $6, $7)",
          [user.id, payload.id, payload.tipo, payload.categoria_id, payload.descricao, payload.valor, payload.data]);
        return NextResponse.json({ success: true, data: null });

      case "confirmar_transacao":
        await pool.query("SELECT confirmar_transacao($1, $2)", [user.id, payload.id]);
        return NextResponse.json({ success: true, data: null });

      case "excluir_transacao":
        await pool.query("SELECT excluir_transacao($1, $2)", [user.id, payload.id]);
        return NextResponse.json({ success: true, data: null });

      case "atualizar_recorrente":
        await pool.query("SELECT atualizar_recorrente($1, $2, $3, $4, $5, $6, $7)",
          [user.id, payload.id, payload.tipo, payload.categoria_id, payload.descricao, payload.valor, payload.dia_vencimento]);
        return NextResponse.json({ success: true, data: null });

      case "listar_categorias":
        result = await pool.query("SELECT listar_categorias_json($1, $2) AS data", [user.id, payload.tipo]);
        return NextResponse.json({ success: true, data: result.rows[0]?.data || [] });

      case "listar_transacoes_mes":
        result = await pool.query("SELECT listar_transacoes_mes_json($1, $2::date, $3::date) AS data", [user.id, payload.inicio, payload.fim]);
        return NextResponse.json({ success: true, data: result.rows[0]?.data || [] });

      case "listar_meses":
        result = await pool.query("SELECT listar_meses_json($1) AS data", [user.id]);
        return NextResponse.json({ success: true, data: result.rows[0]?.data || [] });

      case "listar_totais_mes":
        result = await pool.query("SELECT listar_totais_mes_json($1, $2::date, $3::date) AS data", [user.id, payload.inicio, payload.fim]);
        return NextResponse.json({ success: true, data: result.rows[0]?.data || [] });

      case "obter_transacao":
        result = await pool.query("SELECT obter_transacao_json($1, $2) AS data", [user.id, payload.id]);
        return NextResponse.json({ success: true, data: result.rows[0]?.data || null });

      case "buscar_categoria":
        result = await pool.query("SELECT buscar_categoria_json($1, $2, $3) AS data", [user.id, payload.nome, payload.tipo]);
        return NextResponse.json({ success: true, data: result.rows[0]?.data || null });

      case "listar_auditoria":
        result = await pool.query("SELECT listar_auditoria_json($1) AS data", [user.id]);
        return NextResponse.json({ success: true, data: result.rows[0]?.data || [] });

      case "listar_recorrentes":
        result = await pool.query("SELECT listar_recorrentes_json($1) AS data", [user.id]);
        return NextResponse.json({ success: true, data: result.rows[0]?.data || [] });

      case "toggle_recorrente":
        await pool.query("SELECT toggle_recorrente($1, $2)", [user.id, payload.id]);
        return NextResponse.json({ success: true, data: null });

      case "listar_recorrentes_ativos":
        result = await pool.query("SELECT listar_recorrentes_ativos_json($1) AS data", [user.id]);
        return NextResponse.json({ success: true, data: result.rows[0]?.data || [] });

      case "listar_pendentes_mes":
        result = await pool.query("SELECT listar_pendentes_mes_json($1, $2::date, $3::date) AS data", [user.id, payload.inicio, payload.fim]);
        return NextResponse.json({ success: true, data: result.rows[0]?.data || [] });

      default:
        return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
