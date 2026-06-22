"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Recorrente } from "@/lib/types";
import { formatCurrency, getCurrentMonth } from "@/lib/utils";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { RecorrenteForm } from "@/components/RecorrenteForm";
import { Plus, Pencil, Repeat, HelpCircle, Trash2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

function daysUntil(day: number): number {
  const hoje = new Date();
  const currentDay = hoje.getDate();
  const target =
    day >= currentDay
      ? new Date(hoje.getFullYear(), hoje.getMonth(), day)
      : new Date(hoje.getFullYear(), hoje.getMonth() + 1, day);
  return Math.ceil((target.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function daysLabel(day: number): string {
  const d = daysUntil(day);
  if (d === 0) return "Vence hoje";
  if (d === 1) return "Vence amanhã";
  return `Faltam ${d} dias`;
}

export default function RecorrentesPage() {
  const router = useRouter();
  const hoje = getCurrentMonth();
  const [recorrentes, setRecorrentes] = useState<(Recorrente & { categoria_nome?: string })[]>([]);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [tipoFilter, setTipoFilter] = useState<"todas" | "receita" | "despesa">("todas");

  async function load() {
    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "listar_recorrentes", payload: {} }),
    });
    const { data } = await res.json();
    if (data) {
      setRecorrentes(data.map((r: any) => ({ ...r, valor: Number(r.valor) })));
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleAtivo(r: Recorrente) {
    await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_recorrente", payload: { id: r.id } }),
    });
    load();
  }

  async function limparInativas() {
    await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "excluir_recorrentes_inativos", payload: {} }),
    });
    setConfirmDeleteOpen(false);
    load();
  }

  const filtrados =
    tipoFilter === "todas"
      ? recorrentes
      : recorrentes.filter((r) => r.tipo === tipoFilter);

  const ativos = filtrados.filter((r) => r.ativo);
  const inativos = filtrados.filter((r) => !r.ativo);
  const totalMensal = ativos.reduce((s, r) => s + r.valor, 0);

  const todosAtivos = recorrentes.filter((r) => r.ativo);
  const proximasReceitas = todosAtivos
    .filter((r) => r.tipo === "receita")
    .sort((a, b) => a.dia_vencimento - b.dia_vencimento);
  const proximasDespesas = todosAtivos
    .filter((r) => r.tipo === "despesa")
    .sort((a, b) => a.dia_vencimento - b.dia_vencimento);
  const proximoEvento =
    proximasDespesas.length > 0 || proximasReceitas.length > 0
      ? [...proximasDespesas, ...proximasReceitas].sort(
          (a, b) => a.dia_vencimento - b.dia_vencimento
        )[0]
      : null;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              Contas Recorrentes
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Automatize receitas e despesas que acontecem todos os meses.
            </p>
          </div>
          <div className="flex gap-3">
            {recorrentes.length - todosAtivos.length > 0 && (
              <Button variant="secondary" onClick={() => setConfirmDeleteOpen(true)}>
                <Trash2 size={18} /> Limpar {recorrentes.length - todosAtivos.length} inativa{(recorrentes.length - todosAtivos.length) !== 1 ? 's' : ''}
              </Button>
            )}
            <Button
              onClick={() => {
                setEditItem(null);
                setOpen(true);
              }}
            >
              <Plus size={18} /> Nova Recorrência
            </Button>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <p className="text-xs font-medium text-[var(--muted-foreground)]">
                Total de recorrências
              </p>
              <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">
                {recorrentes.length}
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                {todosAtivos.length} ativas · {recorrentes.length - todosAtivos.length} inativas
              </p>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.2 }}
          >
            <Card>
              <p className="text-xs font-medium text-[var(--muted-foreground)]">
                Valor mensal previsto
              </p>
              <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">
                {formatCurrency(totalMensal)}
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                {formatCurrency(todosAtivos.filter((r) => r.tipo === "receita").reduce((s, r) => s + r.valor, 0))} em receitas
              </p>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.2 }}
          >
            <Card>
              <p className="text-xs font-medium text-[var(--muted-foreground)]">
                Próximo evento
              </p>
              {proximoEvento ? (
                <>
                  <p className="mt-1 text-lg font-bold text-[var(--foreground)] truncate">
                    {proximoEvento.descricao}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                    {daysLabel(proximoEvento.dia_vencimento)} · {formatCurrency(proximoEvento.valor)}
                    <span className={`ml-1.5 inline-block h-2 w-2 rounded-full ${proximoEvento.tipo === "receita" ? "bg-green-500" : "bg-red-500"}`} />
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-lg font-bold text-[var(--muted-foreground)]">
                    Nenhum
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                    Crie uma recorrência para começar
                  </p>
                </>
              )}
            </Card>
          </motion.div>
        </div>

        {recorrentes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] px-6 py-16 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--muted)]">
              <Repeat size={32} className="text-[var(--muted-foreground)]" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-[var(--foreground)]">
              Automatize suas contas recorrentes
            </h2>
            <p className="mb-6 max-w-md text-sm text-[var(--muted-foreground)]">
              Cadastre assinaturas, aluguel, salário, internet, energia e outras
              movimentações que acontecem todo mês. O sistema cria automaticamente
              as transações previstas para você.
            </p>
            <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-4">
              {[
                ["1", "Crie uma recorrência"],
                ["2", "Defina tipo e valor"],
                ["3", "Escolha a categoria"],
                ["4", "Acompanhe automaticamente"],
              ].map(([num, text]) => (
                <div
                  key={num}
                  className="flex items-center gap-2 rounded-xl bg-[var(--muted)]/50 px-4 py-3 text-sm"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">
                    {num}
                  </span>
                  <span className="text-[var(--foreground)]">{text}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setEditItem(null);
                  setOpen(true);
                }}
              >
                <Plus size={18} /> Criar primeira recorrência
              </Button>
              <Button variant="secondary" onClick={() => router.push("/ajuda")}>
                <HelpCircle size={16} /> Saiba mais
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex gap-2">
              {(["todas", "receita", "despesa"] as const).map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setTipoFilter(tipo)}
                  className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    tipoFilter === tipo
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--accent)]"
                  }`}
                >
                  {tipo === "todas" ? "Todas" : tipo === "receita" ? "Receitas" : "Despesas"}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              {[...ativos, ...inativos].map((r, idx) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03, duration: 0.2 }}
                >
                  <Card
                    className={`flex items-center justify-between transition-all hover:translate-x-0.5 ${
                      !r.ativo ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          r.tipo === "receita" ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--foreground)]">
                          {r.descricao}
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: r.categoria_cor || "#6366f1" }}
                          />
                          {r.categoria_nome}
                          <span>· {daysLabel(r.dia_vencimento)}</span>
                          <span>· {r.tipo === "receita" ? "Receita" : "Despesa"}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 pl-3">
                      <span
                        className={`shrink-0 font-semibold tabular-nums ${
                          r.tipo === "receita" ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {formatCurrency(r.valor)}
                      </span>
                      <button
                        onClick={() => {
                          setEditItem({
                            id: r.id,
                            tipo: r.tipo,
                            categoria_id: r.categoria_id,
                            descricao: r.descricao,
                            valor: String(r.valor),
                            dia_vencimento: r.dia_vencimento,
                          });
                          setOpen(true);
                        }}
                        className="cursor-pointer rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        role="switch"
                        aria-checked={r.ativo}
                        onClick={() => toggleAtivo(r)}
                        className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                          r.ativo ? "bg-green-500" : "bg-[var(--muted)]"
                        }`}
                        title={r.ativo ? "Desativar" : "Ativar"}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform ${
                            r.ativo ? "translate-x-[18px]" : "translate-x-[2px]"
                          }`}
                        />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </>
        )}

        <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10">
              <ArrowRight size={16} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">
                Dica do dia
              </p>
              <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                Use contas recorrentes para automatizar salário, aluguel,
                assinaturas de streaming, contas de energia e internet. O sistema
                cria as transações previstas automaticamente todo mês.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Modal open={open} onClose={() => setOpen(false)} title={editItem?.id ? "Editar Recorrência" : "Nova Recorrência"}>
        <RecorrenteForm
          onDone={() => {
            setOpen(false);
            load();
          }}
          initial={editItem}
        />
      </Modal>

      <Modal open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)} title="Limpar recorrências inativas">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--foreground)]">
            Tem certeza que deseja apagar permanentemente <strong>{recorrentes.length - todosAtivos.length} recorrência{(recorrentes.length - todosAtivos.length) !== 1 ? 's' : ''} inativa{(recorrentes.length - todosAtivos.length) !== 1 ? 's' : ''}</strong>?
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirmDeleteOpen(false)}>Cancelar</Button>
            <Button onClick={limparInativas}>Apagar</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
