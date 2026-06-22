"use client";

import { useEffect, useState, useCallback } from "react";

export const dynamic = "force-dynamic";
import {
  getCurrentMonth,
  getMonthBounds,
  getLast6Months,
  getNextNMonths,
  monthLabel,
} from "@/lib/utils";
import { autoCriarRecorrentes } from "@/lib/auto-criar-recorrentes";
import type { Insight } from "@/lib/insights-engine";
import { useDashboardPrefs, type WidgetKey } from "@/lib/dashboard-prefs";
import { createClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";
import { Header } from "@/components/Header";
import { DashboardCards } from "@/components/DashboardCards";
import { MonthSelector } from "@/components/MonthSelector";
import { NewTransactionButton } from "@/components/NewTransactionButton";
import { ExpensePieChart } from "@/components/ExpensePieChart";
import { ExpenseRanking } from "@/components/ExpenseRanking";
import { MonthlyBarChart } from "@/components/MonthlyBarChart";
import { TransactionList } from "@/components/TransactionList";
import { FinancialInsights } from "@/components/FinancialInsights";
import { FinancialHealth } from "@/components/FinancialHealth";
import { FinancialCalendar } from "@/components/FinancialCalendar";
import { MetasDashboard, type Meta } from "@/components/MetasDashboard";
import { WelcomeTutorial } from "@/components/WelcomeTutorial";
import { Modal } from "@/components/ui/Modal";
import { seedDefaultCategories } from "@/lib/seed-categories";
import { Settings2 } from "lucide-react";

const widgetLabels: Record<WidgetKey, string> = {
  insights: "Insights Inteligentes",
  calendar: "Calendário Financeiro",
  metas: "Metas Financeiras",
  charts: "Gráficos e Evolução",
};

export default function DashboardPage() {
  const hoje = getCurrentMonth();
  const [month, setMonth] = useState(hoje);
  const [refreshKey, setRefreshKey] = useState(0);
  const [availableMonths, setAvailableMonths] = useState<string[]>([hoje]);
  const [mostrarPrevistas, setMostrarPrevistas] = useState(true);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { prefs, toggle } = useDashboardPrefs(userId);

  const [receitas, setReceitas] = useState(0);
  const [despesas, setDespesas] = useState(0);
  const [previstoReceitas, setPrevistoReceitas] = useState(0);
  const [previstoDespesas, setPrevistoDespesas] = useState(0);
  const [pieData, setPieData] = useState<
    { nome: string; cor: string; valor: number }[]
  >([]);
  const [rankingData, setRankingData] = useState<
    { nome: string; cor: string; valor: number }[]
  >([]);
  const [comparativo, setComparativo] = useState<
    { mes: string; receitas: number; despesas: number }[]
  >([]);
  const [comparativoTotal, setComparativoTotal] = useState<
    { mes: string; receitas: number; despesas: number }[]
  >([]);
  const [variacaoReceitas, setVariacaoReceitas] = useState<number | null>(null);
  const [variacaoDespesas, setVariacaoDespesas] = useState<number | null>(null);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [eventosCalendario, setEventosCalendario] = useState<
    { id: string; descricao: string; valor: number; data: string; tipo: "receita" | "despesa"; categoria_cor?: string }[]
  >([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }: { data: { user: User | null } }) => setUserId(user?.id || null));
  }, []);

  const loadMonths = useCallback(async () => {
    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "listar_meses", payload: {} }),
    });
    const { data } = await res.json();

    const meses = new Set<string>();
    if (data) data.forEach((t: any) => meses.add(t.data.slice(0, 7)));
    meses.add(hoje);
    getNextNMonths(hoje, 12).forEach((m) => meses.add(m));
    const sorted = Array.from(meses).sort();
    setAvailableMonths(sorted);
  }, [hoje]);

  const loadCalendar = useCallback(async () => {
    const resRec = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "listar_recorrentes_ativos", payload: {} }),
    });
    const { data: recorrentes } = await resRec.json();

    const resTrans = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "listar_transacoes_mes", payload: { inicio: `${hoje}-01`, fim: `${hoje}-31` } }),
    });
    const { data: transacoes } = await resTrans.json();

    const eventos: any[] = [];
    if (recorrentes) {
      recorrentes.forEach((r: any) => {
        const dataStr = `${hoje}-${String(r.dia_vencimento).padStart(2, "0")}`;
        if (dataStr >= `${hoje}-01`) {
          eventos.push({
            id: `rec-${r.id}`,
            descricao: r.descricao,
            valor: Number(r.valor),
            data: dataStr,
            tipo: r.tipo,
            categoria_cor: r.categoria_cor,
          });
        }
      });
    }
    if (transacoes) {
      transacoes
        .filter((t: any) => t.status === "pendente" && t.data >= `${hoje}-01`)
        .forEach((t: any) => {
          eventos.push({
            id: t.id,
            descricao: t.descricao,
            valor: Number(t.valor),
            data: t.data,
            tipo: t.tipo,
            categoria_cor: t.categoria_cor,
          });
        });
    }
    setEventosCalendario(eventos);
  }, [hoje]);

  const loadDashboard = useCallback(async () => {
    const { inicio, fim } = getMonthBounds(month);

    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "listar_transacoes_mes", payload: { inicio, fim } }),
    });
    const { data: transacoes } = await res.json();

    if (!transacoes) return;

    const confirmadas = transacoes.filter((t: any) => t.status === "confirmada");
    const pendentes = transacoes.filter((t: any) => t.status === "pendente");

    const totalReceitas = confirmadas
      .filter((t: any) => t.tipo === "receita")
      .reduce((s: number, t: any) => s + Number(t.valor), 0);
    const totalDespesas = confirmadas
      .filter((t: any) => t.tipo === "despesa")
      .reduce((s: number, t: any) => s + Number(t.valor), 0);
    const totalPendReceitas = pendentes
      .filter((t: any) => t.tipo === "receita")
      .reduce((s: number, t: any) => s + Number(t.valor), 0);
    const totalPendDespesas = pendentes
      .filter((t: any) => t.tipo === "despesa")
      .reduce((s: number, t: any) => s + Number(t.valor), 0);

    setReceitas(totalReceitas);
    setDespesas(totalDespesas);
    setPrevistoReceitas(totalPendReceitas);
    setPrevistoDespesas(totalPendDespesas);

    const dadosGrafico = mostrarPrevistas ? transacoes : confirmadas;
    const despGrafico = dadosGrafico.filter((t: any) => t.tipo === "despesa");

    const agg: Record<string, { nome: string; cor: string; valor: number }> =
      {};
    despGrafico.forEach((t: any) => {
      const key = t.categoria_nome || "Sem categoria";
      if (!agg[key]) {
        agg[key] = {
          nome: key,
          cor: t.categoria_cor || "#6366f1",
          valor: 0,
        };
      }
      agg[key].valor += Number(t.valor);
    });

    const sorted = Object.values(agg).sort((a, b) => b.valor - a.valor);
    setPieData(sorted);
    setRankingData(sorted.slice(0, 5));
  }, [month, mostrarPrevistas]);

  const loadComparativo = useCallback(async () => {
    const meses = getLast6Months(month);
    const realizados: { mes: string; receitas: number; despesas: number }[] = [];
    const totais: { mes: string; receitas: number; despesas: number }[] = [];

    for (const m of meses) {
      const { inicio, fim } = getMonthBounds(m);

      const res = await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "listar_totais_mes", payload: { inicio, fim } }),
      });
      const { data } = await res.json();

      const realizadas = (data || []).filter((t: any) => t.status === "confirmada");
      const todas = data || [];

      realizados.push({
        mes: monthLabel(m).split(" ")[0],
        receitas: realizadas
          .filter((t: any) => t.tipo === "receita")
          .reduce((s: number, t: any) => s + Number(t.valor), 0),
        despesas: realizadas
          .filter((t: any) => t.tipo === "despesa")
          .reduce((s: number, t: any) => s + Number(t.valor), 0),
      });

      totais.push({
        mes: monthLabel(m).split(" ")[0],
        receitas: todas
          .filter((t: any) => t.tipo === "receita")
          .reduce((s: number, t: any) => s + Number(t.valor), 0),
        despesas: todas
          .filter((t: any) => t.tipo === "despesa")
          .reduce((s: number, t: any) => s + Number(t.valor), 0),
      });
    }

    setComparativo(realizados);
    setComparativoTotal(totais);

    if (realizados.length >= 2) {
      const atual = realizados[realizados.length - 1];
      const anterior = realizados[realizados.length - 2];
      setVariacaoReceitas(
        anterior.receitas > 0
          ? Math.round(((atual.receitas - anterior.receitas) / anterior.receitas) * 100)
          : atual.receitas > 0 ? 100 : null
      );
      setVariacaoDespesas(
        anterior.despesas > 0
          ? Math.round(((atual.despesas - anterior.despesas) / anterior.despesas) * 100)
          : atual.despesas > 0 ? 100 : null
      );
    }
  }, [month]);

  const loadMetas = useCallback(async () => {
    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "listar_metas", payload: {} }),
    });
    const { data } = await res.json();
    if (data) setMetas(data);
  }, []);

  useEffect(() => {
    seedDefaultCategories();
  }, []);

  useEffect(() => {
    loadMonths();
    if (month === hoje) {
      autoCriarRecorrentes().then((c) => {
        if (c > 0) setRefreshKey((k) => k + 1);
      });
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    loadComparativo();
    loadCalendar();
    loadMetas();
  }, [loadDashboard, loadComparativo, loadCalendar, loadMetas, refreshKey]);

  useEffect(() => {
    if (!receitas && !despesas) return;
    setInsightsLoading(true);
    fetch("/api/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receitas,
        despesas,
        variacaoReceitas,
        variacaoDespesas,
        pieData,
        recentMonths: comparativo,
      }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setInsights(res.data);
        else setInsights([]);
      })
      .catch(() => setInsights([]))
      .finally(() => setInsightsLoading(false));
  }, [receitas, despesas, variacaoReceitas, variacaoDespesas, pieData, comparativo]);

  function handleRefresh() {
    setRefreshKey((k) => k + 1);
  }

  const sparklineReceitas = comparativo.map((m) => m.receitas);
  const sparklineDespesas = comparativo.map((m) => m.despesas);

  const saldoMedio =
    comparativo.length > 0
      ? comparativo.reduce((s, m) => s + (m.receitas - m.despesas), 0) / comparativo.length
      : 0;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <MonthSelector months={availableMonths} value={month} onChange={setMonth} />
            <button
              onClick={() => setCustomizeOpen(true)}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-slate-400 hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              title="Personalizar dashboard"
            >
              <Settings2 size={14} />
              <span className="hidden sm:inline">Personalizar</span>
            </button>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--foreground)]">
            <span className="hidden text-xs text-slate-400 sm:inline">Mostrar previstos</span>
            <button
              role="switch"
              aria-checked={mostrarPrevistas}
              onClick={() => setMostrarPrevistas((v) => !v)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                mostrarPrevistas ? "bg-[var(--accent)]" : "bg-[var(--muted)]"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform ${
                  mostrarPrevistas ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </label>
          <NewTransactionButton onDone={handleRefresh} currentMonth={hoje} />
        </div>

        <DashboardCards
          receitas={receitas}
          despesas={despesas}
          previstoReceitas={mostrarPrevistas ? previstoReceitas : 0}
          previstoDespesas={mostrarPrevistas ? previstoDespesas : 0}
          variacaoReceitas={variacaoReceitas}
          variacaoDespesas={variacaoDespesas}
          sparklineReceitas={sparklineReceitas}
          sparklineDespesas={sparklineDespesas}
        />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
          {prefs.insights && (
            <div className="lg:col-span-2">
              <FinancialInsights insights={insights} loading={insightsLoading} />
            </div>
          )}
          <div className="lg:col-span-1">
            <FinancialHealth
              score={0}
              receitas={receitas}
              despesas={despesas}
              recentMonths={comparativo}
              saldoMedio={saldoMedio}
            />
          </div>
          {prefs.calendar && (
            <div className="lg:col-span-1">
              <FinancialCalendar eventos={eventosCalendario} />
            </div>
          )}
        </div>

        {prefs.charts && (
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <ExpensePieChart data={pieData} />
            </div>
            <div className="lg:col-span-8">
              <MonthlyBarChart
                data={comparativo}
                previstoData={mostrarPrevistas ? comparativoTotal : undefined}
              />
            </div>
            <div className="lg:col-span-4">
              <ExpenseRanking data={rankingData} />
            </div>
            {prefs.metas && (
              <div className="lg:col-span-8">
                <MetasDashboard
                  metas={metas}
                  onOpenPage={() => window.location.href = "/metas"}
                />
              </div>
            )}
          </div>
        )}

        <div className="mt-8">
          <TransactionList month={month} refreshKey={refreshKey} currentMonth={hoje} onRefresh={handleRefresh} />
        </div>
      </main>

      <WelcomeTutorial />

      <Modal open={customizeOpen} onClose={() => setCustomizeOpen(false)} title="Personalizar Dashboard">
        <div className="flex flex-col gap-3">
          {(Object.keys(widgetLabels) as WidgetKey[]).map((key) => (
            <label
              key={key}
              className="flex cursor-pointer items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3 text-sm hover:bg-[var(--muted)]/30 transition-colors"
            >
              <span className="font-medium text-[var(--foreground)]">{widgetLabels[key]}</span>
              <button
                role="switch"
                aria-checked={prefs[key]}
                onClick={() => toggle(key)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  prefs[key] ? "bg-[var(--accent)]" : "bg-[var(--muted)]"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform ${
                    prefs[key] ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </label>
          ))}
        </div>
      </Modal>
    </>
  );
}
