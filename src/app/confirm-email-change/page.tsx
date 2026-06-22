"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Mail, CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type PageState =
  | "loading"
  | "invalid"
  | "expired"
  | "valid"
  | "confirming"
  | "success"
  | "error";

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [state, setState] = useState<PageState>("loading");
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }

    fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "validar_token_email", payload: { token } }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCurrentEmail(data.data.current_email);
          setNewEmail(data.data.new_email);
          setState("valid");
        } else if (data.error?.includes("expirado")) {
          setState("expired");
        } else {
          setState("invalid");
        }
      })
      .catch(() => setState("invalid"));
  }, [token]);

  async function handleConfirm() {
    setState("confirming");
    setErrorMsg("");

    try {
      const res = await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirmar_alteracao_email", payload: { token } }),
      });
      const data = await res.json();

      if (data.success) {
        setState("success");
      } else {
        setErrorMsg(data.error || "Erro ao confirmar alteração.");
        setState("error");
      }
    } catch {
      setErrorMsg("Erro de conexão. Tente novamente.");
      setState("error");
    }
  }

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm text-center">
          <div className="mb-6 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">Verificando link...</p>
        </Card>
      </div>
    );
  }

  if (state === "invalid" || state === "expired") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-[var(--destructive)]/10 p-3">
              <XCircle className="h-8 w-8 text-[var(--destructive)]" />
            </div>
          </div>
          <h1 className="mb-2 text-xl font-bold text-[var(--foreground)]">
            Link {state === "expired" ? "expirado" : "inválido"}
          </h1>
          <p className="mb-6 text-sm text-[var(--muted-foreground)]">
            {state === "expired"
              ? "O link de confirmação expirou. Solicite uma nova alteração de email."
              : "Este link não é válido. Verifique se o endereço está correto."}
          </p>
          <Button variant="secondary" onClick={() => router.push("/settings")}>
            Ir para configurações
          </Button>
        </Card>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-green-500/10 p-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <h1 className="mb-2 text-xl font-bold text-[var(--foreground)]">
            Email alterado com sucesso!
          </h1>
          <p className="mb-6 text-sm text-[var(--muted-foreground)]">
            Enviamos um link de confirmação para o novo endereço. Verifique sua caixa de entrada.
          </p>
          <Button onClick={() => router.push("/dashboard")}>
            Ir para o dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-[var(--accent)]/10 p-3">
            <Mail className="h-8 w-8 text-[var(--accent)]" />
          </div>
        </div>
        <h1 className="mb-2 text-xl font-bold text-[var(--foreground)]">
          Confirmar alteração de email
        </h1>
        <p className="mb-4 text-sm text-[var(--muted-foreground)]">
          Deseja alterar seu email de
        </p>
        <p className="mb-1 text-sm font-medium text-[var(--foreground)]">{currentEmail}</p>
        <p className="mb-1 text-sm text-[var(--muted-foreground)]">para</p>
        <p className="mb-6 text-sm font-medium text-[var(--accent)]">{newEmail}</p>
        {errorMsg && (
          <p className="mb-4 text-sm text-[var(--destructive)]">{errorMsg}</p>
        )}
        <div className="flex flex-col gap-3">
          <Button onClick={handleConfirm} disabled={state === "confirming"}>
            {state === "confirming" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Confirmando...
              </>
            ) : (
              "Sim, alterar email"
            )}
          </Button>
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center justify-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Cancelar
          </button>
        </div>
      </Card>
    </div>
  );
}

export default function ConfirmEmailChangePage() {
  return (
    <Suspense fallback={null}>
      <ConfirmEmailContent />
    </Suspense>
  );
}
