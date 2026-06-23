"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lightbulb, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import type { Insight } from "@/lib/insights-engine";

type Props = {
  insights: Insight[];
  loading?: boolean;
  generated: boolean;
  onGenerate: () => void;
};

const typeStyles: Record<string, { bg: string; border: string }> = {
  negative: { bg: "bg-red-500/8", border: "border-red-500/20" },
  positive: { bg: "bg-emerald-500/8", border: "border-emerald-500/20" },
  info: { bg: "bg-[var(--accent)]/8", border: "border-[var(--accent)]/20" },
};

function Skeleton() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 px-4 py-3 animate-pulse">
      <div className="mt-0.5 h-5 w-5 rounded bg-[var(--muted)]" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/3 rounded bg-[var(--muted)]" />
        <div className="h-3 w-2/3 rounded bg-[var(--muted)]" />
      </div>
    </div>
  );
}

function IdleState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]/20 px-6 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)]/10">
        <Sparkles size={24} className="text-[var(--accent)]" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Análises Financeiras</h3>
        <p className="mt-1 text-xs text-[var(--muted-foreground)] leading-relaxed max-w-xs">
          Quer descobrir padrões, tendências e oportunidades nos seus gastos? Gere uma análise completa com IA.
        </p>
      </div>
      <Button size="sm" onClick={onGenerate}>
        <Sparkles size={14} />
        Gerar Análise
      </Button>
    </div>
  );
}

export function FinancialInsights({ insights, loading, generated, onGenerate }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div>
        <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">
          Insights
        </h3>
        <div className="flex flex-col gap-3">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      </div>
    );
  }

  if (!generated) {
    return <IdleState onGenerate={onGenerate} />;
  }

  if (insights.length === 0) {
    return (
      <EmptyState
        icon={Lightbulb}
        title="Nenhum insight disponível"
        description="Adicione mais transações para gerar análises inteligentes."
        action={{ label: "Tentar novamente", onClick: onGenerate }}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          Insights
        </h3>
        <Button variant="ghost" size="sm" onClick={onGenerate}>
          <Sparkles size={12} />
          Atualizar
        </Button>
      </div>
      <div className="flex flex-col gap-3">
        {insights.map((item, idx) => {
          const style = typeStyles[item.type] || typeStyles.info;
          const isExpanded = expanded.has(item.id);
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.2 }}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${style.bg} ${style.border}`}
            >
              <span className="mt-0.5 block text-lg leading-none">{item.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[var(--foreground)]">
                  {item.title}
                </p>
                <p
                  className={`mt-0.5 text-xs text-slate-400 ${
                    !isExpanded ? "line-clamp-2" : ""
                  }`}
                >
                  {item.description}
                </p>
                {item.description.length > 80 && (
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="mt-0.5 text-[10px] text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    {isExpanded ? "Ver menos" : "Ver mais..."}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
