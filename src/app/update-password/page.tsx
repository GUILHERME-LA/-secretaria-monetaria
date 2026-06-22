"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Lock, CheckCircle2, Loader2, AlertTriangle, ArrowLeft, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

function calcStrength(pw: string): { score: number; label: string; color: string; width: string } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: "Fraca", color: "var(--destructive)", width: "20%" };
  if (score === 2) return { score, label: "Média", color: "#f97316", width: "40%" };
  if (score === 3) return { score, label: "Boa", color: "#eab308", width: "60%" };
  if (score === 4) return { score, label: "Forte", color: "#22c55e", width: "80%" };
  return { score, label: "Muito forte", color: "#15803d", width: "100%" };
}

export default function UpdatePasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"form" | "expired" | "done">("form");

  const strength = useMemo(() => calcStrength(password), [password]);

  useEffect(() => {
    const hash = window.location.hash;
    const hasRecoveryHash = hash.includes("type=recovery") || hash.includes("access_token");

    const timer = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const noHash = !window.location.hash;
        if (hasRecoveryHash || noHash) {
          setChecking(false);
        } else {
          router.push("/dashboard");
        }
      } else {
        setStatus("expired");
        setChecking(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [supabase, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      setLoading(false);
      return;
    }

    if (password !== confirm) {
      setError("As senhas não conferem.");
      setLoading(false);
      return;
    }

    const { error: err } = await supabase.auth.updateUser({ password });

    if (err) {
      if (err.message?.toLowerCase().includes("session") || err.message?.toLowerCase().includes("token") || err.message?.toLowerCase().includes("expired")) {
        setStatus("expired");
        setError("Este link de recuperação expirou. Solicite um novo abaixo.");
      } else {
        setError(err.message);
      }
      setLoading(false);
    } else {
      setStatus("done");
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
          <p className="text-sm text-[var(--muted-foreground)]">Verificando link...</p>
        </div>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-green-500/10 p-3">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <h1 className="mb-2 text-xl font-bold text-[var(--foreground)]">
            Senha atualizada!
          </h1>
          <p className="mb-6 text-sm text-[var(--muted-foreground)]">
            Sua senha foi redefinida com sucesso.
          </p>
          <Button onClick={() => router.push("/dashboard")}>Ir para o dashboard</Button>
        </Card>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-red-500/10 p-3">
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
          </div>
          <h1 className="mb-2 text-xl font-bold text-[var(--foreground)]">
            Link inválido
          </h1>
          <p className="mb-6 text-sm text-[var(--muted-foreground)]">
            Esta página só pode ser acessada através do link enviado por email. Se o link expirou, solicite um novo.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/forgot-password">
              <Button className="w-full">
                <Mail className="h-4 w-4" />
                Solicitar novo link
              </Button>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para o login
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-[var(--accent)]/10 p-3">
            <Lock className="h-6 w-6 text-[var(--accent)]" />
          </div>
        </div>

        <h1 className="mb-1 text-center text-xl font-bold text-[var(--foreground)]">
          Redefinir senha
        </h1>
        <p className="mb-6 text-center text-sm text-[var(--muted-foreground)]">
          Escolha uma nova senha para sua conta.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Input
              label="Nova senha"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              required
            />
            {password.length > 0 && (
              <div className="mt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: strength.width, backgroundColor: strength.color }}
                  />
                </div>
                <p className="mt-1 text-xs" style={{ color: strength.color }}>
                  {strength.label}
                </p>
              </div>
            )}
          </div>
          <Input
            label="Confirmar senha"
            type="password"
            placeholder="Repita a nova senha"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              if (error) setError("");
            }}
            required
          />
          {confirm.length > 0 && password !== confirm && (
            <p className="text-xs text-[var(--destructive)]">As senhas não conferem</p>
          )}
          {error && (
            <p className="text-sm text-[var(--destructive)]">{error}</p>
          )}
          <Button type="submit" disabled={loading || password.length < 6 || password !== confirm}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </span>
            ) : (
              "Redefinir senha"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
