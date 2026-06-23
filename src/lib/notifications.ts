import { WHATS_NEW, APP_VERSION } from "./whats-new";
import { getCurrentMonth, getMonthBounds } from "./utils";

const STORAGE_KEY = "secmon_notifications";

export type NotificacaoType = "update" | "critical";

export type Notificacao = {
  id: string;
  type: NotificacaoType;
  icon: string;
  title: string;
  description: string;
  date: string;
  read: boolean;
  dismissed: boolean;
};

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function getStored(): Notificacao[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(ns: Notificacao[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ns));
  } catch {
    // localStorage may be unavailable
  }
}

function updateUnreadCount() {
  const stored = getStored();
  const count = stored.filter((n) => !n.read && !n.dismissed).length;
  try {
    localStorage.setItem("secmon_notifications_unread", String(count));
  } catch {}
}

export function getNotifications(): Notificacao[] {
  return getStored();
}

export function getUnreadCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(localStorage.getItem("secmon_notifications_unread")) || 0;
  } catch {
    return 0;
  }
}

export function markAsRead(id: string) {
  const ns = getStored();
  const idx = ns.findIndex((n) => n.id === id);
  if (idx === -1) return;
  ns[idx].read = true;
  save(ns);
  updateUnreadCount();
}

export function markAllAsRead() {
  const ns = getStored();
  ns.forEach((n) => { n.read = true; });
  save(ns);
  updateUnreadCount();
}

export function dismissNotification(id: string) {
  const ns = getStored();
  const idx = ns.findIndex((n) => n.id === id);
  if (idx === -1) return;
  ns[idx].dismissed = true;
  ns[idx].read = true;
  save(ns);
  updateUnreadCount();
}

export function hasCriticalAlerts(): boolean {
  return getStored().some((n) => n.type === "critical" && !n.dismissed);
}

type FetchFn = (url: string, body: unknown) => Promise<any>;

let generatePromise: Promise<Notificacao[]> | null = null;

export async function generateNotifications(fetchFn: FetchFn): Promise<Notificacao[]> {
  if (generatePromise) return generatePromise;
  generatePromise = _generateNotifications(fetchFn);
  return generatePromise.finally(() => { generatePromise = null; });
}

