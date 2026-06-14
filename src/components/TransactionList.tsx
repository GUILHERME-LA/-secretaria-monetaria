"use client";

import { useEffect, useState, useCallback } from "react";
import type { Transacao } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { TransactionForm } from "./TransactionForm";
import { Textarea } from "./ui/Textarea";
import { Pencil, Trash2, Check } from "lucide-react";

type Props = {
  month: string;
  refreshKey: number;
  currentMonth?: string;
};

export function TransactionList({ month, refreshKey, currentMonth }: Props) {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [editItem, setEditItem] = useState<Transacao | null>(null);
  const [deleteItem, setDeleteItem] = useState<Transacao | null>(null);
  const [deleteJustificativa, setDeleteJustificativa] = useState("");

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
        data.map((t: any) => ({
          ...t,
          valor: Number(t.valor),
        }))
      );
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function confirmar(id: string) {
    await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirmar_transacao", payload: { id } }),
    });
    load();
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
              className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm ${
                t.status === "pendente"
                  ? "border-dashed border-[var(--border)] opacity-70"
                  : "border-[var(--border)]"
              }`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    t.status === "pendente" ? "animate-pulse" : ""
                  }`}
                  style={{ backgroundColor: t.categoria_cor || "#6366f1" }}
                />
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--foreground)]">
                    {t.descricao}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {t.categoria_nome}
                    {t.status === "pendente" && (
                      <span className="ml-1.5 rounded bg-yellow-500/10 px-1.5 py-0.5 text-[10px] text-yellow-500 font-medium">
                        Previsto
                      </span>
                    )}
                    <span className="hidden sm:inline"> · {formatDate(t.data)}</span>
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
                {t.status === "pendente" && (
                  <button
                    onClick={() => confirmar(t.id)}
                    className="cursor-pointer rounded p-2 text-green-500 hover:bg-green-500/10 transition-colors"
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
                  className="cursor-pointer rounded p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => { setDeleteItem(t); setDeleteJustificativa(""); }}
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
