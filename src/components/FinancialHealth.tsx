"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { HeartPulse, AlertTriangle, Smile, Sparkles, Info } from "lucide-react";
import { Card } from "@/components/ui/Card";

type Props = {
  score: number;
  receitas: number;
  despesas: number;
  recentMonths: { receitas: number; despesas: number }[];
  saldoMedio: number;
};

type Breakdown = {
  label: string;
  points: number;
  max: number;
  detail: string;
};

function calcBreakdown(
  receitas: number,
  despesas: number,
  recentMonths: { receitas: number; despesas: number }[],
  saldoMedio: number
): { breakdown: Breakdown[]; score: number; label: string; color: string; icon: typeof HeartPulse } {
  const items: Breakdown[] = [];
  let pontos = 0;

  if (receitas > 0) {
    const proporcao = despesas / receitas;
    let p = 0;
    if (proporcao <= 0.5) p = 30;
    else if (proporcao <= 0.75) p = 22;
    else if (proporcao <= 0.9) p = 14;
    else p = 5;
    pontos += p;
    items.push({
      label: "Proporção receita/despesa",
      points: p,
      max: 30,
      detail: `${(proporcao * 100).toFixed(0)}% da receita gasta em despesas`,
    });
  } else {
    items.push({ label: "Proporção receita/despesa", points: 0, max: 30, detail: "Sem receita registrada" });
  }

  if (recentMonths.length >= 3) {
    const ultimos3 = recentMonths.slice(-3);
    const positivos = ultimos3.filter((m) => m.receitas >= m.despesas).length;
    const p = Math.round((positivos / 3) * 25);
    pontos += p;
    items.push({
      label: "Meses no azul",
      points: p,
      max: 25,
      detail: `${positivos} de 3 meses com saldo positivo`,
    });
  } else if (recentMonths.length > 0) {
    const positivos = recentMonths.filter((m) => m.receitas >= m.despesas).length;
    const p = Math.round((positivos / recentMonths.length) * 25);
    pontos += p;
    items.push({
      label: "Meses no azul",
      points: p,
      max: 25,
      detail: `${positivos} de ${recentMonths.length} meses com saldo positivo`,
    });
  } else {
    items.push({ label: "Meses no azul", points: 0, max: 25, detail: "Sem histórico mensal" });
  }

  const cobertura =
    despesas > 0 && saldoMedio > 0
      ? Math.min(saldoMedio / (despesas / 30), 1)
      : 0;
  const pCobertura = Math.round(cobertura * 25);
  pontos += pCobertura;
  const diasCobertura = despesas > 0 && saldoMedio > 0
    ? Math.round(saldoMedio / (despesas / 30))
    : 0;
  items.push({
    label: "Reserva de emergência",
    points: pCobertura,
    max: 25,
    detail: diasCobertura > 0
      ? `${diasCobertura} dias de cobertura`
      : "Sem reserva de emergência",
  });

  if (receitas > 0 && despesas > 0) {
    const ultimoMes =
      recentMonths.length > 0 ? recentMonths[recentMonths.length - 1] : null;
    if (ultimoMes) {
      const delta =
        ultimoMes.receitas > 0
          ? (ultimoMes.receitas - (receitas - despesas)) / ultimoMes.receitas
          : 0;
      let p = 0;
      if (delta > 0.1) p = 15;
      else if (delta > 0) p = 10;
      pontos += p;
      items.push({
        label: "Evolução mensal",
        points: p,
        max: 15,
        detail: delta > 0 ? "Margem melhor que o mês anterior" : "Margem estável ou em queda",
      });
    } else {
      items.push({ label: "Evolução mensal", points: 0, max: 15, detail: "Sem dados do mês anterior" });
    }
  } else {
    items.push({ label: "Evolução mensal", points: 0, max: 15, detail: "Sem receita ou despesa" });
  }

  if (saldoMedio <= 0 && despesas > 0) {
    pontos = Math.min(pontos, 30);
  }

  const final = Math.min(Math.max(pontos, 0), 100);

  if (final >= 70)
    return { breakdown: items, score: final, label: "Excelente", color: "#10B981", icon: Sparkles };
  if (final >= 40)
    return { breakdown: items, score: final, label: "Bom", color: "#eab308", icon: Smile };
  return { breakdown: items, score: final, label: "Atenção", color: "#ef4444", icon: AlertTriangle };
}

export function FinancialHealth(props: Props) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const { breakdown, score, label, color, icon: Icon } = calcBreakdown(
    props.receitas, props.despesas, props.recentMonths, props.saldoMedio
  );

  const recomendacoes: string[] = [];
  if (props.despesas > props.receitas) {
    recomendacoes.push("Suas despesas superam as receitas. Revise gastos não essenciais.");
  }
  if (props.saldoMedio <= 0) {
    recomendacoes.push("Construa uma reserva de emergência com 3 a 6 meses de gastos.");
  }
  if (props.recentMonths.length >= 2 && props.despesas > 0 && props.receitas > 0 && props.despesas / props.receitas > 0.9) {
    recomendacoes.push("Sua margem está apertada. Tente reduzir 10% dos gastos variáveis.");
  }
  if (recomendacoes.length === 0 && score < 70) {
    recomendacoes.push("Mantenha o controle mensal dos gastos para melhorar seu score.");
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--foreground)] whitespace-nowrap">
              Saúde Financeira
            </h3>
              <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="cursor-pointer text-slate-400 hover:text-[var(--foreground)] transition-colors"
                title="Ver detalhes do score"
              >
              <Info size={14} />
            </button>
          </div>
          <div className="flex items-baseline gap-2">
            <motion.span
              key={score}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="text-3xl font-bold tracking-tight"
              style={{ color }}
            >
              {score}
            </motion.span>
              <span className="text-sm font-medium text-slate-400">
                / 100
              </span>
          </div>
          <span
            className="mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ backgroundColor: `${color}15`, color }}
          >
            <Icon size={12} />
            {label}
          </span>
        </div>
        <div className="relative h-20 w-28 shrink-0">
          <svg className="h-full w-full" viewBox="0 0 36 20">
            <path
              d="M 3 17 A 15 15 0 0 1 33 17"
              fill="none"
              stroke="var(--muted)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <motion.path
              d="M 3 17 A 15 15 0 0 1 33 17"
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${score * 0.471} 47.1`}
              initial={{ strokeDasharray: "0 47.1" }}
              animate={{ strokeDasharray: `${score * 0.471} 47.1` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </svg>
        </div>
      </div>

      {showBreakdown && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 space-y-2 border-t border-[var(--border)] pt-3"
        >
          {breakdown.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-xs">
              <div className="flex-1">
                <p className="font-medium text-[var(--foreground)]">{item.label}</p>
                <p className="text-[var(--muted-foreground)]">{item.detail}</p>
              </div>
              <div className="ml-3 flex items-center gap-2">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--muted)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(item.points / item.max) * 100}%`,
                      backgroundColor: item.points >= item.max * 0.7 ? "#10B981" : item.points >= item.max * 0.4 ? "#eab308" : "#ef4444",
                    }}
                  />
                </div>
                <span className="w-8 text-right font-medium tabular-nums text-[var(--foreground)]">
                  {item.points}/{item.max}
                </span>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {recomendacoes.length > 0 && (
        <div className="mt-4 space-y-1.5 border-t border-[var(--border)] pt-3">
          {recomendacoes.slice(0, 2).map((r, i) => (
            <p key={i} className="flex items-start gap-2 text-xs text-[var(--muted-foreground)]">
              <span className="mt-0.5 shrink-0 text-[10px]">•</span>
              {r}
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}
