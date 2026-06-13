"use client";

import { useEffect, useState, useCallback, useMemo } from "react";

export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase-client";
import {
  getCurrentMonth,
  getMonthBounds,
  getLast6Months,
  getNextNMonths,
  monthLabel,
} from "@/lib/utils";
import { autoCriarRecorrentes } from "@/lib/auto-criar-recorrentes";
import { Header } from "@/components/Header";
import { DashboardCards } from "@/components/DashboardCards";
import { MonthSelector } from "@/components/MonthSelector";
import { NewTransactionButton } from "@/components/NewTransactionButton";
import { ExpensePieChart } from "@/components/ExpensePieChart";
import { ExpenseRanking } from "@/components/ExpenseRanking";
import { MonthlyBarChart } from "@/components/MonthlyBarChart";
import { TransactionList } from "@/components/TransactionList";
import { ChatFab } from "@/components/ChatFab";
import { WelcomeTutorial } from "@/components/WelcomeTutorial";
import { seedDefaultCategories } from "@/lib/seed-categories";

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const hoje = getCurrentMonth();
  const [month, setMonth] = useState(hoje);
  const [refreshKey, setRefreshKey] = useState(0);
  const [availableMonths, setAvailableMonths] = useState<string[]>([hoje]);
  const [mostrarPrevistas, setMostrarPrevistas] = useState(true);

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

  const loadMonths = useCallback(async () => {
    const { data } = await supabase
      .from("sm_transacoes")
      .select("data")
      .order("data", { ascending: true });

    const meses = new Set<string>();
    if (data) data.forEach((t: any) => meses.add(t.data.slice(0, 7)));
    meses.add(hoje);
    getNextNMonths(hoje, 12).forEach((m) => meses.add(m));
    const sorted = Array.from(meses).sort();
    setAvailableMonths(sorted);
  }, [supabase, hoje]);

  const loadDashboard = useCallback(async () => {
    const { inicio, fim } = getMonthBounds(month);

    const { data: transacoes } = await supabase
      .from("sm_transacoes")
      .select("*, categorias(nome, cor)")
      .gte("data", inicio)
      .lte("data", fim);

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
      const key = t.categorias?.nome || "Sem categoria";
      if (!agg[key]) {
        agg[key] = {
          nome: key,
          cor: t.categorias?.cor || "#6366f1",
          valor: 0,
        };
      }
      agg[key].valor += Number(t.valor);
    });

    const sorted = Object.values(agg).sort((a, b) => b.valor - a.valor);
    setPieData(sorted);
    setRankingData(sorted.slice(0, 5));
  }, [month, supabase, mostrarPrevistas]);

  const loadComparativo = useCallback(async () => {
    const meses = getLast6Months(month);
    const realizados: { mes: string; receitas: number; despesas: number }[] = [];
    const totais: { mes: string; receitas: number; despesas: number }[] = [];

    for (const m of meses) {
      const { inicio, fim } = getMonthBounds(m);

      const { data } = await supabase
        .from("sm_transacoes")
        .select("tipo, valor, status")
        .gte("data", inicio)
        .lte("data", fim);

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
  }, [month, supabase]);

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
  }, [loadDashboard, loadComparativo, refreshKey]);

  function handleRefresh() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <MonthSelector months={availableMonths} value={month} onChange={setMonth} />
          <NewTransactionButton onDone={handleRefresh} currentMonth={hoje} />
        </div>

        <label className="mb-6 flex w-fit cursor-pointer items-center gap-2 text-sm text-[var(--foreground)]">
          <input
            type="checkbox"
            checked={mostrarPrevistas}
            onChange={() => setMostrarPrevistas((v) => !v)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Mostrar valores previstos
        </label>

        <div className="mb-6">
          <DashboardCards
            receitas={receitas}
            despesas={despesas}
            previstoReceitas={mostrarPrevistas ? previstoReceitas : 0}
            previstoDespesas={mostrarPrevistas ? previstoDespesas : 0}
          />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ExpensePieChart data={pieData} />
          <ExpenseRanking data={rankingData} />
        </div>

        <div className="mb-6">
          <MonthlyBarChart
            data={comparativo}
            previstoData={mostrarPrevistas ? comparativoTotal : undefined}
          />
        </div>

        <TransactionList month={month} refreshKey={refreshKey} currentMonth={hoje} />
      </main>

      <ChatFab onDone={handleRefresh} />
      <WelcomeTutorial />
    </>
  );
}
