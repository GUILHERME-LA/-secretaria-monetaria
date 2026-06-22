"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ChevronDown, ArrowDown, ArrowUp, Tag } from "lucide-react";

type Transaction = {
  id?: string;
  categoria_nome?: string;
  categoria_cor?: string;
  descricao: string;
  valor: number;
  data: string;
  tipo: string;
  status: string;
};

type CategoryGroup = {
  nome: string;
  cor: string;
  valor: number;
  count: number;
  transacoes: Transaction[];
};

type Props = {
  transactions: Transaction[];
  tipo?: "receita" | "despesa";
  categoriaFiltro?: string | null;
  onCategoriaClick?: (nome: string) => void;
};

export function CategoryBreakdown({ transactions, tipo = "despesa", categoriaFiltro, onCategoriaClick }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = transactions.filter(
    (t) => t.tipo === tipo && t.status === "confirmada"
  );

  const groups: CategoryGroup[] = [];
  const map: Record<string, CategoryGroup> = {};

  filtered.forEach((t) => {
    const key = t.categoria_nome || "Sem categoria";
    if (!map[key]) {
      const g: CategoryGroup = {
        nome: key,
        cor: t.categoria_cor || "#6366f1",
        valor: 0,
        count: 0,
        transacoes: [],
      };
      map[key] = g;
      groups.push(g);
    }
    map[key].valor += Number(t.valor);
    map[key].count++;
    map[key].transacoes.push(t);
  });

  groups.sort((a, b) => b.valor - a.valor);

  const total = groups.reduce((s, g) => s + g.valor, 0);

  if (groups.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">
        {tipo === "despesa" ? "Gastos" : "Receitas"} por categoria
      </h2>

      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        {groups.map((g) => {
          const isOpen = expanded === g.nome;
          const pct = total > 0 ? (g.valor / total) * 100 : 0;
          const isActive = categoriaFiltro === g.nome;
          const isClickable = !!onCategoriaClick;

          return (
            <div
              key={g.nome}
              className={`${isClickable ? "cursor-pointer" : ""} ${
                isActive ? "" : categoriaFiltro ? "opacity-40" : ""
              } hover:opacity-100 transition-opacity`}
            >
              <button
                onClick={() => {
                  if (isClickable) onCategoriaClick(g.nome);
                  setExpanded(isOpen ? null : g.nome);
                }}
                className="flex w-full cursor-pointer items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-4 py-3 text-left transition-colors hover:bg-[var(--muted)]/50"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: g.cor }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-[var(--foreground)]">
                      {g.nome}
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-[var(--foreground)]">
                      {formatCurrency(g.valor)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--muted)]">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%`, backgroundColor: g.cor }}
                      />
                    </div>
                    <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                      {g.count} {g.count === 1 ? "transação" : "transações"} · {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-[var(--muted-foreground)] transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-b border-[var(--border)] bg-[var(--muted)]/10">
                      {g.transacoes
                        .sort((a, b) => a.data.localeCompare(b.data))
                        .map((t, i) => (
                          <div
                            key={t.id || i}
                            className="flex items-center justify-between border-b border-[var(--border)]/50 px-4 py-2.5 pl-10 last:border-b-0"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`flex h-6 w-6 items-center justify-center rounded-md ${
                                  t.tipo === "receita"
                                    ? "bg-green-500/10"
                                    : "bg-red-500/10"
                                }`}
                              >
                                {t.tipo === "receita" ? (
                                  <ArrowUp size={11} className="text-emerald-500" />
                                ) : (
                                  <ArrowDown size={11} className="text-red-500" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm text-[var(--foreground)]">
                                  {t.descricao}
                                </p>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                  {formatDate(t.data)}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`text-sm font-semibold ${
                                t.tipo === "receita"
                                  ? "text-emerald-500"
                                  : "text-red-500"
                              }`}
                            >
                              {t.tipo === "receita" ? "+" : "-"}
                              {formatCurrency(Number(t.valor))}
                            </span>
                          </div>
                        ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        <div className="flex items-center justify-between bg-[var(--muted)]/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <Tag size={14} className="text-[var(--muted-foreground)]" />
            <span className="text-sm font-medium text-[var(--foreground)]">
              Total · {groups.length} {groups.length === 1 ? "categoria" : "categorias"}
            </span>
          </div>
          <span className="text-sm font-bold text-[var(--foreground)]">
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