async function _generateNotifications(fetchFn: FetchFn): Promise<Notificacao[]> {
  const stored = getStored();
  const result: Notificacao[] = [];
  const hoje = getCurrentMonth();

  // --- Update notifications (from WHATS_NEW config) ---
  for (const vn of WHATS_NEW) {
    const existing = stored.find((n) => n.id === `update-${vn.version}`);
    result.push({
      id: `update-${vn.version}`,
      type: "update",
      icon: "✦",
      title: `v${vn.version}`,
      description: vn.changes.map((c) => c.description).join(" · "),
      date: vn.date,
      read: existing?.read ?? vn.version === APP_VERSION ? false : true,
      dismissed: existing?.dismissed ?? false,
    });
  }

  // --- Critical financial alerts ---
  try {
    // Fetch current month data
    const { inicio, fim } = getMonthBounds(hoje);
    const resTotais = await fetchFn("/api/db", {
      action: "listar_totais_mes",
      payload: { inicio, fim },
    });
    const totais: { tipo: string; valor: number; status: string }[] = resTotais.data || [];

    const receitas = totais.filter((t) => t.tipo === "receita").reduce((s, t) => s + Number(t.valor), 0);
    const despesas = totais.filter((t) => t.tipo === "despesa" && t.status === "confirmada").reduce((s, t) => s + Number(t.valor), 0);

    // Rule 1: Margem crítica (despesas > 95% receitas)
    if (receitas > 0 && despesas / receitas > 0.95) {
      const pct = Math.round((despesas / receitas) * 100);
      const existing = stored.find((n) => n.id === "critical-margem");
      if (!existing?.dismissed) {
        result.push({
          id: "critical-margem",
          type: "critical",
          icon: "⚠️",
          title: "Margem crítica",
          description: `${pct}% da sua receita está comprometida com despesas este mês.`,
          date: hoje,
          read: false,
          dismissed: false,
        });
      }
    }

    // Rule 2: Sequência negativa (3+ meses consecutivos no vermelho)
    const lastMonths = getLastNMonths(hoje, 3);
    let negCount = 0;
    for (const m of lastMonths) {
      const { inicio: mi, fim: mf } = getMonthBounds(m);
      const resM = await fetchFn("/api/db", {
        action: "listar_totais_mes",
        payload: { inicio: mi, fim: mf },
      });
      const dados: { tipo: string; valor: number }[] = resM.data || [];
      const recM = dados.filter((t) => t.tipo === "receita").reduce((s, t) => s + Number(t.valor), 0);
      const despM = dados.filter((t) => t.tipo === "despesa").reduce((s, t) => s + Number(t.valor), 0);
      if (despM > recM) negCount++;
    }
    if (negCount >= 3) {
      const existing = stored.find((n) => n.id === "critical-sequencia");
      if (!existing?.dismissed) {
        result.push({
          id: "critical-sequencia",
          type: "critical",
          icon: "⚠️",
          title: "Sequência negativa",
          description: `${negCount} meses consecutivos com saldo negativo. Revise seus gastos urgentemente.`,
          date: hoje,
          read: false,
          dismissed: false,
        });
      }
    }

    // Rule 3: Gasto concentrado (1 categoria > 70% das despesas)
    const resTrans = await fetchFn("/api/db", {
      action: "listar_transacoes_mes",
      payload: { inicio, fim },
    });
    const transacoes: { tipo: string; valor: number; status: string; categoria_nome?: string }[] = resTrans.data || [];
    const despConfirmadas = transacoes.filter((t) => t.tipo === "despesa" && t.status === "confirmada");
    const totalDesp = despConfirmadas.reduce((s, t) => s + Number(t.valor), 0);
    if (totalDesp > 0) {
      const agg: Record<string, number> = {};
      despConfirmadas.forEach((t) => {
        const key = t.categoria_nome || "Sem categoria";
        agg[key] = (agg[key] || 0) + Number(t.valor);
      });
      const maxCat = Object.entries(agg).sort((a, b) => b[1] - a[1])[0];
      if (maxCat) {
        const pct = Math.round((maxCat[1] / totalDesp) * 100);
        if (pct > 70) {
          const existing = stored.find((n) => n.id === "critical-concentrado");
          if (!existing?.dismissed) {
            result.push({
              id: "critical-concentrado",
              type: "critical",
              icon: "⚠️",
              title: "Gasto concentrado",
              description: `"${maxCat[0]}" representa ${pct}% dos seus gastos — dependência crítica nesta categoria.`,
              date: hoje,
              read: false,
              dismissed: false,
            });
          }
        }
      }
    }

    // Rule 4: Saldo negativo severo (saldo < -2x receita média)
    const avgMonths = getLastNMonths(hoje, 3);
    let totalRec = receitas;
    let countRec = receitas > 0 ? 1 : 0;
    for (const m of avgMonths) {
      const { inicio: mi, fim: mf } = getMonthBounds(m);
      const resM = await fetchFn("/api/db", {
        action: "listar_totais_mes",
        payload: { inicio: mi, fim: mf },
      });
      const dados: { tipo: string; valor: number }[] = resM.data || [];
      const recM = dados.filter((t) => t.tipo === "receita").reduce((s, t) => s + Number(t.valor), 0);
      if (recM > 0) { totalRec += recM; countRec++; }
    }
    const mediaReceita = countRec > 0 ? totalRec / countRec : 0;
    const saldo = receitas - despesas;
    if (mediaReceita > 0 && saldo < 0 && Math.abs(saldo) > mediaReceita * 2) {
      const existing = stored.find((n) => n.id === "critical-saldo");
      if (!existing?.dismissed) {
        result.push({
          id: "critical-saldo",
          type: "critical",
          icon: "⚠️",
          title: "Déficit severo",
          description: `Seu saldo negativo (R$ ${Math.abs(saldo).toFixed(2)}) é mais que o dobro da sua receita média mensal.`,
          date: hoje,
          read: false,
          dismissed: false,
        });
      }
    }
  } catch {
    // If API fails (offline, etc.), keep existing stored critical alerts
    const criticals = stored.filter((n) => n.type === "critical" && !n.dismissed);
    result.push(...criticals);
  }

  // Merge read/dismissed state for matching IDs
  const merged = result.map((n) => {
    const prev = stored.find((s) => s.id === n.id);
    if (prev) {
      return { ...n, read: prev.read, dismissed: prev.dismissed };
    }
    return n;
  });

  save(merged);
  updateUnreadCount();
  return merged;
}

function getLastNMonths(from: string, n: number): string[] {
  const [y, m] = from.split("-").map(Number);
  const months: string[] = [];
  for (let i = 1; i <= n; i++) {
    let py = y, pm = m - i;
    while (pm < 1) { pm += 12; py--; }
    months.push(`${py}-${String(pm).padStart(2, "0")}`);
  }
  return months;
}
