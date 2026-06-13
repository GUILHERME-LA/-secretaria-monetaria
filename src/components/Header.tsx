"use client";

import { LogOut, Settings, Repeat, HelpCircle } from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <h1 id="tour-header" className="text-lg font-bold tracking-tight text-[var(--foreground)]">
          ✦ Secretaria Monetária
        </h1>
        <div className="flex items-center gap-2">
          <button
            id="tour-recorrentes"
            onClick={() => router.push("/recorrentes")}
            className="cursor-pointer rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
            title="Contas Recorrentes"
          >
            <Repeat size={18} />
          </button>
          <button
            onClick={() => router.push("/ajuda")}
            className="cursor-pointer rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
            title="Ajuda"
          >
            <HelpCircle size={18} />
          </button>
          <button
            onClick={() => router.push("/settings")}
            className="cursor-pointer rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
            title="Configurações"
          >
            <Settings size={18} />
          </button>
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="cursor-pointer rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
