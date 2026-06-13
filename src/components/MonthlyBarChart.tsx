"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card } from "./ui/Card";

type Props = {
  data: { mes: string; receitas: number; despesas: number }[];
};

export function MonthlyBarChart({ data }: Props) {
  if (data.length === 0) return null;

  return (
    <Card>
      <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">
        Comparativo Mensal
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <XAxis
            dataKey="mes"
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={60}
            tickFormatter={(v: number) => {
              if (Math.abs(v) >= 1000000) return (v / 1000000).toFixed(1) + "M";
              if (Math.abs(v) >= 1000) return "R$ " + (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + "k";
              return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
            }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "13px",
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
          <Legend
            wrapperStyle={{ fontSize: 12, color: "var(--foreground)" }}
          />
          <Bar
            dataKey="receitas"
            name="Receitas"
            fill="#22c55e"
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
          />
          <Bar
            dataKey="despesas"
            name="Despesas"
            fill="#ef4444"
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
