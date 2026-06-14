import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const admin = createAdminSupabase();
  const { action, payload } = await request.json();

  if (!action || !payload) {
    return NextResponse.json({ error: "action e payload são obrigatórios" }, { status: 400 });
  }

  try {
    let result;

    switch (action) {
      case "inserir_categoria":
        result = await admin.from("sm_categorias").insert({
          user_id: user.id, nome: payload.nome, tipo: payload.tipo, cor: payload.cor,
        }).select();
        break;

      case "seed_categoria":
        result = await admin.from("sm_categorias").upsert({
          user_id: user.id, nome: payload.nome, tipo: payload.tipo, cor: payload.cor,
        }, { onConflict: "user_id, nome, tipo", ignoreDuplicates: true }).select();
        break;

      case "inserir_transacao":
        result = await admin.from("sm_transacoes").insert({
          user_id: user.id, tipo: payload.tipo, categoria_id: payload.categoria_id,
          descricao: payload.descricao, valor: payload.valor,
          data: payload.data, status: payload.status || "confirmada",
        }).select();
        break;

      case "inserir_auditoria":
        result = await admin.from("sm_auditoria").insert({
          user_id: user.id, transacao_id: payload.transacao_id, acao: payload.acao,
          justificativa: payload.justificativa,
          dados_anteriores: payload.dados_anteriores,
          dados_novos: payload.dados_novos,
        }).select();
        break;

      case "inserir_recorrente":
        result = await admin.from("sm_recorrentes").insert({
          user_id: user.id, categoria_id: payload.categoria_id,
          descricao: payload.descricao, valor: payload.valor,
          tipo: payload.tipo, dia_vencimento: payload.dia_vencimento,
        }).select();
        break;

      case "atualizar_transacao":
        result = await admin.from("sm_transacoes").update({
          tipo: payload.tipo, categoria_id: payload.categoria_id,
          descricao: payload.descricao, valor: payload.valor, data: payload.data,
        }).eq("id", payload.id).eq("user_id", user.id);
        break;

      case "confirmar_transacao":
        result = await admin.from("sm_transacoes").update({
          status: "confirmada",
        }).eq("id", payload.id).eq("user_id", user.id);
        break;

      case "excluir_transacao":
        result = await admin.from("sm_transacoes").delete().eq("id", payload.id).eq("user_id", user.id);
        break;

      case "atualizar_recorrente":
        result = await admin.from("sm_recorrentes").update({
          tipo: payload.tipo, categoria_id: payload.categoria_id,
          descricao: payload.descricao, valor: payload.valor,
          dia_vencimento: payload.dia_vencimento,
        }).eq("id", payload.id).eq("user_id", user.id);
        break;

      case "listar_categorias":
        result = await admin.from("sm_categorias").select("*")
          .eq("user_id", user.id).eq("tipo", payload.tipo).order("nome");
        break;

      case "listar_transacoes_mes": {
        const raw = await admin.from("sm_transacoes").select("*, categorias(nome, cor)")
          .eq("user_id", user.id)
          .gte("data", payload.inicio).lte("data", payload.fim)
          .order("data", { ascending: false });
        if (raw.error) throw raw.error;
        const flat = (raw.data || []).map((t: any) => ({
          ...t, categoria_nome: t.categorias?.nome, categoria_cor: t.categorias?.cor,
          categorias: undefined,
        }));
        return NextResponse.json({ success: true, data: flat });
      }

      case "listar_meses":
        result = await admin.from("sm_transacoes").select("data")
          .eq("user_id", user.id).order("data");
        break;

      case "listar_totais_mes":
        result = await admin.from("sm_transacoes").select("tipo, valor, status")
          .eq("user_id", user.id)
          .gte("data", payload.inicio).lte("data", payload.fim);
        break;

      case "obter_transacao":
        result = await admin.from("sm_transacoes").select("*")
          .eq("id", payload.id).eq("user_id", user.id).single();
        break;

      case "buscar_categoria":
        result = await admin.from("sm_categorias").select("id")
          .eq("nome", payload.nome).eq("tipo", payload.tipo)
          .eq("user_id", user.id).single();
        break;

      case "listar_auditoria":
        result = await admin.from("sm_auditoria").select("*")
          .eq("user_id", user.id).order("created_at", { ascending: false });
        break;

      case "listar_recorrentes": {
        const raw = await admin.from("sm_recorrentes").select("*, categorias(nome)")
          .eq("user_id", user.id).order("dia_vencimento");
        if (raw.error) throw raw.error;
        const flat = (raw.data || []).map((r: any) => ({
          ...r, categoria_nome: r.categorias?.nome, categorias: undefined,
        }));
        return NextResponse.json({ success: true, data: flat });
      }

      case "toggle_recorrente": {
        const cur = await admin.from("sm_recorrentes").select("ativo")
          .eq("id", payload.id).eq("user_id", user.id).single();
        if (cur.error) throw cur.error;
        result = await admin.from("sm_recorrentes").update({ ativo: !cur.data.ativo })
          .eq("id", payload.id);
        break;
      }

      case "listar_recorrentes_ativos":
        result = await admin.from("sm_recorrentes").select("id, categoria_id, descricao, valor, tipo, dia_vencimento")
          .eq("user_id", user.id).eq("ativo", true);
        break;

      case "listar_pendentes_mes":
        result = await admin.from("sm_transacoes").select("descricao, tipo, categoria_id")
          .eq("user_id", user.id).eq("status", "pendente")
          .gte("data", payload.inicio).lte("data", payload.fim);
        break;

      default:
        return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
    }

    if (result?.error) throw result.error;
    return NextResponse.json({ success: true, data: result?.data || null });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
