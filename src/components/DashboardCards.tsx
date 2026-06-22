"use client";

import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Wallet, TrendingUp, TrendingDown, Minus, PiggyBank, ShoppingBag } from "lucide-react";
import { Card } from "./ui/Card";
import { SparklineChart } from "./SparklineChart";
import { formatCurrency } from "@/lib/utils";

type Props = {
  receitas: number;
  despesas: number;
  previstoReceitas?: number;
  previstoDespesas?: number;
  variacaoReceitas?: number | null;
  variacaoDespesas?: number | null;
  sparklineReceitas?: number[];
  sparklineDespesas?: number[];
};

export function DashboardCards({ receitas, despesas, previstoReceitas = 0, previstoDespesas = 0, variacaoReceitas, variacaoDespesas, sparklineReceitas, sparklineDespesas }: Props) {
  const saldo = receitas - despesas;

  function TrendBadge({ value, good }: { value: number; good: "up" | "down" }) {
    const isUp = value > 0;
    const isGood = good === "up" ? isUp : !isUp;
    const Icon = value === 0 ? Minus : isUp ? TrendingUp : TrendingDown;
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${value === 0 ? "text-[var(--muted-foreground)]" : isGood ? "text-emerald-500" : "text-red-500"}`}>
        <Icon size={11} />
        {Math.abs(value)}%
      </span>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 h-40 w-40 translate-x-10 -translate-y-10 rounded-full bg-[var(--accent)]/5 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent)]/5">
              <Wallet size={20} style={{ color: "var(--accent)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Saldo
              </p>
              <p className={`mt-1 text-2xl font-bold tracking-tight ${saldo >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {formatCurrency(saldo)}
              </p>
              <p className="mt-1.5 text-xs text-slate-400">
                {receitas > 0 || despesas > 0
                  ? saldo >= 0
                    ? "Receitas superam despesas"
                    : "Despesas superam receitas"
                  : "Nenhuma transação"}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.25, ease: "easeOut" }}
        whileHover={{ scale: 1.02 }}
      >
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <ArrowUp size={20} className="text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Recebido</p>
              <p className="text-2xl font-bold tracking-tight text-emerald-500">
                {formatCurrency(receitas)}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                {variacaoReceitas !== null && variacaoReceitas !== undefined && (
                  <>
                    <TrendBadge value={variacaoReceitas} good="up" />
                    <span className="text-xs text-slate-400">vs mês anterior</span>
                  </>
                )}
                {previstoReceitas > 0 && (
                  <span className="text-xs text-slate-400">
                    +{formatCurrency(previstoReceitas)} previsto
                  </span>
                )}
              </div>
              {sparklineReceitas && sparklineReceitas.length >= 2 && (
                <div className="mt-3">
                  <SparklineChart data={sparklineReceitas} color="#10B981" />
                </div>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.25, ease: "easeOut" }}
        whileHover={{ scale: 1.02 }}
      >
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-red-500/10">
              <ArrowDown size={20} className="text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Gasto</p>
              <p className="text-2xl font-bold tracking-tight text-red-500">
                {formatCurrency(despesas)}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                {variacaoDespesas !== null && variacaoDespesas !== undefined && (
                  <>
                    <TrendBadge value={variacaoDespesas} good="down" />
                    <span className="text-xs text-slate-400">vs mês anterior</span>
                  </>
                )}
                {previstoDespesas > 0 && (
                  <span className="text-xs text-slate-400">
                    +{formatCurrency(previstoDespesas)} previsto
                  </span>
                )}
              </div>
              {sparklineDespesas && sparklineDespesas.length >= 2 && (
                <div className="mt-3">
                  <SparklineChart data={sparklineDespesas} color="#ef4444" />
                </div>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
