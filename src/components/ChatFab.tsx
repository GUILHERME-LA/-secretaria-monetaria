"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Check, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { formatCurrency } from "@/lib/utils";
import { Textarea } from "./ui/Textarea";

type PreviewData = {
  tipo: string;
  descricao: string;
  valor: number;
  categoria: string;
  data: string;
};

export function ChatFab({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [erro, setErro] = useState("");
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  async function handleSend() {
    if (!message.trim() || loading) return;
    setLoading(true);
    setErro("");
    setPreview(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });

      const data = await res.json();

      if (data.erro) {
        setErro(data.erro);
        setLoading(false);
        return;
      }

      if (data.success) {
        setPreview(data.transacao);
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    }

    setLoading(false);
  }

  async function handleConfirm() {
    if (!preview) return;
    setLoading(true);

    // Busca categoria pelo nome
    const { data: cats } = await supabase
      .from("sm_categorias")
      .select("id")
      .eq("nome", preview.categoria)
      .eq("tipo", preview.tipo)
      .single();

    const categoria_id = cats?.id;

    if (!categoria_id) {
      setErro(`Categoria "${preview.categoria}" não encontrada.`);
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("sm_transacoes").insert({
      tipo: preview.tipo,
      categoria_id,
      descricao: preview.descricao,
      valor: preview.valor,
      data: preview.data,
    });

    if (error) {
      setErro("Erro ao salvar.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setPreview(null);
    setMessage("");
    setLoading(false);
    onDone();

    setTimeout(() => {
      setSuccess(false);
      setOpen(false);
    }, 1500);
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Bolha de chat */}
      {open && (
        <div className="fixed bottom-24 right-3 sm:right-6 z-50 w-[calc(100vw-1.5rem)] max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
            <Sparkles size={16} style={{ color: "var(--accent)" }} />
            <span className="text-sm font-semibold text-[var(--foreground)]">
              Adicionar com IA
            </span>
          </div>

          <div className="p-4">
            {success ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                  <Check size={20} className="text-green-500" />
                </div>
                <p className="text-sm font-medium text-green-500">
                  Transação adicionada!
                </p>
              </div>
            ) : preview ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-[var(--muted-foreground)]">
                  Confira o que entendi:
                </p>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        preview.tipo === "receita"
                          ? "bg-green-500/10 text-green-500"
                          : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {preview.tipo === "receita" ? "Receita" : "Despesa"}
                    </span>
                    <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-medium" style={{ color: "var(--accent)" }}>
                      {preview.categoria}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {preview.descricao}
                  </p>
                  <p className="text-lg font-bold text-[var(--foreground)]">
                    {formatCurrency(preview.valor)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setPreview(null);
                      setErro("");
                    }}
                    className="flex-1 cursor-pointer rounded-lg border border-[var(--border)] py-2 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="flex-1 cursor-pointer rounded-lg bg-[var(--accent)] py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {loading ? "Adicionando..." : "Adicionar"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-[var(--muted-foreground)]">
                  Descreva o gasto ou receita do seu jeito:
                </p>
                <Textarea
                  ref={inputRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ex: comprei um sorvete de 10 reais"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                {erro && (
                  <p className="text-xs text-red-500">{erro}</p>
                )}
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || loading}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--accent)] py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  {loading ? "Analisando..." : "Enviar"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
