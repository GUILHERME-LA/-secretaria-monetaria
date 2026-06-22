"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import { Card } from "./ui/Card";
import { EmptyState } from "./ui/EmptyState";
import { formatCurrency } from "@/lib/utils";

type Props = {
  data: { nome: string; cor: string; valor: number }[];
};

export function ExpensePieChart({ data }: Props) {
  const total = data.reduce((s, i) => s + i.valor, 0);

  if (data.length === 0) {
    return (
      <EmptyState
        icon={PieChartIcon}
        title="Gastos por Categoria"
        description="Nenhuma despesa registrada neste mês."
      />
    );
  }

  return (
    <Card>
      <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">
        Gastos por Categoria
      </h3>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="relative w-full shrink-0 lg:w-48">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                dataKey="valor"
                nameKey="nome"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={3}
                isAnimationActive={true}
              >
                {data.map((entry, idx) => (
                  <Cell key={idx} fill={entry.cor} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  fontSize: "13px",
                  boxShadow: "var(--shadow-lg)",
                  pointerEvents: "none",
                }}
                formatter={(value) =>
                  typeof value === "number"
                    ? value.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                    : value
                }
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-base font-bold tracking-tight text-[var(--foreground)]">
              {formatCurrency(total)}
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)]">Total gasto</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {data.map((item) => (
            <div key={item.nome} className="flex items-center gap-2 text-xs">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.cor }}
              />
              <span className="text-[var(--muted-foreground)]">{item.nome}</span>
              <span className="font-medium text-[var(--foreground)]">
                {((item.valor / total) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
