"use client";

import { useState, useEffect } from "react";
import type { Categoria } from "@/lib/types";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { X, Plus } from "lucide-react";
import { useToast } from "./ui/Toast";

type SplitPart = {
  categoria_id: string;
  descricao: string;
  valor: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  transacaoId: string;
  transacaoDescricao: string;
  transacaoValor: number;
  transacaoTipo: "receita" | "despesa";
  onDone: () => void;
};

export function SplitTransactionModal({
  open, onClose, transacaoId, transacaoDescricao,
  transacaoValor, transacaoTipo, onDone,
}: Props) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [parts, setParts] = useState<SplitPart[]>([
    { categoria_id: "", descricao: "", valor: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "listar_categorias", payload: { tipo: transacaoTipo } }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.data) setCategorias(res.data);
        });
    }
  }, [open, transacaoTipo]);

  function addPart() {
    setParts((prev) => [...prev, { categoria_id: "", descricao: "", valor: "" }]);
  }

  function removePart(idx: number) {
    setParts((prev) => prev.filter((_, i) => i !== idx));
  }

  function updatePart(idx: number, field: keyof SplitPart, value: string) {
    setParts((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }

  function distributeEqually() {
    if (parts.length === 0) return;
    const equal = (transacaoValor / parts.length).toFixed(2);
    setParts((prev) => prev.map((p) => ({ ...p, valor: equal.replace(".", ",") })));
  }

  const total = parts.reduce((s, p) => s + parseFloat(p.valor.replace(",", ".") || "0"), 0);
  const diff = Math.abs(total - transacaoValor);
  const isValid = parts.every((p) => p.categoria_id && parseFloat(p.valor.replace(",", ".") || "0") > 0) && diff < 0.01;

  async function handleSubmit() {
    if (!isValid) return;
    setLoading(true);
    setErro("");

    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "criar_split",
        payload: {
          transacao_id: transacaoId,
          parts: parts.map((p) => ({
            categoria_id: p.categoria_id,
            descricao: p.descricao || transacaoDescricao,
            valor: parseFloat(p.valor.replace(",", ".")),
          })),
        },
      }),
    });
    const json = await res.json();
    if (json.error) {
      setErro(json.error);
      toast({ message: json.error, type: "error" });
      setLoading(false);
      return;
    }

    setLoading(false);
    const undoId = transacaoId;
    onDone();
    onClose();
    toast({
      message: `Dividida em ${parts.length} parte(s)`,
      type: "success",
      undoLabel: "Reverter",
      undo: () => {
        fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "excluir_split", payload: { transacao_id: undoId } }),
        });
      },
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Dividir Transação">
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-3">
          <p className="text-sm font-medium text-[var(--foreground)]">{transacaoDescricao}</p>
          <p className={`text-lg font-bold tabular-nums ${transacaoTipo === "receita" ? "text-emerald-500" : "text-red-500"}`}>
            {transacaoTipo === "receita" ? "+" : "-"}R$ {transacaoValor.toFixed(2).replace(".", ",")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Partes</span>
          <button
            type="button"
            onClick={distributeEqually}
            className="ml-auto cursor-pointer rounded-md border border-[var(--border)] px-2 py-1 text-[11px] text-slate-400 hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            Distribuir igual
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {parts.map((part, idx) => (
            <div key={idx} className="rounded-lg border border-[var(--border)] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Parte {idx + 1}</span>
                {parts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePart(idx)}
                    className="cursor-pointer text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <select
                  value={part.categoria_id}
                  onChange={(e) => updatePart(idx, "categoria_id", e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-colors"
                >
                  <option value="">Selecione a categoria</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
                <Input
                  placeholder="Descrição (opcional)"
                  value={part.descricao}
                  onChange={(e) => updatePart(idx, "descricao", e.target.value)}
                />
                <Input
                  placeholder="Valor"
                  type="text"
                  inputMode="decimal"
                  value={part.valor}
                  onChange={(e) => updatePart(idx, "valor", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addPart}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] py-2 text-sm text-slate-400 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        >
          <Plus size={16} />
          Adicionar parte
        </button>

        <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
          <span className="text-xs text-slate-400">
            Total: <strong className="tabular-nums">R$ {total.toFixed(2).replace(".", ",")}</strong>
            {diff > 0.01 && (
              <span className="ml-1 text-red-500">
                (diferença de R$ {diff.toFixed(2).replace(".", ",")})
              </span>
            )}
          </span>
          {total.toFixed(2) === transacaoValor.toFixed(2) && (
            <span className="text-xs text-emerald-500">OK</span>
          )}
        </div>

        {erro && <p className="text-sm text-red-500">{erro}</p>}

        <Button onClick={handleSubmit} disabled={loading || !isValid}>
          {loading ? "Salvando..." : "Salvar divisão"}
        </Button>
      </div>
    </Modal>
  );
}
