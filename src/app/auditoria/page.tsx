"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Auditoria } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { ArrowLeft, LayoutDashboard, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";

export default function AuditoriaPage() {
  const router = useRouter();
  const [registros, setRegistros] = useState<(Auditoria & { transacao_descricao?: string })[]>([]);
  const [expandido, setExpandido] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "listar_auditoria", payload: {} }),
    })
      .then((r) => r.json())
      .then(({ data }: { data: any[] | null }) => {
        if (data) {
          setRegistros(
            data.map((r: any) => ({
              ...r,
              transacao_descricao: r.dados_anteriores?.descricao || r.dados_novos?.descricao || "(desconhecido)",
            }))
          );
        }
      });
  }, []);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
            <ArrowLeft size={16} /> Voltar
          </button>
          <button onClick={() => router.push("/dashboard")} className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
            <LayoutDashboard size={16} /> Início
          </button>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-[var(--foreground)]">Histórico de Alterações</h1>
        <p className="mb-8 text-sm text-[var(--muted-foreground)]">
          Todas as alterações e exclusões feitas nas transações.
        </p>

        <div className="flex flex-col gap-2">
          {registros.map((r) => (
            <Card key={r.id} className="p-0">
              <button
                onClick={() => setExpandido(expandido === r.id ? null : r.id)}
                className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {r.acao === "alteracao" ? (
                    <Pencil size={16} className="shrink-0 text-yellow-500" />
                  ) : (
                    <Trash2 size={16} className="shrink-0 text-red-500" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--foreground)]">
                      {r.transacao_descricao}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {r.acao === "alteracao" ? "Alteração" : "Exclusão"} · {new Date(r.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
                {expandido === r.id ? (
                  <ChevronUp size={18} className="shrink-0 text-[var(--muted-foreground)]" />
                ) : (
                  <ChevronDown size={18} className="shrink-0 text-[var(--muted-foreground)]" />
                )}
              </button>

              {expandido === r.id && (
                <div className="border-t border-[var(--border)] px-4 py-3">
                  <p className="mb-2 text-sm">
                    <span className="font-medium text-[var(--foreground)]">Justificativa:</span>{" "}
                    <span className="text-[var(--muted-foreground)]">{r.justificativa}</span>
                  </p>

                  {r.dados_anteriores && (
                    <div className="mb-2">
                      <p className="mb-1 text-xs font-medium text-[var(--muted-foreground)]">Valores anteriores:</p>
                      <div className="rounded-lg bg-[var(--muted)] p-2 text-xs text-[var(--muted-foreground)]">
                        <p>{r.dados_anteriores.descricao}</p>
                        <p>{formatCurrency(Number(r.dados_anteriores.valor))}</p>
                        <p className="capitalize">{r.dados_anteriores.tipo} · {r.dados_anteriores.data}</p>
                      </div>
                    </div>
                  )}

                  {r.dados_novos && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-[var(--muted-foreground)]">Novos valores:</p>
                      <div className="rounded-lg bg-[var(--muted)] p-2 text-xs text-[var(--muted-foreground)]">
                        <p>{r.dados_novos.descricao}</p>
                        <p>{formatCurrency(Number(r.dados_novos.valor))}</p>
                        <p className="capitalize">{r.dados_novos.tipo} · {r.dados_novos.data}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}

          {registros.length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
              Nenhuma alteração registrada ainda.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
