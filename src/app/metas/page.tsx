"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Target, Plus, Trash2, ArrowRight, HelpCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/utils";
import type { Meta } from "@/components/MetasDashboard";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "sm_metas";

function loadMetas(): Meta[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveMetas(metas: Meta[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(metas));
}

const CORES = [
  "#6366f1", "#22c55e", "#eab308", "#ef4444", "#f97316",
  "#a855f7", "#06b6d4", "#ec4899", "#14b8a6", "#8b5cf6",
];

export default function MetasPage() {
  const router = useRouter();
  const [metas, setMetas] = useState<Meta[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [valorObjetivo, setValorObjetivo] = useState("");
  const [valorAtual, setValorAtual] = useState("");
  const [cor, setCor] = useState(CORES[0]);
  const [inputs, setInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    setMetas(loadMetas());
  }, []);

  const refresh = useCallback(() => {
    setMetas(loadMetas());
  }, []);

  function criar() {
    if (!titulo.trim() || !valorObjetivo) return;
    const nova: Meta = {
      id: crypto.randomUUID(),
      titulo: titulo.trim(),
      valorObjetivo: Number(valorObjetivo),
      valorAtual: Number(valorAtual) || 0,
      cor,
      createdAt: new Date().toISOString(),
    };
    const items = [...metas, nova];
    saveMetas(items);
    setMetas(items);
    setTitulo("");
    setValorObjetivo("");
    setValorAtual("");
    setCor(CORES[0]);
    setModalOpen(false);
  }

  function excluir(id: string) {
    const items = metas.filter((m) => m.id !== id);
    saveMetas(items);
    setMetas(items);
  }

  function atualizarValor(id: string, valor: number) {
    const items = metas.map((m) =>
      m.id === id ? { ...m, valorAtual: Math.min(valor, m.valorObjetivo) } : m
    );
    saveMetas(items);
    setMetas(items);
  }

  const totalObjetivo = metas.reduce((s, m) => s + m.valorObjetivo, 0);
  const totalEconomizado = metas.reduce((s, m) => s + m.valorAtual, 0);
  const progressoMedio =
    metas.length > 0
      ? Math.round(
          metas.reduce((s, m) => s + (m.valorAtual / m.valorObjetivo) * 100, 0) /
            metas.length
        )
      : 0;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              Metas Financeiras
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Defina objetivos financeiros e acompanhe seu progresso.
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            Nova Meta
          </button>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <p className="text-xs font-medium text-[var(--muted-foreground)]">
                Total de metas
              </p>
              <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">
                {metas.length}
              </p>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04, duration: 0.2 }}
          >
            <Card>
              <p className="text-xs font-medium text-[var(--muted-foreground)]">
                Valor total objetivo
              </p>
              <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">
                {formatCurrency(totalObjetivo)}
              </p>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.2 }}
          >
            <Card>
              <p className="text-xs font-medium text-[var(--muted-foreground)]">
                Total economizado
              </p>
              <p className="mt-1 text-2xl font-bold text-green-500">
                {formatCurrency(totalEconomizado)}
              </p>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.2 }}
          >
            <Card>
              <p className="text-xs font-medium text-[var(--muted-foreground)]">
                Progresso médio
              </p>
              <p className="mt-1 text-2xl font-bold" style={{ color: progressoMedio >= 70 ? "#22c55e" : progressoMedio >= 40 ? "#eab308" : "#ef4444" }}>
                {progressoMedio}%
              </p>
            </Card>
          </motion.div>
        </div>

        {metas.length === 0 ? (
          <EmptyState
            icon={Target}
            title="Nenhuma meta criada"
            description="Defina metas de curto, médio e longo prazo para transformar seus sonhos em planos financeiros concretos."
            action={{ label: "Criar Meta", onClick: () => setModalOpen(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {metas.map((meta, idx) => {
              const progresso = Math.min(
                Math.round((meta.valorAtual / meta.valorObjetivo) * 100),
                100
              );
              const restante = Math.max(0, meta.valorObjetivo - meta.valorAtual);
              return (
                <motion.div
                  key={meta.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.2 }}
                >
                  <Card className="relative">
                    <button
                      onClick={() => excluir(meta.id)}
                      className="absolute right-3 top-3 cursor-pointer rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--destructive)] transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="mb-3 flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: meta.cor }}
                      />
                      <h3 className="text-sm font-semibold text-[var(--foreground)]">
                        {meta.titulo}
                      </h3>
                    </div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-lg font-bold text-[var(--foreground)]">
                        {formatCurrency(meta.valorAtual)}
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        de {formatCurrency(meta.valorObjetivo)}
                      </span>
                    </div>
                    <div className="mb-1 h-3 overflow-hidden rounded-full bg-[var(--muted)]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progresso}%`,
                          backgroundColor: meta.cor,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                      <span>{progresso}% concluído</span>
                      {restante > 0 && <span>Faltam {formatCurrency(restante)}</span>}
                    </div>
                    {progresso < 100 && (
                      <div className="mt-4 flex gap-2">
                        <Input
                          type="number"
                          placeholder="Valor"
                          className="flex-1 text-sm"
                          value={inputs[meta.id] ?? ""}
                          onChange={(e) =>
                            setInputs((prev) => ({
                              ...prev,
                              [meta.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const v = Number(inputs[meta.id]);
                              if (v > 0) {
                                atualizarValor(meta.id, meta.valorAtual + v);
                                setInputs((prev) => ({
                                  ...prev,
                                  [meta.id]: "",
                                }));
                              }
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            const v = Number(inputs[meta.id]);
                            if (v > 0) {
                              atualizarValor(meta.id, meta.valorAtual + v);
                              setInputs((prev) => ({
                                ...prev,
                                [meta.id]: "",
                              }));
                            }
                          }}
                          className="shrink-0 cursor-pointer rounded-lg bg-[var(--accent)] px-3 text-sm font-medium text-white hover:opacity-90 transition-opacity"
                        >
                          + Add
                        </button>
                      </div>
                    )}
                    {progresso >= 100 && (
                      <p className="mt-3 text-center text-xs font-medium text-green-500">
                        Meta alcançada!
                      </p>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
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
                Defina metas de curto prazo (1-3 meses), médio prazo (6-12 meses)
                e longo prazo (1-5 anos). Metas menores ajudam a manter a
                motivação enquanto você trabalha nos objetivos maiores.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Meta">
        <div className="flex flex-col gap-4">
          <Input
            label="Título"
            placeholder="Ex: Reserva de emergência"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
          />
          <Input
            label="Valor objetivo"
            type="number"
            placeholder="10000"
            value={valorObjetivo}
            onChange={(e) => setValorObjetivo(e.target.value)}
            required
          />
          <Input
            label="Valor inicial (opcional)"
            type="number"
            placeholder="0"
            value={valorAtual}
            onChange={(e) => setValorAtual(e.target.value)}
          />
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[var(--foreground)]">Cor</span>
            <div className="flex gap-2">
              {CORES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCor(c)}
                  className={`h-7 w-7 cursor-pointer rounded-full transition-all ${
                    cor === c ? "ring-2 ring-offset-2 ring-[var(--ring)]" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <Button onClick={criar} disabled={!titulo.trim() || !valorObjetivo}>
            <Plus size={16} />
            Criar Meta
          </Button>
        </div>
      </Modal>
    </>
  );
}
