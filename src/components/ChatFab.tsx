"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Check, Sparkles, Paperclip, FileText, Image, FileX } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { Textarea } from "./ui/Textarea";

type PreviewData = {
  tipo: string;
  descricao: string;
  valor: number;
  categoria: string;
  data: string;
  criar_categoria?: boolean;
};

type AttachedFile = {
  file: File;
  preview?: string;
  processed?: {
    type: "image" | "text";
    content?: string;
    base64?: string;
    mimeType?: string;
    fileName: string;
    pages?: number;
  };
};

export function ChatFab({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [erro, setErro] = useState("");
  const [success, setSuccess] = useState(false);
  const [attached, setAttached] = useState<AttachedFile | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function toggle() {
    if (!open) {
      setPreview(null);
      setErro("");
      setSuccess(false);
      setMessage("");
      setAttached(null);
    }
    setOpen((v) => !v);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setErro("Arquivo muito grande (máx. 10MB)");
      return;
    }

    const attachedFile: AttachedFile = { file };

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        attachedFile.preview = reader.result as string;
        setAttached(attachedFile);
      };
      reader.readAsDataURL(file);
    } else {
      setAttached(attachedFile);
    }

    if (fileRef.current) fileRef.current.value = "";
  }

  async function processFile(file: File): Promise<AttachedFile["processed"]> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/process-file", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return data.data;
  }

  async function handleSend() {
    if ((!message.trim() && !attached) || loading) return;
    setLoading(true);
    setErro("");
    setPreview(null);
    setSuccess(false);

    try {
      let fullMessage = message.trim();

      if (attached) {
        const processed = await processFile(attached.file);
        if (!processed) throw new Error("Falha ao processar arquivo");
        setAttached((prev) => (prev ? { ...prev, processed } : null));

        if (processed.type === "image") {
          fullMessage = fullMessage || "Analise esta imagem e extraia informações de transação financeira (valor, descrição, data, categoria)";
        } else {
          const contentPreview = processed.content?.slice(0, 3000) || "";
          fullMessage = fullMessage
            ? `${fullMessage}\n\nConteúdo do arquivo "${processed.fileName}":\n${contentPreview}`
            : `Analise este arquivo e extraia transações financeiras:\n\nConteúdo do arquivo "${processed.fileName}":\n${contentPreview}`;
        }
      }

      const body: any = { message: fullMessage };

      if (attached?.processed?.type === "image" && attached.processed.base64) {
        body.image = attached.processed.base64;
        body.imageMimeType = attached.processed.mimeType;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.erro) {
        setErro(data.erro);
        setLoading(false);
        return;
      }

      if (data.success) {
        setPreview(data.transacao);
        setAttached(null);
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro de conexão. Tente novamente.");
    }

    setLoading(false);
  }

  async function handleConfirm() {
    if (!preview) return;
    setLoading(true);

    let resCat = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "buscar_categoria", payload: { nome: preview.categoria, tipo: preview.tipo } }),
    });
    let { data: cats } = await resCat.json();
    let catRow = Array.isArray(cats) ? cats[0] : cats;
    let categoria_id = catRow?.id;

    if (!categoria_id && preview.criar_categoria) {
      const color = `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`;
      const createRes = await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "inserir_categoria",
          payload: { nome: preview.categoria, tipo: preview.tipo, cor: color },
        }),
      });
      const { data: newCat } = await createRes.json();
      categoria_id = newCat?.id;
    }

    if (!categoria_id) {
      setErro(`Categoria "${preview.categoria}" não encontrada.`);
      setLoading(false);
      return;
    }

    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "inserir_transacao",
        payload: {
          tipo: preview.tipo,
          categoria_id,
          descricao: preview.descricao,
          valor: preview.valor,
          data: preview.data,
          status: "confirmada",
        },
      }),
    });
    const data = await res.json();
    if (data.error) {
      setErro("Erro ao salvar: " + data.error);
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
      <button
        id="tour-chat"
        onClick={toggle}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg transition-transform active:scale-95"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-black/30 sm:hidden"
              onClick={toggle}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="fixed bottom-24 right-3 sm:right-6 z-50 w-[calc(100vw-1.5rem)] max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
              style={{ overscrollBehavior: "contain" }}
            >
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
                          {preview.criar_categoria && (
                            <span className="ml-1">+nova</span>
                          )}
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
                        className="min-h-[44px] flex-1 cursor-pointer rounded-lg border border-[var(--border)] py-2 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="min-h-[44px] flex-1 cursor-pointer rounded-lg bg-[var(--accent)] py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {loading ? "Adicionando..." : preview.criar_categoria ? "Criar e adicionar" : "Adicionar"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Descreva o gasto, ou anexe um comprovante:
                    </p>

                    {attached && (
                      <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-2">
                        {attached.file.type.startsWith("image/") ? (
                          <Image size={14} className="shrink-0 text-[var(--accent)]" />
                        ) : (
                          <FileText size={14} className="shrink-0 text-[var(--accent)]" />
                        )}
                        <span className="min-w-0 flex-1 truncate text-xs text-[var(--foreground)]">
                          {attached.file.name}
                        </span>
                        {attached.processed && (
                          <Check size={12} className="shrink-0 text-green-500" />
                        )}
                        <button
                          onClick={() => setAttached(null)}
                          className="shrink-0 cursor-pointer text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
                        >
                          <FileX size={14} />
                        </button>
                      </div>
                    )}

                    <div className="flex items-end gap-2">
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*,.pdf,.csv,.txt"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
                        title="Anexar arquivo"
                      >
                        <Paperclip size={16} />
                      </button>
                      <Textarea
                        ref={inputRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={attached ? "O que fazer com este arquivo?" : "Ex: comprei um sorvete de 10 reais"}
                        style={{ fontSize: 16, WebkitTextSizeAdjust: "100%" }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                      />
                    </div>

                    {erro && (
                      <p className="text-xs text-red-500">{erro}</p>
                    )}
                    <button
                      onClick={handleSend}
                      disabled={(!message.trim() && !attached) || loading}
                      className="min-h-[44px] flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--accent)] py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-40"
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
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
