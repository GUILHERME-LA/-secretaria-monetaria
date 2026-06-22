"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { FileText, FileSpreadsheet, Loader2, BarChart3, ArrowRight, Lightbulb, PieChart, List } from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MonthSelector } from "@/components/MonthSelector";
import { ExpensePieChart } from "@/components/ExpensePieChart";
import { ExpenseRanking } from "@/components/ExpenseRanking";
import { TransactionList } from "@/components/TransactionList";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { formatCurrency, getCurrentMonth, getMonthBounds, getLast6Months, monthLabel } from "@/lib/utils";
import type { Insight } from "@/lib/insights-engine";

const CORES_PALETA = ["#6366f1", "#8b5cf6", "#f97316", "#06b6d4", "#ec4899", "#eab308", "#14b8a6", "#3b82f6", "#d946ef", "#78716c"];

export default function RelatoriosPage() {
  const hoje = getCurrentMonth();
  const [month, setMonth] = useState(hoje);
  const [availableMonths, setAvailableMonths] = useState<string[]>([hoje]);
  const [loading, setLoading] = useState(true);
  const [receitas, setReceitas] = useState(0);
  const [despesas, setDespesas] = useState(0);
  const [pieData, setPieData] = useState<{ nome: string; cor: string; valor: number }[]>([]);
  const [rankingData, setRankingData] = useState<{ nome: string; cor: string; valor: number }[]>([]);
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [comparativo, setComparativo] = useState<{ mes: string; receitas: number; despesas: number }[]>([]);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [showFiltradas, setShowFiltradas] = useState(false);

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
    setAvailableMonths(Array.from(meses).sort());
  }, [hoje]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setCategoriaFiltro(null);
    setShowFiltradas(false);
    setInsight(null);
    const { inicio, fim } = getMonthBounds(month);

    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "listar_transacoes_mes", payload: { inicio, fim } }),
    });
    const { data: transacoesRaw } = await res.json();
    setTransacoes(transacoesRaw || []);

    const confirmadas = (transacoesRaw || []).filter((t: any) => t.status === "confirmada");
    const totalReceitas = confirmadas
      .filter((t: any) => t.tipo === "receita")
      .reduce((s: number, t: any) => s + Number(t.valor), 0);
    const totalDespesas = confirmadas
      .filter((t: any) => t.tipo === "despesa")
      .reduce((s: number, t: any) => s + Number(t.valor), 0);
    setReceitas(totalReceitas);
    setDespesas(totalDespesas);

    const despGrafico = confirmadas.filter((t: any) => t.tipo === "despesa");
    const agg: Record<string, { nome: string; cor: string; valor: number }> = {};
    despGrafico.forEach((t: any) => {
      const key = t.categoria_nome || "Sem categoria";
      if (!agg[key]) agg[key] = { nome: key, cor: t.categoria_cor || "#6366f1", valor: 0 };
      agg[key].valor += Number(t.valor);
    });
    const sorted = Object.values(agg).sort((a, b) => b.valor - a.valor);
    setPieData(sorted);
    setRankingData(sorted.slice(0, 5));

    const meses = getLast6Months(month);
    const comp: { mes: string; receitas: number; despesas: number }[] = [];
    for (const m of meses) {
      const b = getMonthBounds(m);
      const r = await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "listar_totais_mes", payload: { inicio: b.inicio, fim: b.fim } }),
      });
      const { data: d } = await r.json();
      const realizadas = (d || []).filter((t: any) => t.status === "confirmada");
      comp.push({
        mes: monthLabel(m).split(" ")[0],
        receitas: realizadas.filter((t: any) => t.tipo === "receita").reduce((s: number, t: any) => s + Number(t.valor), 0),
        despesas: realizadas.filter((t: any) => t.tipo === "despesa").reduce((s: number, t: any) => s + Number(t.valor), 0),
      });
    }
    setComparativo(comp);
    setLoading(false);
  }, [month]);

  useEffect(() => { loadMonths(); }, [loadMonths]);
  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!receitas && !despesas) return;
    fetch("/api/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receitas,
        despesas,
        variacaoReceitas: null,
        variacaoDespesas: null,
        pieData,
        recentMonths: comparativo,
      }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data?.length > 0) setInsight(res.data[0]);
      })
      .catch(() => {});
  }, [receitas, despesas, pieData, comparativo]);

  function handleCategoriaClick(nome: string) {
    setCategoriaFiltro(categoriaFiltro === nome ? null : nome);
    setShowFiltradas(true);
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório Financeiro", 14, 22);
    doc.setFontSize(10);
    doc.text(`Período: ${monthLabel(month)}`, 14, 30);
    doc.setFontSize(12);
    doc.text("Resumo", 14, 42);
    autoTable(doc, {
      startY: 46,
      head: [["Indicador", "Valor"]],
      body: [
        ["Receitas", formatCurrency(receitas)],
        ["Despesas", formatCurrency(despesas)],
        ["Saldo", formatCurrency(receitas - despesas)],
      ],
      theme: "grid",
      headStyles: { fillColor: "#6366f1" },
    });
    doc.setFontSize(12);
    const yPos = (doc as any).lastAutoTable.finalY + 10;
    doc.text("Transações", 14, yPos);
    autoTable(doc, {
      startY: yPos + 4,
      head: [["Data", "Tipo", "Categoria", "Descrição", "Valor", "Status"]],
      body: transacoes.map((t: any) => [
        new Date(t.data + "T12:00:00").toLocaleDateString("pt-BR"),
        t.tipo === "receita" ? "Receita" : "Despesa",
        t.categoria_nome || "-",
        t.descricao,
        formatCurrency(Number(t.valor)),
        t.status === "confirmada" ? "Confirmada" : "Pendente",
      ]),
      theme: "grid",
      headStyles: { fillColor: "#6366f1" },
    });
    doc.save(`relatorio-${month}.pdf`);
  }

  function exportExcel() {
    const wsData = [
      ["Relatório Financeiro", monthLabel(month)],
      [],
      ["Indicador", "Valor"],
      ["Receitas", receitas],
      ["Despesas", despesas],
      ["Saldo", receitas - despesas],
      [],
      ["Data", "Tipo", "Categoria", "Descrição", "Valor", "Status"],
      ...transacoes.map((t: any) => [
        new Date(t.data + "T12:00:00").toLocaleDateString("pt-BR"),
        t.tipo === "receita" ? "Receita" : "Despesa",
        t.categoria_nome || "-",
        t.descricao,
        Number(t.valor),
        t.status === "confirmada" ? "Confirmada" : "Pendente",
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `relatorio-${month}.xlsx`);
  }

  const temDados = receitas > 0 || despesas > 0 || transacoes.length > 0;

  const insightStyle = insight
    ? {
        negative: { bg: "bg-red-500/8", border: "border-red-500/20" },
        positive: { bg: "bg-emerald-500/8", border: "border-emerald-500/20" },
        info: { bg: "bg-[var(--accent)]/8", border: "border-[var(--accent)]/20" },
      }[insight.type] || { bg: "bg-[var(--accent)]/8", border: "border-[var(--accent)]/20" }
    : null;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Relatórios</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Visualize tendências, exporte dados e tome decisões financeiras mais informadas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <MonthSelector months={availableMonths} value={month} onChange={setMonth} />
          </div>
        </div>

        <div className="mb-8 flex gap-2">
          <button
            onClick={exportPDF}
            disabled={!temDados}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileText size={16} />
            Exportar PDF
          </button>
          <button
            onClick={exportExcel}
            disabled={!temDados}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet size={16} />
            Exportar Excel
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <Loader2 className="h-8 w-8 text-[var(--accent)]" />
            </motion.div>
          </div>
        ) : !temDados ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] px-6 py-16 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--muted)]">
              <BarChart3 size={32} className="text-[var(--muted-foreground)]" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-[var(--foreground)]">Nenhum dado no período</h2>
            <p className="mb-6 max-w-md text-sm text-[var(--muted-foreground)]">
              Selecione outro mês com transações registradas ou cadastre suas primeiras receitas e despesas para gerar relatórios completos.
            </p>
            <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-4">
              {[["1", "Cadastre transações"], ["2", "Selecione o período"], ["3", "Analise os gráficos"], ["4", "Exporte em PDF/Excel"]].map(([num, text]) => (
                <div key={num} className="flex items-center gap-2 rounded-xl bg-[var(--muted)]/50 px-4 py-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">{num}</span>
                  <span className="text-[var(--foreground)]">{text}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {insight && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-8 flex min-w-0 items-start gap-3 rounded-xl border px-4 py-3 ${insightStyle?.bg} ${insightStyle?.border}`}
              >
                <span className="mt-0.5 block text-lg leading-none">{insight.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-[var(--foreground)]">{insight.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{insight.description}</p>
                </div>
              </motion.div>
            )}

            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                <Card>
                  <p className="text-xs font-medium text-[var(--muted-foreground)]">Receitas</p>
                  <p className="mt-1 text-2xl font-bold text-green-500">{formatCurrency(receitas)}</p>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.2 }}>
                <Card>
                  <p className="text-xs font-medium text-[var(--muted-foreground)]">Despesas</p>
                  <p className="mt-1 text-2xl font-bold text-red-500">{formatCurrency(despesas)}</p>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.2 }}>
                <Card>
                  <p className="text-xs font-medium text-[var(--muted-foreground)]">Saldo</p>
                  <p className={`mt-1 text-2xl font-bold ${receitas - despesas >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {formatCurrency(receitas - despesas)}
                  </p>
                </Card>
              </motion.div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="cursor-pointer" onClick={() => {}}>
                <ExpensePieChart data={pieData} />
              </div>
              <div>
                <ExpenseRanking data={rankingData} onCategoryClick={handleCategoriaClick} activeCategory={categoriaFiltro} />
              </div>
            </div>

            {showFiltradas && categoriaFiltro && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex items-center gap-2 rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-2"
              >
                <List size={14} style={{ color: "var(--accent)" }} />
                <p className="text-xs text-[var(--foreground)]">
                  Transações filtradas por: <span className="font-semibold">{categoriaFiltro}</span>
                </p>
                <button
                  onClick={() => { setCategoriaFiltro(null); setShowFiltradas(false); }}
                  className="ml-auto cursor-pointer text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline transition-colors"
                >
                  Limpar filtro
                </button>
              </motion.div>
            )}

            <div className="mb-8">
              <CategoryBreakdown
                transactions={transacoes}
                tipo="despesa"
                categoriaFiltro={categoriaFiltro}
                onCategoriaClick={handleCategoriaClick}
              />
            </div>

            <TransactionList month={month} refreshKey={0} />

            <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10">
                  <ArrowRight size={16} style={{ color: "var(--accent)" }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">Relatórios para decisões melhores</p>
                  <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                    Use os relatórios para identificar padrões de gastos, comparar meses e tomar decisões financeiras baseadas em dados reais. Exporte em PDF para compartilhar ou Excel para análises mais detalhadas.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
