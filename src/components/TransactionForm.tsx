"use client";

import { useState, useEffect, useRef } from "react";
import type { TransacaoFormData, Tag } from "@/lib/types";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";
import { Button } from "./ui/Button";
import { CategorySelect } from "./CategorySelect";
import { TagInput } from "./ui/TagInput";
import { useToast } from "./ui/Toast";

type Props = {
  onDone: () => void;
  initial?: TransacaoFormData & { id?: string };
  currentMonth?: string;
};

export function TransactionForm({ onDone, initial, currentMonth }: Props) {
  const { toast } = useToast();
  const [tipo, setTipo] = useState<"receita" | "despesa">(
    initial?.tipo || "despesa"
  );
  const [categoriaId, setCategoriaId] = useState(initial?.categoria_id || "");
  const [descricao, setDescricao] = useState(initial?.descricao || "");
  const [valor, setValor] = useState(initial?.valor || "");
  const [data, setData] = useState(
    initial?.data || new Date().toISOString().slice(0, 10)
  );
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [justificativa, setJustificativa] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const oldDataRef = useRef<any>(null);

  useEffect(() => {
    if (initial?.id) {
      fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "listar_tags_transacao", payload: { transacao_id: initial.id } }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.data) setTagIds(res.data.map((t: Tag) => t.id));
        });
    }
  }, [initial?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (initial?.id && !justificativa.trim()) return;

    setLoading(true);

    const novaData = data;
    const mesDaData = novaData.slice(0, 7);
    const status = currentMonth && mesDaData > currentMonth ? "pendente" : "confirmada";
    const novoValor = parseFloat(valor.replace(",", "."));

    if (initial?.id) {
      const resAtual = await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "obter_transacao", payload: { id: initial.id } }),
      });
      const { data: atual } = await resAtual.json();
      oldDataRef.current = atual;

      const updRes = await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "atualizar_transacao",
          payload: { id: initial.id, tipo, categoria_id: categoriaId, descricao, valor: novoValor, data: novaData },
        }),
      });
      const updJson = await updRes.json();
      if (updJson.error) {
        setErro(updJson.error);
        toast({ message: updJson.error, type: "error" });
        setLoading(false);
        return;
      }

      await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "inserir_auditoria",
          payload: {
            transacao_id: initial.id,
            acao: "alteracao",
            justificativa: justificativa.trim(),
            dados_anteriores: atual ? JSON.stringify({
              tipo: atual.tipo, categoria_id: atual.categoria_id,
              descricao: atual.descricao, valor: Number(atual.valor),
              data: atual.data, status: atual.status,
            }) : null,
            dados_novos: JSON.stringify({ tipo, categoria_id: categoriaId, descricao, valor: novoValor, data: novaData, status }),
          },
        }),
      });

      await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "vincular_tags_transacao", payload: { transacao_id: initial.id, tag_ids: tagIds } }),
      });

      setLoading(false);
      onDone();
      toast({
        message: "Transação atualizada com sucesso",
        type: "success",
        undo: () => {
          const old = oldDataRef.current;
          if (!old) return;
          fetch("/api/db", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "atualizar_transacao",
              payload: { id: initial.id, tipo: old.tipo, categoria_id: old.categoria_id, descricao: old.descricao, valor: Number(old.valor), data: old.data },
            }),
          });
        },
        undoLabel: "Reverter",
      });
    } else {
      const res = await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "inserir_transacao",
          payload: { tipo, categoria_id: categoriaId, descricao, valor: novoValor, data: novaData, status },
        }),
      });
      const insertData = await res.json();
      if (insertData.error) {
        setErro(insertData.error);
        toast({ message: insertData.error, type: "error" });
        setLoading(false);
        return;
      }

      const newId = insertData.data.id;

      await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "vincular_tags_transacao", payload: { transacao_id: newId, tag_ids: tagIds } }),
      });

      setLoading(false);
      onDone();
      toast({
        message: "Transação adicionada com sucesso",
        type: "success",
        undo: () => {
          fetch("/api/db", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "excluir_transacao", payload: { id: newId } }),
          });
        },
      });
    }
  }

  const editando = !!initial?.id;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setTipo("receita"); setCategoriaId(""); }}
          className={`flex-1 cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors ${
            tipo === "receita"
              ? "bg-green-500 text-white"
              : "bg-[var(--muted)] text-[var(--muted-foreground)]"
          }`}
        >
          Receita
        </button>
        <button
          type="button"
          onClick={() => { setTipo("despesa"); setCategoriaId(""); }}
          className={`flex-1 cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors ${
            tipo === "despesa"
              ? "bg-red-500 text-white"
              : "bg-[var(--muted)] text-[var(--muted-foreground)]"
          }`}
        >
          Despesa
        </button>
      </div>

      <CategorySelect tipo={tipo} value={categoriaId} onChange={setCategoriaId} />

      <Input
        label="Descrição"
        placeholder="Ex: Almoço no restaurante"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        required
      />

      <Input
        label="Valor"
        type="text"
        inputMode="decimal"
        placeholder="0,00"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        required
      />

      <Input
        label="Data"
        type="date"
        value={data}
        onChange={(e) => setData(e.target.value)}
        required
      />

      <TagInput value={tagIds} onChange={setTagIds} />

      {editando && (
        <Textarea
          label="Justificativa *"
          placeholder="Por que você está alterando esta transação?"
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
          required
        />
      )}

      {erro && (
        <p className="text-sm text-red-500">{erro}</p>
      )}

      <Button type="submit" disabled={loading || (editando && !justificativa.trim())}>
        {loading ? "Salvando..." : editando ? "Salvar" : "Adicionar"}
      </Button>
    </form>
  );
}
