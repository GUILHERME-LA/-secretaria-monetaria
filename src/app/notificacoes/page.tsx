"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, AlertTriangle, Bell, CheckCheck, X } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  generateNotifications,
  type Notificacao,
} from "@/lib/notifications";

type Tab = "all" | "update" | "critical";

export default function NotificacoesPage() {
  const [notifications, setNotifications] = useState<Notificacao[]>([]);
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    const stored = getNotifications();
    if (stored.length > 0) {
      setNotifications(stored);
    }
    generateNotifications(fetchApi).then(setNotifications);
  }, []);

  useEffect(() => {
    markAllAsRead();
    window.dispatchEvent(new CustomEvent("notifications-read"));
  }, []);

  async function fetchApi(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  function handleDismiss(id: string) {
    dismissNotification(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, dismissed: true, read: true } : n))
    );
  }

  function handleMarkRead(id: string) {
    markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  const filtered = notifications.filter((n) => {
    if (n.dismissed) return false;
    if (tab === "update") return n.type === "update";
    if (tab === "critical") return n.type === "critical";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read && !n.dismissed).length;

  function formatDate(dateStr: string) {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR");
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10">
              <Bell size={20} className="text-[var(--accent)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--foreground)]">Notificações</h1>
              {unreadCount > 0 && (
                <p className="text-xs text-[var(--muted-foreground)]">{unreadCount} não lida(s)</p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { markAllAsRead(); window.dispatchEvent(new CustomEvent("notifications-read")); setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))); }}>
              <CheckCheck size={14} />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <div className="mb-6 flex gap-1 rounded-lg bg-[var(--muted)] p-1">
          {(["all", "update", "critical"] as Tab[]).map((t) => {
            const count = notifications.filter((n) => !n.dismissed && (t === "all" || n.type === t)).length;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 cursor-pointer rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  tab === t
                    ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {t === "all" && "Todas"}
                {t === "update" && "Novidades"}
                {t === "critical" && "Alertas"}
                {count > 0 && (
                  <span className={`ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                    tab === t ? "bg-[var(--accent)] text-white" : "bg-[var(--accent)]/10 text-[var(--accent)]"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Nenhuma notificação"
            description={tab === "all" ? "Você está em dia! Nenhuma notificação pendente." : tab === "critical" ? "Nenhum alerta crítico no momento." : "Nenhuma novidade de versão."}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((n, idx) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.2 }}
                className={`group relative flex items-start gap-4 rounded-xl border px-4 py-4 transition-colors ${
                  n.type === "critical"
                    ? "border-red-500/20 bg-red-500/5"
                    : "border-[var(--border)] bg-[var(--card)]"
                } ${!n.read ? "ring-1 ring-[var(--accent)]/20" : ""}`}
              >
                {!n.read && (
                  <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[var(--accent)]" />
                )}

                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  n.type === "critical" ? "bg-red-500/10" : "bg-[var(--accent)]/10"
                }`}>
                  {n.type === "critical" ? (
                    <AlertTriangle size={18} className="text-red-500" />
                  ) : (
                    <Sparkles size={18} className="text-[var(--accent)]" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className={`text-sm font-semibold ${n.type === "critical" ? "text-red-500" : "text-[var(--foreground)]"}`}>
                        {n.title}
                      </h3>
                      <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{formatDate(n.date)}</p>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-[var(--foreground)]/70 leading-relaxed">{n.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    {!n.read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
                      >
                        <CheckCheck size={12} />
                        Marcar como lida
                      </button>
                    )}
                    {n.type === "critical" && (
                      <button
                        onClick={() => handleDismiss(n.id)}
                        className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
                      >
                        <X size={12} />
                        Ignorar
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
