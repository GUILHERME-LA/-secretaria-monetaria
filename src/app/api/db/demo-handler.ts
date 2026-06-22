import { NextResponse } from "next/server";
import { demoCategories } from "@/lib/demo-data";

const catMap = new Map(demoCategories.map((c) => [c.id, c]));

// In-memory state (mutable within the session)
const state: {
  categorias: any[];
  transacoes: any[];
  recorrentes: any[];
  metas: any[];
  auditoria: any[];
} = {
  categorias: [...demoCategories],
  transacoes: generateDemoTransacoes(),
  recorrentes: generateDemoRecorrentes(),
  metas: generateDemoMetas(),
  auditoria: [],
};

function generateDemoTransacoes() {
  const now = new Date();
  const transactions: any[] = [];
  let idx = 0;

  for (let mesesAtras = 5; mesesAtras >= 0; mesesAtras--) {
    const d = new Date(now.getFullYear(), now.getMonth() - mesesAtras, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();

    idx++;
    transactions.push({
      id: `demo-${idx}`, user_id: "demo-user", categoria_id: "cat-1",
      tipo: "receita", descricao: "Salário",
      valor: 5200 + Math.round(Math.random() * 400),
      data: `${year}-${String(month).padStart(2, "0")}-05`,
      status: "confirmada",
      created_at: `${year}-${String(month).padStart(2, "0")}-05T08:00:00Z`,
    });

    if (mesesAtras % 2 === 0) {
      idx++;
      transactions.push({
        id: `demo-${idx}`, user_id: "demo-user", categoria_id: "cat-2",
        tipo: "receita", descricao: "Freela site",
        valor: 800 + Math.round(Math.random() * 1200),
        data: `${year}-${String(month).padStart(2, "0")}-${String(Math.min(15 + mesesAtras, daysInMonth)).padStart(2, "0")}`,
        status: "confirmada",
        created_at: `${year}-${String(month).padStart(2, "0")}-15T10:00:00Z`,
      });
    }

    const despesas = [
      { cat: "cat-4", desc: "Supermercado", val: [350, 650], dia: 3 },
      { cat: "cat-4", desc: "Restaurante", val: [40, 120], dia: 12 },
      { cat: "cat-5", desc: "Uber", val: [15, 45], dia: 8 },
      { cat: "cat-5", desc: "Gasolina", val: [120, 200], dia: 18 },
      { cat: "cat-6", desc: "Aluguel", val: [1200, 1200], dia: 1 },
      { cat: "cat-6", desc: "Condomínio", val: [350, 400], dia: 1 },
      { cat: "cat-7", desc: "Cinema", val: [30, 70], dia: 14 },
      { cat: "cat-7", desc: "Ifood", val: [25, 80], dia: 20 },
      { cat: "cat-8", desc: "Farmácia", val: [40, 90], dia: 10 },
      { cat: "cat-9", desc: "Curso Online", val: [29, 60], dia: 22 },
      { cat: "cat-10", desc: "Netflix", val: [55, 55], dia: 15 },
      { cat: "cat-10", desc: "Spotify", val: [22, 22], dia: 15 },
    ];

    for (const desp of despesas) {
      if (Math.random() > 0.25 || mesesAtras === 0) {
        idx++;
        const dia = Math.min(desp.dia + Math.floor(Math.random() * 3), daysInMonth);
        transactions.push({
          id: `demo-${idx}`, user_id: "demo-user", categoria_id: desp.cat,
          tipo: "despesa", descricao: desp.desc,
          valor: desp.val[0] + Math.round(Math.random() * (desp.val[1] - desp.val[0])),
          data: `${year}-${String(month).padStart(2, "0")}-${String(dia).padStart(2, "0")}`,
          status: mesesAtras === 0 && Math.random() > 0.7 ? "pendente" : "confirmada",
          created_at: `${year}-${String(month).padStart(2, "0")}-${String(dia).padStart(2, "0")}T12:00:00Z`,
        });
      }
    }
  }
  return transactions;
}

function generateDemoRecorrentes() {
  return [
    { id: "rec-1", user_id: "demo-user", categoria_id: "cat-10", descricao: "Netflix", valor: 55, tipo: "despesa", dia_vencimento: 15, ativo: true, created_at: "2026-01-01T00:00:00Z" },
    { id: "rec-2", user_id: "demo-user", categoria_id: "cat-10", descricao: "Spotify", valor: 22, tipo: "despesa", dia_vencimento: 15, ativo: true, created_at: "2026-01-01T00:00:00Z" },
    { id: "rec-3", user_id: "demo-user", categoria_id: "cat-4", descricao: "Assinatura SmartFit", valor: 99, tipo: "despesa", dia_vencimento: 10, ativo: true, created_at: "2026-01-01T00:00:00Z" },
  ];
}

function generateDemoMetas() {
  return [
    { id: "meta-1", user_id: "demo-user", titulo: "Reserva de emergência", valor_objetivo: 30000, valor_atual: 12000, cor: "#22c55e", created_at: "2026-01-01T00:00:00Z" },
    { id: "meta-2", user_id: "demo-user", titulo: "Viagem de férias", valor_objetivo: 8000, valor_atual: 2500, cor: "#8b5cf6", created_at: "2026-01-01T00:00:00Z" },
    { id: "meta-3", user_id: "demo-user", titulo: "Novo notebook", valor_objetivo: 7000, valor_atual: 7000, cor: "#06b6d4", created_at: "2026-01-01T00:00:00Z" },
  ];
}

function expandTransacao(t: any) {
  const cat = catMap.get(t.categoria_id);
  return {
    ...t,
    categoria_nome: cat?.nome || "Sem categoria",
    categoria_cor: cat?.cor || "#6366f1",
  };
}

function uid() {
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function handleDemoAction(action: string, payload: any) {
  switch (action) {
    case "listar_meses": {
      const meses = new Set(state.transacoes.map((t: any) => t.data.slice(0, 7)));
      return NextResponse.json({ success: true, data: Array.from(meses).sort().map((m) => ({ data: m + "-01" })) });
    }
    case "listar_transacoes_mes": {
      const rows = state.transacoes
        .filter((t: any) => t.data >= payload.inicio && t.data <= payload.fim)
        .map(expandTransacao);
      return NextResponse.json({ success: true, data: rows });
    }
    case "listar_totais_mes": {
      const rows = state.transacoes
        .filter((t: any) => t.data >= payload.inicio && t.data <= payload.fim)
        .map((t: any) => ({ tipo: t.tipo, valor: t.valor, status: t.status }));
      return NextResponse.json({ success: true, data: rows });
    }
    case "listar_categorias": {
      const rows = state.categorias.filter((c: any) => c.tipo === payload.tipo);
      return NextResponse.json({ success: true, data: rows });
    }
    case "buscar_categoria": {
      const c = state.categorias.find((c: any) => c.nome === payload.nome && c.tipo === payload.tipo);
      return NextResponse.json({ success: true, data: c || null });
    }
    case "seed_categoria":
    case "inserir_categoria": {
      const c = { id: uid(), user_id: "demo-user", nome: payload.nome, tipo: payload.tipo, cor: payload.cor, created_at: new Date().toISOString() };
      state.categorias.push(c);
      return NextResponse.json({ success: true, data: { id: c.id } });
    }
    case "inserir_transacao": {
      const t = {
        id: uid(), user_id: "demo-user", categoria_id: payload.categoria_id,
        tipo: payload.tipo, descricao: payload.descricao, valor: payload.valor,
        data: payload.data, status: payload.status || "confirmada",
        created_at: new Date().toISOString(),
      };
      state.transacoes.push(t);
      return NextResponse.json({ success: true, data: { id: t.id } });
    }
    case "atualizar_transacao": {
      const t = state.transacoes.find((t: any) => t.id === payload.id);
      if (t) Object.assign(t, payload, { user_id: "demo-user" });
      return NextResponse.json({ success: true, data: null });
    }
    case "confirmar_transacao": {
      const t = state.transacoes.find((t: any) => t.id === payload.id);
      if (t) t.status = "confirmada";
      return NextResponse.json({ success: true, data: null });
    }
    case "excluir_transacao": {
      state.transacoes = state.transacoes.filter((t: any) => t.id !== payload.id);
      return NextResponse.json({ success: true, data: null });
    }
    case "obter_transacao": {
      const t = state.transacoes.find((t: any) => t.id === payload.id);
      return NextResponse.json({ success: true, data: t || null });
    }
    case "listar_pendentes_mes": {
      const rows = state.transacoes
        .filter((t: any) => t.status === "pendente" && t.data >= payload.inicio && t.data <= payload.fim);
      return NextResponse.json({ success: true, data: rows });
    }
    case "listar_recorrentes": {
      const rows = state.recorrentes.map((r: any) => {
        const cat = catMap.get(r.categoria_id);
        return { ...r, categoria_nome: cat?.nome || "Sem categoria" };
      });
      return NextResponse.json({ success: true, data: rows });
    }
    case "listar_recorrentes_ativos": {
      const rows = state.recorrentes
        .filter((r: any) => r.ativo)
        .map((r: any) => {
          const cat = catMap.get(r.categoria_id);
          return { id: r.id, categoria_id: r.categoria_id, descricao: r.descricao, valor: r.valor, tipo: r.tipo, dia_vencimento: r.dia_vencimento, categoria_cor: cat?.cor || "#6366f1" };
        });
      return NextResponse.json({ success: true, data: rows });
    }
    case "inserir_recorrente": {
      const r = { id: uid(), user_id: "demo-user", categoria_id: payload.categoria_id, descricao: payload.descricao, valor: payload.valor, tipo: payload.tipo, dia_vencimento: payload.dia_vencimento, ativo: true, created_at: new Date().toISOString() };
      state.recorrentes.push(r);
      return NextResponse.json({ success: true, data: { id: r.id } });
    }
    case "atualizar_recorrente": {
      const r = state.recorrentes.find((r: any) => r.id === payload.id);
      if (r) Object.assign(r, payload, { user_id: "demo-user" });
      return NextResponse.json({ success: true, data: null });
    }
    case "toggle_recorrente": {
      const r = state.recorrentes.find((r: any) => r.id === payload.id);
      if (r) r.ativo = !r.ativo;
      return NextResponse.json({ success: true, data: null });
    }
    case "excluir_recorrente": {
      state.recorrentes = state.recorrentes.filter((r: any) => r.id !== payload.id);
      return NextResponse.json({ success: true, data: null });
    }
    case "excluir_recorrentes_inativos": {
      state.recorrentes = state.recorrentes.filter((r: any) => r.ativo);
      return NextResponse.json({ success: true, data: null });
    }
    case "listar_metas": {
      return NextResponse.json({ success: true, data: state.metas });
    }
    case "criar_meta": {
      const m = { id: uid(), user_id: "demo-user", titulo: payload.titulo, valor_objetivo: payload.valor_objetivo, valor_atual: payload.valor_atual || 0, cor: payload.cor || "#6366f1", created_at: new Date().toISOString() };
      state.metas.push(m);
      return NextResponse.json({ success: true, data: { id: m.id } });
    }
    case "atualizar_valor_meta": {
      const m = state.metas.find((m: any) => m.id === payload.id);
      if (m) m.valor_atual = payload.valor_atual;
      return NextResponse.json({ success: true, data: null });
    }
    case "excluir_meta": {
      state.metas = state.metas.filter((m: any) => m.id !== payload.id);
      return NextResponse.json({ success: true, data: null });
    }
    case "listar_auditoria": {
      return NextResponse.json({ success: true, data: state.auditoria });
    }
    case "inserir_auditoria": {
      const a = { id: uid(), user_id: "demo-user", ...payload, created_at: new Date().toISOString() };
      state.auditoria.push(a);
      return NextResponse.json({ success: true, data: { id: a.id } });
    }
    case "solicitar_alteracao_email": {
      console.log("[DEMO] Solicitação de alteração de email:", payload.new_email);
      return NextResponse.json({ success: true, data: null });
    }
    case "validar_token_email": {
      return NextResponse.json({
        success: true,
        data: {
          user_id: "demo-user",
          current_email: "demo@demo.com",
          new_email: payload.new_email || "novo@demo.com",
        },
      });
    }
    case "confirmar_alteracao_email": {
      return NextResponse.json({ success: true, data: null });
    }
    default:
      return NextResponse.json({ success: true, data: null });
  }
}


