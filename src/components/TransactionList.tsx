"use client";

import { useEffect, useState, useCallback } from "react";
import type { Transacao } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card } from "./ui/Card";
import { EmptyState } from "./ui/EmptyState";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { TransactionForm } from "./TransactionForm";
import { Textarea } from "./ui/Textarea";
import { Pencil, Trash2, Check, ArrowUp, ArrowDown, List, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  month: string;
  refreshKey: number;
  currentMonth?: string;
  onRefresh?: () => void;
};

const PER_PAGE = 10;

export function TransactionList({ month, refreshKey, currentMonth, onRefresh }: Props) {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [editItem, setEditItem] = useState<Transacao | null>(null);
  const [deleteItem, setDeleteItem] = useState<Transacao | null>(null);
  const [deleteJustificativa, setDeleteJustificativa] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    const [ano, mes] = month.split("-").map(Number);
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
    const fim = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "listar_transacoes_mes", payload: { inicio, fim } }),
    });
    const { data } = await res.json();

    if (data) {
      setTransacoes(
        data.map((t: any) => ({ ...t, valor: Number(t.valor) }))
      );
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [transacoes.length]);

  async function confirmar(id: string) {
    await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirmar_transacao", payload: { id } }),
    });
    load();
    onRefresh?.();
  }

  async function confirmarExclusao() {
    if (!deleteItem || !deleteJustificativa.trim()) return;

    const resAtual = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "obter_transacao", payload: { id: deleteItem.id } }),
    });
    const { data: atual } = await resAtual.json();

    await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "inserir_auditoria",
        payload: {
          transacao_id: deleteItem.id,
          acao: "exclusao",
          justificativa: deleteJustificativa.trim(),
          dados_anteriores: atual ? JSON.stringify({
            tipo: atual.tipo,
            categoria_id: atual.categoria_id,
            descricao: atual.descricao,
            valor: Number(atual.valor),
            data: atual.data,
            status: atual.status,
          }) : null,
          dados_novos: null,
        },
      }),
    });

    await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "excluir_transacao", payload: { id: deleteItem.id } }),
    });
    setDeleteItem(null);
    setDeleteJustificativa("");
    load();
    onRefresh?.();
  }

  const sorted = [...transacoes].sort((a, b) => b.data.localeCompare(a.data));
  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (transacoes.length === 0) {
    return (
      <Card>
        <h3 className="mb-5 text-sm font-semibold text-[var(--foreground)]">
          Transações
        </h3>
        <EmptyState
          icon={List}
          title="Nenhuma transação"
          description="Nenhuma transação registrada neste mês."
        />
      </Card>
    );
  }

  return (
    <>
      <Card>
        <h3 className="mb-5 text-sm font-semibold text-[var(--foreground)]">
          Transações
          <span className="ml-2 font-normal text-[var(--muted-foreground)]">
            ({transacoes.length})
          </span>
        </h3>

        <div className="overflow-x-auto">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
            <div className="col-span-4 lg:col-span-5">Transação</div>
            <div className="col-span-3 lg:col-span-2">Categoria</div>
            <div className="col-span-2 hidden lg:block">Data</div>
            <div className="col-span-3 lg:col-span-2 text-right">Valor</div>
            <div className="col-span-2 lg:col-span-1" />
          </div>

          <div className="flex flex-col">
            {paginated.map((t, idx) => (
              <div
                key={t.id}
                className={`grid grid-cols-12 gap-4 items-center px-4 py-3 text-sm transition-colors hover:bg-[var(--muted)]/50 ${
                  t.status === "pendente" ? "opacity-70" : ""
                } ${idx < paginated.length - 1 ? "border-b border-[var(--border)]" : ""}`}
              >
                {/* Col 1: Icon + Description */}
                <div className="col-span-4 lg:col-span-5 flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      t.tipo === "receita" ? "bg-emerald-500/10" : "bg-red-500/10"
                    }`}
                  >
                    {t.tipo === "receita" ? (
                      <ArrowUp size={14} className="text-emerald-500" />
                    ) : (
                      <ArrowDown size={14} className="text-red-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--foreground)]/80">
                      {t.descricao}
                    </p>
                    {t.status === "pendente" && (
                      <span className="rounded bg-yellow-500/10 px-1.5 py-0.5 text-[10px] text-yellow-500 font-medium">
                        Previsto
                      </span>
                    )}
                  </div>
                </div>

                {/* Col 2: Category badge */}
                <div className="col-span-3 lg:col-span-2">
                  <span
                    className="inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${t.categoria_cor || "#6366f1"}15`,
                      color: t.categoria_cor || "#6366f1",
                      borderColor: `${t.categoria_cor || "#6366f1"}25`,
                    }}
                  >
                    {t.categoria_nome}
                  </span>
                </div>

                {/* Col 3: Date (hidden on mobile) */}
                <div className="col-span-2 hidden lg:block text-[var(--muted-foreground)]">
                  {formatDate(t.data)}
                </div>

                {/* Col 4: Value + actions */}
                <div className="col-span-3 lg:col-span-2 flex items-center justify-end gap-1">
                  <span
                    className={`shrink-0 font-semibold tabular-nums ${
                      t.tipo === "receita" ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {t.tipo === "receita" ? "+" : "-"}
                    {formatCurrency(t.valor)}
                  </span>
                </div>
                <div className="col-span-2 lg:col-span-1 flex items-center justify-end gap-1">
                  {t.status === "pendente" && (
                    <button
                      onClick={() => confirmar(t.id)}
                      className="cursor-pointer rounded-lg p-2 text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                      title="Confirmar"
                    >
                      <Check size={16} />
                    </button>
                  )}
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
                    className="cursor-pointer rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => { setDeleteItem(t); setDeleteJustificativa(""); }}
                    className="cursor-pointer rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-red-500/10 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4">
            <p className="text-xs text-[var(--muted-foreground)]">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Próximo
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
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
              onRefresh?.();
            }}
            initial={{
              id: editItem.id,
              tipo: editItem.tipo,
              categoria_id: editItem.categoria_id,
              descricao: editItem.descricao,
              valor: String(editItem.valor),
              data: editItem.data,
            }}
            currentMonth={currentMonth}
          />
        )}
      </Modal>

      <Modal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        title="Excluir Transação"
      >
        {deleteItem && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[var(--foreground)]">
              Tem certeza que deseja excluir <strong>{deleteItem.descricao}</strong>?
            </p>
            <Textarea
              label="Justificativa *"
              placeholder="Por que você está excluindo esta transação?"
              value={deleteJustificativa}
              onChange={(e) => setDeleteJustificativa(e.target.value)}
              required
            />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setDeleteItem(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                disabled={!deleteJustificativa.trim()}
                onClick={confirmarExclusao}
              >
                Excluir
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
