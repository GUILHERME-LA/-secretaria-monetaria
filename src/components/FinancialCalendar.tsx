"use client";

import { useMemo } from "react";
import { Calendar, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";

type Evento = {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  tipo: "receita" | "despesa";
  categoria_cor?: string;
};

type Props = {
  eventos: Evento[];
};

function diasAte(dataStr: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(dataStr + "T12:00:00");
  alvo.setHours(0, 0, 0, 0);
  return Math.ceil((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

export function FinancialCalendar({ eventos }: Props) {
  const sorted = useMemo(
    () => [...eventos].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()),
    [eventos]
  );

  if (sorted.length === 0) {
    return (
      <Card>
        <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">
          Próximos Eventos
        </h3>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)]/10">
            <Calendar size={26} className="text-[var(--accent)]" />
          </div>
          <p className="text-sm font-medium text-[var(--foreground)]">
            Nenhum evento futuro
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Crie contas recorrentes para ver aqui os próximos vencimentos.
          </p>
          <a
            href="/recorrentes"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)]/10 px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors"
          >
            📅 Agendar transação
          </a>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">
        Próximos Eventos
      </h3>
      <div className="flex flex-col gap-2">
        {sorted.slice(0, 7).map((ev) => {
          const diff = diasAte(ev.data);
          const badge =
            diff <= 0
              ? "Vence hoje"
              : diff === 1
              ? "Vence amanhã"
              : `Vence em ${diff} dias`;
          const urgente = diff <= 1;

          return (
            <div
              key={ev.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm transition-colors hover:bg-[var(--muted)]/30"
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: `${ev.categoria_cor || "#6366f1"}15`,
                }}
              >
                <Calendar
                  size={14}
                  style={{ color: ev.categoria_cor || "#6366f1" }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[var(--foreground)]">
                  {ev.descricao}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(ev.data + "T12:00:00").toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span
                  className={`text-xs font-semibold ${
                    ev.tipo === "receita" ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {ev.tipo === "receita" ? "+" : "-"}
                  {formatCurrency(ev.valor)}
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${
                    urgente ? "text-red-500" : "text-slate-400"
                  }`}
                >
                  {urgente && <AlertCircle size={10} />}
                  {badge}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
