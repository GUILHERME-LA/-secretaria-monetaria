import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

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

  let sql: string;
  let values: any[];

  switch (action) {
    case "inserir_categoria":
      sql = `INSERT INTO sm_categorias (user_id, nome, tipo, cor) VALUES ($1, $2, $3, $4) RETURNING id`;
      values = [user.id, payload.nome, payload.tipo, payload.cor];
      break;

    case "seed_categoria":
      sql = `INSERT INTO sm_categorias (user_id, nome, tipo, cor) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, nome, tipo) DO NOTHING`;
      values = [user.id, payload.nome, payload.tipo, payload.cor];
      break;

    case "inserir_transacao":
      sql = `INSERT INTO sm_transacoes (user_id, tipo, categoria_id, descricao, valor, data, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`;
      values = [user.id, payload.tipo, payload.categoria_id, payload.descricao, payload.valor, payload.data, payload.status || "confirmada"];
      break;

    case "inserir_auditoria":
      sql = `INSERT INTO sm_auditoria (user_id, transacao_id, acao, justificativa, dados_anteriores, dados_novos) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb) RETURNING id`;
      values = [user.id, payload.transacao_id, payload.acao, payload.justificativa, payload.dados_anteriores, payload.dados_novos];
      break;

    case "inserir_recorrente":
      sql = `INSERT INTO sm_recorrentes (user_id, categoria_id, descricao, valor, tipo, dia_vencimento) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
      values = [user.id, payload.categoria_id, payload.descricao, payload.valor, payload.tipo, payload.dia_vencimento];
      break;

    case "atualizar_transacao":
      sql = `UPDATE sm_transacoes SET tipo = $1, categoria_id = $2, descricao = $3, valor = $4, data = $5 WHERE id = $6 AND user_id = $7`;
      values = [payload.tipo, payload.categoria_id, payload.descricao, payload.valor, payload.data, payload.id, user.id];
      break;

    case "confirmar_transacao":
      sql = `UPDATE sm_transacoes SET status = 'confirmada' WHERE id = $1 AND user_id = $2`;
      values = [payload.id, user.id];
      break;

    case "excluir_transacao":
      sql = `DELETE FROM sm_transacoes WHERE id = $1 AND user_id = $2`;
      values = [payload.id, user.id];
      break;

    case "atualizar_recorrente":
      sql = `UPDATE sm_recorrentes SET tipo = $1, categoria_id = $2, descricao = $3, valor = $4, dia_vencimento = $5 WHERE id = $6 AND user_id = $7`;
      values = [payload.tipo, payload.categoria_id, payload.descricao, payload.valor, payload.dia_vencimento, payload.id, user.id];
      break;

    case "listar_categorias":
      sql = `SELECT * FROM sm_categorias WHERE user_id = $1 AND tipo = $2 ORDER BY nome`;
      values = [user.id, payload.tipo];
      break;

    case "listar_transacoes_mes":
      sql = `SELECT t.*, c.nome AS categoria_nome, c.cor AS categoria_cor FROM sm_transacoes t LEFT JOIN sm_categorias c ON c.id = t.categoria_id WHERE t.user_id = $1 AND t.data >= $2 AND t.data <= $3 ORDER BY t.data DESC`;
      values = [user.id, payload.inicio, payload.fim];
      break;

    case "listar_meses":
      sql = `SELECT DISTINCT data FROM sm_transacoes WHERE user_id = $1 ORDER BY data`;
      values = [user.id];
      break;

    case "listar_totais_mes":
      sql = `SELECT tipo, valor, status FROM sm_transacoes WHERE user_id = $1 AND data >= $2 AND data <= $3`;
      values = [user.id, payload.inicio, payload.fim];
      break;

    case "obter_transacao":
      sql = `SELECT * FROM sm_transacoes WHERE id = $1 AND user_id = $2`;
      values = [payload.id, user.id];
      break;

    case "buscar_categoria":
      sql = `SELECT id FROM sm_categorias WHERE nome = $1 AND tipo = $2 AND user_id = $3`;
      values = [payload.nome, payload.tipo, user.id];
      break;

    case "listar_auditoria":
      sql = `SELECT * FROM sm_auditoria WHERE user_id = $1 ORDER BY created_at DESC`;
      values = [user.id];
      break;

    case "listar_recorrentes":
      sql = `SELECT r.*, c.nome AS categoria_nome FROM sm_recorrentes r LEFT JOIN sm_categorias c ON c.id = r.categoria_id WHERE r.user_id = $1 ORDER BY r.dia_vencimento`;
      values = [user.id];
      break;

    case "toggle_recorrente":
      sql = `UPDATE sm_recorrentes SET ativo = NOT ativo WHERE id = $1 AND user_id = $2`;
      values = [payload.id, user.id];
      break;

    case "listar_recorrentes_ativos":
      sql = `SELECT id, categoria_id, descricao, valor, tipo, dia_vencimento FROM sm_recorrentes WHERE user_id = $1 AND ativo = true`;
      values = [user.id];
      break;

    case "listar_pendentes_mes":
      sql = `SELECT descricao, tipo, categoria_id FROM sm_transacoes WHERE user_id = $1 AND data >= $2 AND data <= $3 AND status = 'pendente'`;
      values = [user.id, payload.inicio, payload.fim];
      break;

    default:
      return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
  }

  try {
    const client = getPool();
    const result = await client.query(sql, values);
    return NextResponse.json({ success: true, data: result.rows || null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
