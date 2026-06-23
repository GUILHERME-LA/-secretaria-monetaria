const STORAGE_KEY = "secmon_whatsnew_version";

export type ChangeType = "feature" | "improvement" | "fix";

export type WhatsNewChange = {
  type: ChangeType;
  description: string;
};

export type WhatsNewVersion = {
  version: string;
  date: string;
  changes: WhatsNewChange[];
};

export const APP_VERSION = "2.0.0";

export const WHATS_NEW: WhatsNewVersion[] = [
  {
    version: "2.0.0",
    date: "2026-06-23",
    changes: [
      { type: "feature", description: "Tags: organize transações com etiquetas coloridas personalizadas" },
      { type: "feature", description: "Split Transactions: divida uma transação em múltiplas categorias" },
      { type: "feature", description: "Ações em Massa: selecione várias transações para confirmar ou excluir de uma vez" },
      { type: "improvement", description: "Notificações Toast com opção 'Desfazer' para ações críticas" },
      { type: "improvement", description: "Checkbox redesenhado com visual premium para dark/light mode" },
      { type: "improvement", description: "Filtro por tags na lista de transações" },
    ],
  },
];

export function getLastSeenVersion(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setLastSeenVersion(version: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, version);
  } catch {
    // localStorage may be unavailable
  }
}

export function shouldShowWhatsNew(): boolean {
  return getLastSeenVersion() !== APP_VERSION;
}
