"use client";

import { useState, useCallback, useRef } from "react";
import { parseNubankCsv, type ParsedTransaction } from "@/lib/parse-nubank-csv";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Upload, FileText, ArrowUp, ArrowDown, Check, AlertCircle, Loader2 } from "lucide-react";

type ImportResult = {
  importadas: number;
  duplicadas: number;
  total: number;
};

export function CsvImporter() {
  const [parsed, setParsed] = useState<ParsedTransaction[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const receitas = parsed.filter((t) => t.tipo === "receita");
  const despesas = parsed.filter((t) => t.tipo === "despesa");

  const handleFile = useCallback((file: File) => {
    setError("");
    setResult(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const transactions = parseNubankCsv(content);
      if (transactions.length === 0) {
        setError("Nenhuma transação encontrada. Verifique se o arquivo é um CSV válido do Nubank.");
        return;
      }
      setParsed(transactions);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleImport = async () => {
    if (!fileName || parsed.length === 0) return;
    setImporting(true);
    setError("");

    try {
      const formData = new FormData();
      const blob = new Blob(
        [
          "date,title,amount,category\n" +
            parsed
              .map(
                (t) =>
                  `${t.date},${t.descricao},${t.tipo === "despesa" ? "-" : ""}${t.valor},${t.categoria_nubank || ""}`
              )
              .join("\n"),
        ],
        { type: "text/csv" }
      );
      formData.append("file", blob, fileName);

      const res = await fetch("/api/importar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setResult(data.data);
        setParsed([]);
      }
    } catch {
      setError("Erro ao importar. Tente novamente.");
    } finally {
      setImporting(false);
    }
  };

  if (result) {
    return (
      <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
          <Check size={28} className="text-green-500" />
        </div>
        <h3 className="text-lg font-bold text-[var(--foreground)]">
          Importação concluída!
        </h3>
        <div className="mt-3 flex justify-center gap-6 text-sm">
          <div>
            <p className="text-2xl font-bold text-green-500">{result.importadas}</p>
            <p className="text-[var(--muted-foreground)]">importadas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-500">{result.duplicadas}</p>
            <p className="text-[var(--muted-foreground)]">duplicadas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--foreground)]">{result.total}</p>
            <p className="text-[var(--muted-foreground)]">total</p>
          </div>
        </div>
        <button
          onClick={() => setResult(null)}
          className="mt-6 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-medium text-[var(--primary-foreground)]"
        >
          Importar outro arquivo
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--muted)]/20 px-6 py-12 text-center transition-colors hover:border-[var(--accent)] hover:bg-[var(--muted)]/40"
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--muted)]">
          <Upload size={24} className="text-[var(--muted-foreground)]" />
        </div>
        <p className="text-sm font-medium text-[var(--foreground)]">
          Arraste o CSV do Nubank aqui
        </p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          ou clique para selecionar
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {parsed.length > 0 && (
        <>
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-[var(--muted-foreground)]" />
            <span className="text-sm text-[var(--foreground)]">
              {fileName} — {parsed.length} transações
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-[var(--muted)]/30 p-4 text-center">
              <p className="text-2xl font-bold text-[var(--foreground)]">{parsed.length}</p>
              <p className="text-xs text-[var(--muted-foreground)]">total</p>
            </div>
            <div className="rounded-xl bg-green-500/10 p-4 text-center">
              <p className="text-2xl font-bold text-green-500">{receitas.length}</p>
              <p className="text-xs text-[var(--muted-foreground)]">receitas</p>
            </div>
            <div className="rounded-xl bg-red-500/10 p-4 text-center">
              <p className="text-2xl font-bold text-red-500">{despesas.length}</p>
              <p className="text-xs text-[var(--muted-foreground)]">despesas</p>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto rounded-xl border border-[var(--border)]">
            <div className="flex flex-col gap-1 p-3">
              {parsed.slice(0, 20).map((t, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                        t.tipo === "receita" ? "bg-green-500/10" : "bg-red-500/10"
                      }`}
                    >
                      {t.tipo === "receita" ? (
                        <ArrowUp size={13} className="text-green-500" />
                      ) : (
                        <ArrowDown size={13} className="text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{t.descricao}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{formatDate(t.date)}</p>
                    </div>
                  </div>
                  <span
                    className={`font-semibold ${
                      t.tipo === "receita" ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {t.tipo === "receita" ? "+" : "-"}
                    {formatCurrency(t.valor)}
                  </span>
                </div>
              ))}
              {parsed.length > 20 && (
                <p className="text-center text-xs text-[var(--muted-foreground)]">
                  +{parsed.length - 20} transações
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleImport}
            disabled={importing}
            className="flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {importing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Importando...
              </>
            ) : (
              "Confirmar importação"
            )}
          </button>
        </>
      )}
    </div>
  );
}
