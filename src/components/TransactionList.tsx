"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { Transacao, Tag } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card } from "./ui/Card";
import { EmptyState } from "./ui/EmptyState";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { CustomSelect } from "./ui/CustomSelect";
import { Checkbox } from "./ui/Checkbox";
import { TransactionForm } from "./TransactionForm";
import { SplitTransactionModal } from "./SplitTransactionModal";
import { useToast } from "./ui/Toast";
import { Textarea } from "./ui/Textarea";
import {
  Pencil, Trash2, Check, ArrowUp, ArrowDown, List,
  ChevronLeft, ChevronRight, Search, RotateCcw,
  ArrowUpDown, ArrowUpWideNarrow, ArrowDownWideNarrow,
  X, Tag as TagIcon, Trash, CheckCheck, Split,
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
  const { toast } = useToast();
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [tagsMap, setTagsMap] = useState<Map<string, Tag[]>>(new Map());
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [editItem, setEditItem] = useState<Transacao | null>(null);
  const [deleteItem, setDeleteItem] = useState<Transacao | null>(null);
  const [deleteJustificativa, setDeleteJustificativa] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<"todas" | "receita" | "despesa">("todas");
  const [categoriaFilter, setCategoriaFilter] = useState("todas");
  const [tagFilter, setTagFilter] = useState("todas");
  const [sortColumn, setSortColumn] = useState<SortColumn>("data");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [splitItem, setSplitItem] = useState<Transacao | null>(null);

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

    const tagRes = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "listar_tags_periodo", payload: { inicio, fim } }),
    });
    const { data: tagData } = await tagRes.json();
    const map = new Map<string, Tag[]>();
    if (tagData) {
      tagData.forEach((row: any) => {
        const existing = map.get(row.transacao_id) || [];
        existing.push({ id: row.id, nome: row.nome, cor: row.cor });
        map.set(row.transacao_id, existing);
      });
    }
    setTagsMap(map);

    const allTagRes = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "listar_tags", payload: {} }),
    });
    const { data: allTagData } = await allTagRes.json();
    if (allTagData) setAllTags(allTagData);
  }, [month]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [search, tipoFilter, categoriaFilter, tagFilter, sortColumn, sortDir]);

  async function confirmar(id: string) {
    await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirmar_transacao", payload: { id } }),
    });
    load();
    onRefresh?.();
    toast({ message: "Transação confirmada", type: "success" });
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

    const deleted = atual;
    setDeleteItem(null);
    setDeleteJustificativa("");
    load();
    onRefresh?.();
    toast({
      message: "Transação excluída",
      type: "success",
      undo: () => {
        if (!deleted) return;
        fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "inserir_transacao",
            payload: {
              tipo: deleted.tipo, categoria_id: deleted.categoria_id,
              descricao: deleted.descricao, valor: Number(deleted.valor),
              data: deleted.data, status: deleted.status || "confirmada",
            },
          }),
        });
      },
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((t) => t.id)));
    }
  }

  async function batchConfirm() {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirmar_transacoes", payload: { ids } }),
    });
    setSelectedIds(new Set());
    load();
    onRefresh?.();
    toast({ message: `${ids.length} transação(ões) confirmada(s)`, type: "success" });
  }

  async function batchDelete() {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "excluir_transacoes", payload: { ids } }),
    });
    setSelectedIds(new Set());
    load();
    onRefresh?.();
    toast({
      message: `${ids.length} transação(ões) excluída(s)`,
      type: "success",
    });
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

    if (tagFilter !== "todas") {
      result = result.filter((t) => {
        const tags = tagsMap.get(t.id) || [];
        return tags.some((tg) => tg.id === tagFilter);
      });
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
  }, [transacoes, search, tipoFilter, categoriaFilter, tagFilter, tagsMap, sortColumn, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const hasFilters = search || tipoFilter !== "todas" || categoriaFilter !== "todas" || tagFilter !== "todas";

  function clearFilters() {
    setSearch("");
    setTipoFilter("todas");
    setCategoriaFilter("todas");
    setTagFilter("todas");
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

          <CustomSelect
            value={tipoFilter}
            onChange={(v) => setTipoFilter(v as any)}
            options={[
              { value: "todas", label: "Todos os tipos" },
              { value: "receita", label: "Receitas" },
              { value: "despesa", label: "Despesas" },
            ]}
          />

          <CustomSelect
            value={categoriaFilter}
            onChange={setCategoriaFilter}
            options={[
              { value: "todas", label: "Todas as categorias" },
              ...categorias.map((cat) => ({ value: cat.nome, label: cat.nome, color: cat.cor })),
            ]}
          />

          <CustomSelect
            value={tagFilter}
            onChange={setTagFilter}
            options={[
              { value: "todas", label: "Todas as tags" },
              ...allTags.map((tag) => ({ value: tag.id, label: tag.nome, color: tag.cor })),
            ]}
          />
        </div>

        {selectedIds.size > 0 && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-2.5">
            <span className="text-sm text-[var(--foreground)]">
              <strong>{selectedIds.size}</strong> selecionada(s)
            </span>
            <div className="ml-auto flex gap-2">
              <button
                onClick={batchConfirm}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 transition-colors"
              >
                <CheckCheck size={14} />
                Confirmar
              </button>
              <button
                onClick={batchDelete}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 transition-colors"
              >
                <Trash size={14} />
                Excluir
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <X size={14} />
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium uppercase tracking-wider text-slate-400">
            <div className="col-span-1 flex items-center">
              <Checkbox
                checked={paginated.length > 0 && selectedIds.size === paginated.length}
                onChange={toggleSelectAll}
              />
            </div>
            <button
              onClick={() => toggleSort("descricao")}
              className="col-span-4 flex cursor-pointer items-center gap-1 text-left transition-colors hover:text-[var(--foreground)]"
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
              <div key={t.id} className={`${idx < paginated.length - 1 ? "border-b border-[var(--border)]" : ""} ${t.status === "pendente" ? "opacity-70" : ""}`}>

                <div className="flex flex-col gap-1.5 px-4 py-3 text-sm transition-colors hover:bg-[var(--muted)]/50 sm:hidden">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Checkbox
                        checked={selectedIds.has(t.id)}
                        onChange={() => toggleSelect(t.id)}
                      />
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.tipo === "receita" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                        {t.tipo === "receita" ? <ArrowUp size={14} className="text-emerald-500" /> : <ArrowDown size={14} className="text-red-500" />}
                      </div>
                      <p className="truncate font-medium text-[var(--foreground)]/80">{t.descricao}</p>
                    </div>
                    <span className={`shrink-0 font-semibold tabular-nums ${t.tipo === "receita" ? "text-emerald-500" : "text-red-500"}`}>
                      {t.tipo === "receita" ? "+" : "-"}{formatCurrency(t.valor)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-block shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: `${t.categoria_cor || "#6366f1"}15`, color: t.categoria_cor || "#6366f1", borderColor: `${t.categoria_cor || "#6366f1"}25` }}>
                        {t.categoria_nome}
                      </span>
                      {(tagsMap.get(t.id) || []).slice(0, 2).map((tag) => (
                        <span key={tag.id} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${tag.cor}20`, color: tag.cor }}>
                          <TagIcon size={10} />
                          {tag.nome}
                        </span>
                      ))}
                      {(tagsMap.get(t.id) || []).length > 2 && (
                        <span className="text-[10px] text-slate-400">+{(tagsMap.get(t.id) || []).length - 2}</span>
                      )}
                      {t.status === "pendente" && <span className="shrink-0 rounded bg-yellow-500/10 px-1.5 py-0.5 text-[10px] text-yellow-500 font-medium">Previsto</span>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {t.status === "pendente" && <button onClick={() => confirmar(t.id)} className="cursor-pointer rounded-lg p-2 text-emerald-500 hover:bg-emerald-500/10 transition-colors" title="Confirmar"><Check size={16} /></button>}
                      <button onClick={() => setSplitItem(t)} className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-[var(--muted)] transition-colors" title="Dividir"><Split size={16} /></button>
                      <button onClick={() => setEditItem({ ...t, categoria_id: t.categoria_id, descricao: t.descricao, valor: t.valor, data: t.data, tipo: t.tipo } as Transacao)} className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-[var(--muted)] transition-colors"><Pencil size={16} /></button>
                      <button onClick={() => { setDeleteItem(t); setDeleteJustificativa(""); }} className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>

                <div className="hidden sm:grid sm:grid-cols-12 sm:items-center sm:gap-4 px-4 py-3 text-sm transition-colors hover:bg-[var(--muted)]/50">
                  <div className="sm:col-span-1 flex items-center">
                    <Checkbox
                      checked={selectedIds.has(t.id)}
                      onChange={() => toggleSelect(t.id)}
                    />
                  </div>
                  <div className="flex items-center gap-3 sm:col-span-4 min-w-0">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.tipo === "receita" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                      {t.tipo === "receita" ? <ArrowUp size={14} className="text-emerald-500" /> : <ArrowDown size={14} className="text-red-500" />}
                    </div>
                    <p className="truncate font-medium text-[var(--foreground)]/80">{t.descricao}</p>
                  </div>
                  <div className="sm:col-span-3">
                    <span className="inline-block shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: `${t.categoria_cor || "#6366f1"}15`, color: t.categoria_cor || "#6366f1", borderColor: `${t.categoria_cor || "#6366f1"}25` }}>
                      {t.categoria_nome}
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(tagsMap.get(t.id) || []).slice(0, 3).map((tag) => (
                        <span key={tag.id} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${tag.cor}20`, color: tag.cor }}>
                          <TagIcon size={10} />
                          {tag.nome}
                        </span>
                      ))}
                      {(tagsMap.get(t.id) || []).length > 3 && (
                        <span className="text-[10px] text-slate-400">+{(tagsMap.get(t.id) || []).length - 3}</span>
                      )}
                    </div>
                    {t.status === "pendente" && <span className="ml-1.5 rounded bg-yellow-500/10 px-1.5 py-0.5 text-[10px] text-yellow-500 font-medium">Previsto</span>}
                  </div>
                  <div className="sm:col-span-2 text-xs text-slate-400">{formatDate(t.data)}</div>
                  <div className="flex items-center justify-end sm:col-span-2">
                    <span className={`w-28 shrink-0 text-right font-semibold tabular-nums ${t.tipo === "receita" ? "text-emerald-500" : "text-red-500"}`}>
                      {t.tipo === "receita" ? "+" : "-"}{formatCurrency(t.valor)}
                    </span>
                    <div className="flex w-24 shrink-0 items-center justify-end gap-1">
                      {t.status === "pendente" && <button onClick={() => confirmar(t.id)} className="cursor-pointer rounded-lg p-2 text-emerald-500 hover:bg-emerald-500/10 transition-colors" title="Confirmar"><Check size={16} /></button>}
                      <button onClick={() => setSplitItem(t)} className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-[var(--muted)] transition-colors" title="Dividir"><Split size={16} /></button>
                      <button onClick={() => setEditItem({ ...t, categoria_id: t.categoria_id, descricao: t.descricao, valor: t.valor, data: t.data, tipo: t.tipo } as Transacao)} className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-[var(--muted)] transition-colors"><Pencil size={16} /></button>
                      <button onClick={() => { setDeleteItem(t); setDeleteJustificativa(""); }} className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                    </div>
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

      <SplitTransactionModal
        open={!!splitItem}
        onClose={() => setSplitItem(null)}
        transacaoId={splitItem?.id || ""}
        transacaoDescricao={splitItem?.descricao || ""}
        transacaoValor={splitItem?.valor || 0}
        transacaoTipo={splitItem?.tipo || "despesa"}
        onDone={() => { load(); onRefresh?.(); }}
      />
    </>
  );
}
