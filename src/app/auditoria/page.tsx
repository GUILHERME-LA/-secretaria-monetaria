"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Auditoria } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pencil, Trash2, ChevronDown, ChevronUp, History, Clock, ArrowRight, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Agora mesmo";
  if (mins < 60) return `Há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Há ${days}d`;
  return formatDate(dateStr);
}

const ALL_FIELDS = [
  { key: "descricao", label: "Descrição" },
  { key: "valor", label: "Valor" },
  { key: "tipo", label: "Tipo" },
  { key: "data", label: "Data" },
] as const;

function DiffRow({ label, oldVal, newVal }: { label: string; oldVal: string; newVal: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-xs">
      <span className="w-16 shrink-0 font-medium text-[var(--muted-foreground)]">{label}</span>
      <s className="truncate text-red-400">{oldVal}</s>
      <span className="shrink-0 text-[var(--muted-foreground)]">→</span>
      <span className="truncate font-medium text-green-500">{newVal}</span>
    </div>
  );
}

export default function AuditoriaPage() {
  const router = useRouter();
  const [registros, setRegistros] = useState<(Auditoria & { transacao_descricao?: string })[]>([]);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todas" | "alteracao" | "exclusao">("todas");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

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
              transacao_descricao:
                r.dados_anteriores?.descricao || r.dados_novos?.descricao || "(desconhecido)",
            }))
          );
        }
      });
  }, []);

  const filtrados = registros.filter((r) => {
    if (filtro !== "todas" && r.acao !== filtro) return false;
    if (dataInicio && r.created_at < dataInicio) return false;
    if (dataFim && r.created_at > dataFim + "T23:59:59") return false;
    return true;
  });

  function formatVal(key: string, val: any): string {
    if (key === "valor") return formatCurrency(Number(val));
    if (key === "tipo") return val === "receita" ? "Receita" : "Despesa";
    if (key === "data") return formatDate(val);
    return String(val ?? "");
  }

  async function desfazer(r: Auditoria & { transacao_descricao?: string }) {
    if (!r.dados_anteriores || r.acao !== "alteracao") return;
    const payload = {
      id: r.transacao_id,
      tipo: r.dados_anteriores.tipo,
      categoria_id: r.dados_anteriores.categoria_id,
      descricao: r.dados_anteriores.descricao,
      valor: Number(r.dados_anteriores.valor),
      data: r.dados_anteriores.data,
    };
    await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "atualizar_transacao", payload }),
    });
    await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "inserir_auditoria",
        payload: {
          transacao_id: r.transacao_id,
          acao: "alteracao",
          justificativa: "Restauração de versão anterior",
          dados_anteriores: null,
          dados_novos: null,
        },
      }),
    });
    setExpandido(null);
    setRegistros((prev) =>
      prev.map((reg) =>
        reg.id === r.id ? { ...reg, dados_anteriores: null, dados_novos: null } : reg
      )
    );
  }

  const alteracoes = registros.filter((r) => r.acao === "alteracao");
  const exclusoes = registros.filter((r) => r.acao === "exclusao");
  const ultimoRegistro = registros.length > 0 ? registros[0] : null;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            Histórico de Alterações
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Todas as alterações e exclusões feitas nas suas transações, com
            auditoria completa.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Card>
              <p className="text-xs font-medium text-[var(--muted-foreground)]">Total de alterações</p>
              <p className="mt-1 text-2xl font-bold text-yellow-500">{alteracoes.length}</p>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.2 }}>
            <Card>
              <p className="text-xs font-medium text-[var(--muted-foreground)]">Total de exclusões</p>
              <p className="mt-1 text-2xl font-bold text-red-500">{exclusoes.length}</p>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.2 }}>
            <Card>
              <p className="text-xs font-medium text-[var(--muted-foreground)]">Última alteração</p>
              {ultimoRegistro ? (
                <>
                  <p className="mt-1 text-lg font-bold text-[var(--foreground)] truncate">{ultimoRegistro.transacao_descricao}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{timeAgo(ultimoRegistro.created_at)}</p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-lg font-bold text-[var(--muted-foreground)]">Nenhuma</p>
                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">Nenhuma alteração registrada</p>
                </>
              )}
            </Card>
          </motion.div>
        </div>

        {registros.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              {(["todas", "alteracao", "exclusao"] as const).map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setFiltro(tipo)}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    filtro === tipo
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {tipo === "todas" ? "Todas" : tipo === "alteracao" ? "Alterações" : "Exclusões"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-colors"
                placeholder="Data início"
              />
              <span className="text-xs text-[var(--muted-foreground)]">a</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-colors"
                placeholder="Data fim"
              />
            </div>
          </div>
        )}

        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] px-6 py-16 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--muted)]">
              <History size={32} className="text-[var(--muted-foreground)]" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-[var(--foreground)]">
              Nenhum registro de auditoria
            </h2>
            <p className="mb-6 max-w-md text-sm text-[var(--muted-foreground)]">
              O histórico de alterações garante transparência total sobre qualquer modificação feita nas suas transações financeiras. Alterações e exclusões aparecem aqui automaticamente.
            </p>
            <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-4">
              {[
                ["1", "Registre transações"],
                ["2", "Edite quando necessário"],
                ["3", "Justifique alterações"],
                ["4", "Auditoria automática"],
              ].map(([num, text]) => (
                <div key={num} className="flex items-center gap-2 rounded-xl bg-[var(--muted)]/50 px-4 py-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">{num}</span>
                  <span className="text-[var(--foreground)]">{text}</span>
                </div>
              ))}
            </div>
            <Button onClick={() => router.push("/dashboard")}>Ir para Dashboard</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtrados.map((r, idx) => {
              const isAlteracao = r.acao === "alteracao";
              const diffFields = isAlteracao && r.dados_anteriores && r.dados_novos
                ? ALL_FIELDS.filter((f) => {
                    const oldV = String(r.dados_anteriores?.[f.key] ?? "");
                    const newV = String(r.dados_novos?.[f.key] ?? "");
                    return oldV !== newV;
                  })
                : [];

              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02, duration: 0.15 }}
                >
                  <Card className="p-0">
                    <button
                      onClick={() => setExpandido(expandido === r.id ? null : r.id)}
                      className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--muted)]">
                          {r.acao === "alteracao" ? <Pencil size={14} className="text-yellow-500" /> : <Trash2 size={14} className="text-red-500" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[var(--foreground)]">{r.transacao_descricao}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            <span className={r.acao === "alteracao" ? "text-yellow-500" : "text-red-500"}>
                              {r.acao === "alteracao" ? "Alteração" : "Exclusão"}
                            </span>
                            {" · "}
                            {timeAgo(r.created_at)}
                          </p>
                        </div>
                      </div>
                      {expandido === r.id ? <ChevronUp size={18} className="shrink-0 text-[var(--muted-foreground)]" /> : <ChevronDown size={18} className="shrink-0 text-[var(--muted-foreground)]" />}
                    </button>

                    {expandido === r.id && (
                      <div className="border-t border-[var(--border)] px-4 py-3">
                        <div className="mb-3 rounded-lg bg-[var(--muted)]/50 p-3 text-xs">
                          <p className="font-medium text-[var(--foreground)]">Justificativa</p>
                          <p className="mt-0.5 text-[var(--muted-foreground)]">{r.justificativa || "Nenhuma justificativa fornecida"}</p>
                        </div>

                        {diffFields.length > 0 ? (
                          <div className="mb-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                            <p className="mb-2 text-xs font-medium text-[var(--foreground)]">O que mudou</p>
                            <div className="flex flex-col gap-1.5">
                              {diffFields.map((f) => (
                                <DiffRow
                                  key={f.key}
                                  label={f.label}
                                  oldVal={formatVal(f.key, r.dados_anteriores?.[f.key])}
                                  newVal={formatVal(f.key, r.dados_novos?.[f.key])}
                                />
                              ))}
                            </div>
                          </div>
                        ) : isAlteracao && r.dados_novos ? (
                          <div className="mb-3 rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-xs">
                            <p className="font-medium text-[var(--foreground)]">Novos valores</p>
                            <p className="font-medium text-[var(--foreground)]">{r.dados_novos.descricao}</p>
                            <p className="text-green-500">{formatCurrency(Number(r.dados_novos.valor))}</p>
                            <p className="capitalize text-[var(--muted-foreground)]">{r.dados_novos.tipo === "receita" ? "Receita" : "Despesa"} · {r.dados_novos.data}</p>
                          </div>
                        ) : null}

                        {r.acao === "exclusao" && r.dados_anteriores && diffFields.length === 0 && (
                          <div className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-xs">
                            <p className="font-medium text-[var(--foreground)]">Valores excluídos</p>
                            <p className="font-medium text-[var(--foreground)]">{r.dados_anteriores.descricao}</p>
                            <p>{formatCurrency(Number(r.dados_anteriores.valor))}</p>
                            <p className="capitalize text-[var(--muted-foreground)]">{r.dados_anteriores.tipo === "receita" ? "Receita" : "Despesa"} · {r.dados_anteriores.data}</p>
                          </div>
                        )}

                        {r.acao === "alteracao" && diffFields.length > 0 && (
                          <button
                            onClick={() => desfazer(r)}
                            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                          >
                            <RotateCcw size={14} />
                            Desfazer alteração
                          </button>
                        )}
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {registros.length > 0 && (
          <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10">
                <Clock size={16} style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Histórico mantido automaticamente</p>
                <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                  Toda alteração ou exclusão de transação é registrada com justificativa, valores anteriores e novos, garantindo total rastreabilidade dos seus dados financeiros.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
