"use client";

import { useEffect, useState, useRef } from "react";
import type { Categoria } from "@/lib/types";
import { Select } from "./ui/Select";
import { Modal } from "./ui/Modal";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";

type Props = {
  tipo: "receita" | "despesa";
  value: string;
  onChange: (id: string) => void;
};

export function CategorySelect({ tipo, value, onChange }: Props) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [open, setOpen] = useState(false);
  const [novaCat, setNovaCat] = useState("");
  const [novaCor, setNovaCor] = useState("#6366f1");
  const loadedTipo = useRef<string | null>(null);

  useEffect(() => {
    if (loadedTipo.current === tipo) return;
    loadedTipo.current = tipo;
    load();
  }, [tipo]);

  async function load() {
    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "listar_categorias", payload: { tipo } }),
    });
    const json = await res.json();
    if (json.data) setCategorias(json.data);
  }

  async function criarCategoria() {
    if (!novaCat.trim()) return;
    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "inserir_categoria",
        payload: { nome: novaCat.trim(), tipo, cor: novaCor },
      }),
    });
    const data = await res.json();
    if (data.error) {
      alert("Erro ao criar categoria: " + data.error);
      return;
    }
    setNovaCat("");
    setOpen(false);
    loadedTipo.current = null;
    load();
  }

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <Select
          label="Categoria"
          placeholder="Selecione..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          options={categorias.map((c) => ({
            value: c.id,
            label: c.nome,
          }))}
        />
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-0.5 cursor-pointer rounded-lg bg-[var(--muted)] px-3 py-2 text-sm text-[var(--muted-foreground)] hover:brightness-110 transition-all"
      >
        + Nova
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nova Categoria">
        <div className="flex flex-col gap-4">
          <Input
            label="Nome"
            value={novaCat}
            onChange={(e) => setNovaCat(e.target.value)}
            placeholder="Ex: Mercado"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">
              Cor
            </label>
            <input
              type="color"
              value={novaCor}
              onChange={(e) => setNovaCor(e.target.value)}
              className="h-10 w-full cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--card)]"
            />
          </div>
          <Button type="button" onClick={criarCategoria}>Criar Categoria</Button>
        </div>
      </Modal>
    </div>
  );
}
