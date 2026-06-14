"use client";

import { useEffect, useState } from "react";
import type { Recorrente } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { RecorrenteForm } from "@/components/RecorrenteForm";
import { ArrowLeft, LayoutDashboard, Plus, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RecorrentesPage() {
  const router = useRouter();
  const [recorrentes, setRecorrentes] = useState<(Recorrente & { categoria_nome?: string })[]>([]);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  async function load() {
    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "listar_recorrentes", payload: {} }),
    });
    const { data } = await res.json();

    if (data) {
      setRecorrentes(
        data.map((r: any) => ({
          ...r,
          valor: Number(r.valor),
        }))
      );
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

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Contas Recorrentes</h1>
          <Button
            onClick={() => {
              setEditItem(null);
              setOpen(true);
            }}
          >
            <Plus size={18} /> Nova
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {recorrentes.map((r) => (
            <Card key={r.id} className={`flex items-center justify-between ${!r.ativo ? "opacity-50" : ""}`}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${r.tipo === "receita" ? "bg-green-500" : "bg-red-500"}`} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--foreground)]">{r.descricao}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {r.categoria_nome} · Dia {r.dia_vencimento} · {r.tipo === "receita" ? "Receita" : "Despesa"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-3">
                <span className={`shrink-0 font-semibold ${r.tipo === "receita" ? "text-green-500" : "text-red-500"}`}>
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
                  className="cursor-pointer rounded p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => toggleAtivo(r)}
                  className="cursor-pointer rounded p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
                  title={r.ativo ? "Desativar" : "Ativar"}
                >
                  {r.ativo ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} />}
                </button>
              </div>
            </Card>
          ))}
          {recorrentes.length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
              Nenhuma conta recorrente. Clique em "Nova" para adicionar.
            </p>
          )}
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
    </>
  );
}
