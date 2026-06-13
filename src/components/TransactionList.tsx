"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-client";
import type { Transacao } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { TransactionForm } from "./TransactionForm";
import { Pencil, Trash2 } from "lucide-react";

type Props = {
  month: string;
  refreshKey: number;
};

export function TransactionList({ month, refreshKey }: Props) {
  const supabase = createClient();
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [editItem, setEditItem] = useState<Transacao | null>(null);

  const load = useCallback(async () => {
    const [ano, mes] = month.split("-").map(Number);
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
    const fim = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

    const { data } = await supabase
      .from("sm_transacoes")
      .select("*, categorias(nome, cor)")
      .gte("data", inicio)
      .lte("data", fim)
      .order("data", { ascending: false });

    if (data) {
      setTransacoes(
        data.map((t: any) => ({
          ...t,
          categoria_nome: t.categorias?.nome,
          categoria_cor: t.categorias?.cor,
          valor: Number(t.valor),
        }))
      );
    }
  }, [month, supabase]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function excluir(id: string) {
    if (!confirm("Excluir esta transação?")) return;
    await supabase.from("sm_transacoes").delete().eq("id", id);
    load();
  }

  return (
    <>
      <Card>
        <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">
          Transações
        </h3>
        <div className="flex flex-col gap-2">
          {transacoes.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm"
            >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: t.categoria_cor || "#6366f1" }}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--foreground)]">
                      {t.descricao}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {t.categoria_nome} <span className="hidden sm:inline">· {formatDate(t.data)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 pl-2 sm:gap-2 sm:pl-3">
                  <span
                    className={`shrink-0 font-semibold ${
                      t.tipo === "receita" ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {t.tipo === "receita" ? "+" : "-"}
                    {formatCurrency(t.valor)}
                  </span>
                  <button
                    onClick={() =>
                      setEditItem({
                        ...t,
                        categoria_id: t.categoria_id,
                        descricao: t.descricao,
                        valor: t.valor,
                        data: t.data,
                        tipo: t.tipo,
                      } as Transacao)
                    }
                    className="cursor-pointer rounded p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => excluir(t.id)}
                    className="cursor-pointer rounded p-2 text-[var(--muted-foreground)] hover:bg-red-500/10 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
            </div>
          ))}
          {transacoes.length === 0 && (
            <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">
              Nenhuma transação neste mês.
            </p>
          )}
        </div>
      </Card>

      <Modal
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title="Editar Transação"
      >
        {editItem && (
          <TransactionForm
            onDone={() => {
              setEditItem(null);
              load();
            }}
            initial={{
              id: editItem.id,
              tipo: editItem.tipo,
              categoria_id: editItem.categoria_id,
              descricao: editItem.descricao,
              valor: String(editItem.valor),
              data: editItem.data,
            }}
          />
        )}
      </Modal>
    </>
  );
}
