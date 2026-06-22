"use client";

import { Trophy } from "lucide-react";
import { Card } from "./ui/Card";
import { EmptyState } from "./ui/EmptyState";
import { formatCurrency } from "@/lib/utils";

type Props = {
  data: { nome: string; cor: string; valor: number }[];
};

export function ExpenseRanking({ data }: Props) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="Onde mais gastei"
        description="Nenhuma despesa registrada neste mês."
      />
    );
  }

  const maxValor = data[0]?.valor || 1;

  function rank(i: number) {
    if (i === 0) return <span className="text-amber-500">1</span>;
    if (i === 1) return <span className="text-slate-400">2</span>;
    if (i === 2) return <span className="text-orange-700">3</span>;
    return <span className="text-[var(--muted-foreground)]">{i + 1}</span>;
  }

  return (
    <Card>
      <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">
        Onde mais gastei
      </h3>
      <div className="flex flex-col gap-4">
        {data.map((item, idx) => (
          <div key={item.nome}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--muted)] text-xs font-bold">
                  {rank(idx)}
                </span>
                <span className="text-[var(--foreground)]">{item.nome}</span>
              </div>
              <span className="font-semibold text-[var(--foreground)]">
                {formatCurrency(item.valor)}
              </span>
            </div>
            <div
              className="h-3 overflow-hidden rounded-full"
              style={{ backgroundColor: `${item.cor}20` }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(item.valor / maxValor) * 100}%`,
                  backgroundColor: item.cor,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
