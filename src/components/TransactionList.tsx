"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { Transacao } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card } from "./ui/Card";
import { EmptyState } from "./ui/EmptyState";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { TransactionForm } from "./TransactionForm";
import { Textarea } from "./ui/Textarea";
import {
  Pencil, Trash2, Check, ArrowUp, ArrowDown, List,
  ChevronLeft, ChevronRight, Search, RotateCcw,
  ArrowUpDown, ArrowUpWideNarrow, ArrowDownWideNarrow,
  X,
} from "lucide-react";

type Props = {
  month: string;
  refreshKey: number;
  currentMonth?: string;
  onRefresh?: () => void;
};

const PER_PAGE = 10;

type SortColumn = "data" | "descricao" | "valor" | "categoria";
type SortDir = "asc" | "desc";

export function TransactionList({ month, refreshKey, currentMonth, onRefresh }: Props) {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [editItem, setEditItem] = useState<Transacao | null>(null);
  const [deleteItem, setDeleteItem] = useState<Transacao | null>(null);
  const [deleteJustificativa, setDeleteJustificativa] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<"todas" | "receita" | "despesa">("todas");
  const [categoriaFilter, setCategoriaFilter] = useState("todas");
  const [sortColumn, setSortColumn] = useState<SortColumn>("data");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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
  }, [search, tipoFilter, categoriaFilter, sortColumn, sortDir]);

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

  function toggleSort(col: SortColumn) {
    if (sortColumn === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDir(col === "data" ? "desc" : "asc");
    }
  }

  function SortIcon({ col }: { col: SortColumn }) {
    if (sortColumn !== col) return <ArrowUpDown size={12} className="opacity-30" />;
    return sortDir === "asc" ? (
      <ArrowUpWideNarrow size={12} className="text-[var(--accent)]" />
    ) : (
      <ArrowDownWideNarrow size={12} className="text-[var(--accent)]" />
    );
  }

  const categorias = useMemo(() => {
    const unique = new Map<string, string>();
    transacoes.forEach((t) => {
      if (t.categoria_nome) unique.set(t.categoria_nome, t.categoria_cor || "#6366f1");
    });
    return Array.from(unique.entries()).map(([nome, cor]) => ({ nome, cor }));
  }, [transacoes]);

  const filtered = useMemo(() => {
    let result = [...transacoes];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.descricao.toLowerCase().includes(q));
    }

    if (tipoFilter !== "todas") {
      result = result.filter((t) => t.tipo === tipoFilter);
    }

    if (categoriaFilter !== "todas") {
      result = result.filter((t) => t.categoria_nome === categoriaFilter);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case "data":
          cmp = a.data.localeCompare(b.data);
          break;
        case "descricao":
          cmp = a.descricao.localeCompare(b.descricao);
          break;
        case "valor":
          cmp = a.valor - b.valor;
          break;
        case "categoria":
          cmp = (a.categoria_nome || "").localeCompare(b.categoria_nome || "");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [transacoes, search, tipoFilter, categoriaFilter, sortColumn, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const hasFilters = search || tipoFilter !== "todas" || categoriaFilter !== "todas";

  function clearFilters() {
    setSearch("");
    setTipoFilter("todas");
    setCategoriaFilter("todas");
  }

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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            Transações
            <span className="ml-2 font-normal text-slate-400">
              ({filtered.length})
            </span>
          </h3>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex cursor-pointer items-center gap-1 text-xs text-slate-400 hover:text-[var(--foreground)] transition-colors"
            >
              <RotateCcw size={12} />
              Limpar filtros
            </button>
          )}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:max-w-64">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Buscar por descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] py-2 pl-9 pr-8 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none focus:border-[var(--accent)] transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[var(--foreground)] transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value as any)}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-colors cursor-pointer"
          >
            <option value="todas">Todos os tipos</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </select>

          <select
            value={categoriaFilter}
            onChange={(e) => setCategoriaFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-colors cursor-pointer"
          >
            <option value="todas">Todas as categorias</option>
            {categorias.map((cat) => (
              <option key={cat.nome} value={cat.nome}>
                {cat.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium uppercase tracking-wider text-slate-400">
            <button
              onClick={() => toggleSort("descricao")}
              className="col-span-5 flex cursor-pointer items-center gap-1 text-left transition-colors hover:text-[var(--foreground)]"
            >
              Transação <SortIcon col="descricao" />
            </button>
            <button
              onClick={() => toggleSort("categoria")}
              className="col-span-3 flex cursor-pointer items-center gap-1 text-left transition-colors hover:text-[var(--foreground)]"
            >
              Categoria <SortIcon col="categoria" />
            </button>
            <button
              onClick={() => toggleSort("data")}
              className="col-span-2 flex items-center gap-1 cursor-pointer transition-colors hover:text-[var(--foreground)]"
            >
              Data <SortIcon col="data" />
            </button>
            <button
              onClick={() => toggleSort("valor")}
              className="col-span-2 flex cursor-pointer items-center justify-end gap-1 transition-colors hover:text-[var(--foreground)]"
            >
              Valor <SortIcon col="valor" />
            </button>
          </div>

          <div className="flex flex-col">
            {paginated.map((t, idx) => (
              <div
                key={t.id}
                className={`flex flex-col gap-1.5 px-4 py-3 text-sm transition-colors hover:bg-[var(--muted)]/50 lg:grid lg:grid-cols-12 lg:items-center lg:gap-4 ${
                  t.status === "pendente" ? "opacity-70" : ""
                } ${idx < paginated.length - 1 ? "border-b border-[var(--border)]" : ""}`}
              >
                <div className="flex items-center justify-between gap-2 lg:col-span-5">
                  <div className="flex items-center gap-3 min-w-0">
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
                    <p className="truncate font-medium text-[var(--foreground)]/80">
                      {t.descricao}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 font-semibold tabular-nums ${
                      t.tipo === "receita" ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {t.tipo === "receita" ? "+" : "-"}
                    {formatCurrency(t.valor)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 lg:col-span-7">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="inline-block shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `${t.categoria_cor || "#6366f1"}15`,
                        color: t.categoria_cor || "#6366f1",
                        borderColor: `${t.categoria_cor || "#6366f1"}25`,
                      }}
                    >
                      {t.categoria_nome}
                    </span>
                    {t.status === "pendente" && (
                      <span className="shrink-0 rounded bg-yellow-500/10 px-1.5 py-0.5 text-[10px] text-yellow-500 font-medium">
                        Previsto
                      </span>
                    )}
                    <span className="hidden text-xs text-slate-400 lg:inline">
                      {formatDate(t.data)}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
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
                      className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-[var(--muted)] transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => { setDeleteItem(t); setDeleteJustificativa(""); }}
                      className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4">
            <p className="text-xs text-slate-400">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
