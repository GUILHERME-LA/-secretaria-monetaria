"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Save, Loader2, User as UserIcon, Shield, Info, Sun, Moon } from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useTheme } from "@/components/ThemeProvider";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userMeta, setUserMeta] = useState<{ created_at?: string; last_sign_in_at?: string }>({});

  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");

  const { theme, toggle: toggleTheme } = useTheme();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(
      ({ data: { user } }: { data: { user: User | null } }) => {
        if (!user) {
          router.push("/login");
        } else {
          setUser(user);
          setNewEmail(user.email || "");
          setUserMeta({
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at || undefined,
          });
        }
        setLoadingUser(false);
      }
    );
  }, [supabase, router]);

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailLoading(true);
    setEmailError("");
    setEmailSuccess("");

    if (!user) return;
    if (newEmail === user.email) {
      setEmailError("O novo email é igual ao atual.");
      setEmailLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "solicitar_alteracao_email", payload: { new_email: newEmail } }),
      });
      const data = await res.json();

      if (data.success) {
        setEmailSuccess(
          "Enviamos um link de confirmação para seu email atual. Verifique sua caixa de entrada."
        );
      } else {
        setEmailError(data.error || "Erro ao solicitar alteração de email.");
      }
    } catch {
      setEmailError("Erro de conexão. Tente novamente.");
    }

    setEmailLoading(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError("");
    setPasswordSuccess("");

    if (!user) return;
    if (newPassword.length < 6) {
      setPasswordError("A nova senha deve ter no mínimo 6 caracteres.");
      setPasswordLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não conferem.");
      setPasswordLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      setPasswordError("Senha atual incorreta.");
      setPasswordLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setPasswordLoading(false);
  }

  if (loadingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            Configurações da conta
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Gerencie seu email, senha e informações da conta.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mb-6"
        >
          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <UserIcon className="h-5 w-5" />
              Resumo da conta
            </h2>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-lg bg-[var(--muted)]/30 px-4 py-3">
                <span className="text-sm text-[var(--muted-foreground)]">Email</span>
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {user?.email || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[var(--muted)]/30 px-4 py-3">
                <span className="text-sm text-[var(--muted-foreground)]">Conta criada em</span>
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {userMeta.created_at
                    ? new Date(userMeta.created_at).toLocaleDateString("pt-BR")
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[var(--muted)]/30 px-4 py-3">
                <span className="text-sm text-[var(--muted-foreground)]">Último login</span>
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {userMeta.last_sign_in_at
                    ? new Date(userMeta.last_sign_in_at).toLocaleString("pt-BR")
                    : "—"}
                </span>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.2 }}
          className="mb-6"
        >
          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Mail className="h-5 w-5" />
              Alterar email
            </h2>
            <form onSubmit={handleChangeEmail} className="flex flex-col gap-4">
              <Input label="Email atual" value={user?.email || ""} disabled />
              <Input
                label="Novo email"
                type="email"
                placeholder="novo@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
              {emailError && (
                <p className="text-sm text-[var(--destructive)]">{emailError}</p>
              )}
              {emailSuccess && (
                <p className="text-sm text-green-500">{emailSuccess}</p>
              )}
              <Button type="submit" disabled={emailLoading}>
                <Save className="h-4 w-4" />
                {emailLoading ? "Salvando..." : "Alterar email"}
              </Button>
            </form>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.2 }}
          className="mb-6"
        >
          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Lock className="h-5 w-5" />
              Alterar senha
            </h2>
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <Input
                label="Senha atual"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <Input
                label="Nova senha"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <Input
                label="Confirmar nova senha"
                type="password"
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {passwordError && (
                <p className="text-sm text-[var(--destructive)]">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-sm text-green-500">{passwordSuccess}</p>
              )}
              <Button type="submit" disabled={passwordLoading}>
                <Save className="h-4 w-4" />
                {passwordLoading ? "Salvando..." : "Alterar senha"}
              </Button>
            </form>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.13, duration: 0.2 }}
          className="mb-6"
        >
          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              Aparência
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {theme === "dark" ? "Modo escuro" : "Modo claro"}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {theme === "dark"
                    ? "Interface em tons escuros para reduzir cansaço visual"
                    : "Interface clara para melhor visibilidade em ambientes iluminados"}
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
                style={{
                  backgroundColor: theme === "dark" ? "var(--accent)" : "var(--muted)",
                }}
                role="switch"
                aria-checked={theme === "dark"}
              >
                <span
                  className={`pointer-events-none inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow ring-0 transition-transform ${
                    theme === "dark" ? "translate-x-5" : "translate-x-0"
                  }`}
                >
                  {theme === "dark" ? <Moon size={10} /> : <Sun size={10} />}
                </span>
              </button>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.2 }}
        >
          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Info className="h-5 w-5" />
              Sobre o aplicativo
            </h2>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-lg bg-[var(--muted)]/30 px-4 py-3">
                <span className="text-sm text-[var(--muted-foreground)]">Versão</span>
                <span className="text-sm font-medium text-[var(--foreground)]">1.0.0</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[var(--muted)]/30 px-4 py-3">
                <span className="text-sm text-[var(--muted-foreground)]">Armazenamento</span>
                <span className="text-sm font-medium text-[var(--foreground)]">Local (navegador)</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[var(--muted)]/30 px-4 py-3">
                <span className="text-sm text-[var(--muted-foreground)]">Autenticação</span>
                <span className="text-sm font-medium text-[var(--foreground)]">Supabase</span>
              </div>
            </div>
          </Card>
        </motion.div>
      </main>
    </>
  );
}
