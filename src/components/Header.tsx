"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Repeat, History, HelpCircle, Menu, Target, BarChart3, Upload } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { SideDrawer } from "./SideDrawer";

const navLinks = [
  { href: "/recorrentes", label: "Recorrentes", icon: Repeat },
  { href: "/auditoria", label: "Histórico", icon: History },
  { href: "/importar", label: "Importar", icon: Upload },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/ajuda", label: "Ajuda", icon: HelpCircle },
];

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-lg shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-6">
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex cursor-pointer rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>

            <button
              onClick={() => router.push("/dashboard")}
              className="flex cursor-pointer items-center gap-2"
              id="tour-header"
            >
              <span className="text-lg font-bold tracking-tight text-[var(--foreground)]">
                ✦ Secretaria Monetária
              </span>
            </button>

            <nav className="hidden lg:flex items-center gap-0.5">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = pathname === link.href;
                return (
                  <button
                    key={link.href}
                    onClick={() => router.push(link.href)}
                    className={`relative flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "text-[var(--accent)]"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <Icon size={16} />
                    <span>{link.label}</span>
                    {active && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[var(--accent)]" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
