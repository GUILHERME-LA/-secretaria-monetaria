import { NextRequest, NextResponse } from "next/server";
import { isDemoMode } from "@/lib/supabase-mock";
import { handleDemoAction } from "./demo-handler";
import { createServerSupabase } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});

export async function POST(request: NextRequest) {
  const { action, payload } = await request.json();
  if (!action || !payload) {
    return NextResponse.json({ error: "action e payload são obrigatórios" }, { status: 400 });
  }

  if (isDemoMode()) {
    return handleDemoAction(action, payload);
  }

  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
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

      case "excluir_recorrente":
        await pool.query("SELECT excluir_recorrente($1, $2)", [user.id, payload.id]);
        return NextResponse.json({ success: true, data: null });

      case "excluir_recorrentes_inativos":
        await pool.query("SELECT excluir_recorrentes_inativos($1)", [user.id]);
        return NextResponse.json({ success: true, data: null });

      case "listar_recorrentes_ativos":
        result = await pool.query("SELECT listar_recorrentes_ativos_json($1) AS data", [user.id]);
        return NextResponse.json({ success: true, data: result.rows[0]?.data || [] });

      case "listar_pendentes_mes":
        result = await pool.query("SELECT listar_pendentes_mes_json($1, $2::date, $3::date) AS data", [user.id, payload.inicio, payload.fim]);
        return NextResponse.json({ success: true, data: result.rows[0]?.data || [] });

      case "criar_meta":
        result = await pool.query("SELECT criar_meta($1, $2, $3, $4, $5) AS id",
          [user.id, payload.titulo, payload.valor_objetivo, payload.valor_atual || 0, payload.cor || "#6366f1"]);
        return NextResponse.json({ success: true, data: { id: result.rows[0]?.id } });

      case "listar_metas":
        result = await pool.query("SELECT listar_metas_json($1) AS data", [user.id]);
        return NextResponse.json({ success: true, data: result.rows[0]?.data || [] });

      case "atualizar_valor_meta":
        await pool.query("SELECT atualizar_valor_meta($1, $2, $3)", [user.id, payload.id, payload.valor_atual]);
        return NextResponse.json({ success: true, data: null });

      case "excluir_meta":
        await pool.query("SELECT excluir_meta($1, $2)", [user.id, payload.id]);
        return NextResponse.json({ success: true, data: null });

      case "solicitar_alteracao_email": {
        const newEmail = payload.new_email;
        if (newEmail === user.email) {
          return NextResponse.json({ error: "O novo email é igual ao atual." }, { status: 400 });
        }

        const tokenBytes = new Uint8Array(32);
        crypto.getRandomValues(tokenBytes);
        const token = Array.from(tokenBytes, (b) => b.toString(16).padStart(2, "0")).join("");

        await pool.query(
          "INSERT INTO sm.sm_email_change_requests (user_id, current_email, new_email, token, expires_at) VALUES ($1, $2, $3, $4, now() + interval '1 hour')",
          [user.id, user.email, newEmail, token]
        );

        try {
          const origin = request.headers.get("origin") || "http://localhost:3000";
          await fetch(`${origin}/api/send-email-change`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ current_email: user.email, new_email: newEmail, token }),
          });
        } catch {
          console.warn("Falha ao enviar email (Resend não configurado?)");
        }

        return NextResponse.json({ success: true, data: null });
      }

      case "validar_token_email": {
        result = await pool.query(
          "SELECT user_id, current_email, new_email, expires_at, used FROM sm.sm_email_change_requests WHERE token = $1",
          [payload.token]
        );
        if (result.rows.length === 0) {
          return NextResponse.json({ error: "Token inválido." }, { status: 400 });
        }
        const row = result.rows[0];
        if (row.used) {
          return NextResponse.json({ error: "Este link já foi utilizado." }, { status: 400 });
        }
        if (new Date(row.expires_at) < new Date()) {
          return NextResponse.json({ error: "Este link expirou." }, { status: 400 });
        }
        return NextResponse.json({
          success: true,
          data: { user_id: row.user_id, current_email: row.current_email, new_email: row.new_email },
        });
      }

      case "confirmar_alteracao_email": {
        result = await pool.query(
          "SELECT user_id, new_email FROM sm.sm_email_change_requests WHERE token = $1 AND used = false AND expires_at > now()",
          [payload.token]
        );
        if (result.rows.length === 0) {
          return NextResponse.json({ error: "Token inválido ou expirado." }, { status: 400 });
        }
        const { user_id: targetUserId, new_email: targetNewEmail } = result.rows[0];

        await pool.query("UPDATE sm.sm_email_change_requests SET used = true WHERE token = $1", [payload.token]);

        const adminClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUserId, {
          email: targetNewEmail,
        });

        if (updateError) {
          await pool.query("UPDATE sm.sm_email_change_requests SET used = false WHERE token = $1", [payload.token]);
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: null });
      }

      case "criar_tag": {
        result = await pool.query(
          "INSERT INTO sm_tags (user_id, nome, cor) VALUES ($1, $2, $3) ON CONFLICT (user_id, nome) DO UPDATE SET cor = EXCLUDED.cor RETURNING id",
          [user.id, payload.nome, payload.cor || "#6366f1"]
        );
        return NextResponse.json({ success: true, data: { id: result.rows[0]?.id } });
      }

      case "listar_tags": {
        result = await pool.query(
          "SELECT id, nome, cor FROM sm_tags WHERE user_id = $1 ORDER BY nome",
          [user.id]
        );
        return NextResponse.json({ success: true, data: result.rows });
      }

      case "excluir_tag": {
        await pool.query("DELETE FROM sm_tags WHERE id = $1 AND user_id = $2", [payload.id, user.id]);
        return NextResponse.json({ success: true, data: null });
      }

      case "vincular_tags_transacao": {
        const tagIds: string[] = payload.tag_ids || [];
        await pool.query("DELETE FROM sm_transacao_tags WHERE transacao_id = $1", [payload.transacao_id]);
        for (const tagId of tagIds) {
          await pool.query(
            "INSERT INTO sm_transacao_tags (transacao_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [payload.transacao_id, tagId]
          );
        }
        return NextResponse.json({ success: true, data: null });
      }

      case "listar_tags_transacao": {
        result = await pool.query(
          `SELECT t.id, t.nome, t.cor FROM sm_tags t
           JOIN sm_transacao_tags tt ON tt.tag_id = t.id
           WHERE tt.transacao_id = $1
           ORDER BY t.nome`,
          [payload.transacao_id]
        );
        return NextResponse.json({ success: true, data: result.rows });
      }

      case "listar_tags_periodo": {
        result = await pool.query(
          `SELECT tt.transacao_id, t.id, t.nome, t.cor FROM sm_tags t
           JOIN sm_transacao_tags tt ON tt.tag_id = t.id
           JOIN sm_transacoes tr ON tr.id = tt.transacao_id
           WHERE tr.data >= $1 AND tr.data <= $2
           ORDER BY t.nome`,
          [payload.inicio, payload.fim]
        );
        return NextResponse.json({ success: true, data: result.rows });
      }

      case "excluir_transacoes": {
        const ids: string[] = payload.ids || [];
        for (const id of ids) {
          await pool.query("SELECT excluir_transacao($1, $2)", [user.id, id]);
        }
        return NextResponse.json({ success: true, data: null });
      }

      case "confirmar_transacoes": {
        const confirmIds: string[] = payload.ids || [];
        for (const id of confirmIds) {
          await pool.query("SELECT confirmar_transacao($1, $2)", [user.id, id]);
        }
        return NextResponse.json({ success: true, data: null });
      }

      case "criar_split": {
        const splitRows: { categoria_id: string; valor: number; descricao: string }[] = payload.parts || [];
        const totalSplit = splitRows.reduce((s, r) => s + r.valor, 0);

        const transRes = await pool.query("SELECT valor, tipo FROM sm_transacoes WHERE id = $1 AND user_id = $2", [payload.transacao_id, user.id]);
        if (transRes.rows.length === 0) {
          return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
        }
        const transValor = Number(transRes.rows[0].valor);
        if (Math.abs(totalSplit - transValor) > 0.01) {
          return NextResponse.json({ error: "A soma das partes deve igualar o valor total" }, { status: 400 });
        }

        for (const part of splitRows) {
          await pool.query(
            "INSERT INTO sm_splits (transacao_id, categoria_id, descricao, valor) VALUES ($1, $2, $3, $4)",
            [payload.transacao_id, part.categoria_id, part.descricao, part.valor]
          );
        }

        return NextResponse.json({ success: true, data: null });
      }

      case "listar_splits": {
        result = await pool.query(
          `SELECT s.id, s.transacao_id, s.categoria_id, s.descricao, s.valor,
                  c.nome AS categoria_nome, c.cor AS categoria_cor
           FROM sm_splits s
           JOIN sm_categorias c ON c.id = s.categoria_id
           WHERE s.transacao_id = $1
           ORDER BY s.created_at`,
          [payload.transacao_id]
        );
        return NextResponse.json({ success: true, data: result.rows });
      }

      case "excluir_split": {
        await pool.query("DELETE FROM sm_splits WHERE transacao_id = $1", [payload.transacao_id]);
        return NextResponse.json({ success: true, data: null });
      }

      default:
        return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
