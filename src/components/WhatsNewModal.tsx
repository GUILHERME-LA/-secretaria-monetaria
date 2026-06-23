"use client";

import { Sparkles, Wand2, Bug, PartyPopper } from "lucide-react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { APP_VERSION, WHATS_NEW, setLastSeenVersion, type ChangeType } from "@/lib/whats-new";

type Props = {
  open: boolean;
  onClose: () => void;
};

const config: Record<ChangeType, { icon: React.ReactNode; label: string; color: string }> = {
  feature: { icon: <Sparkles size={16} />, label: "Novidades", color: "text-blue-500" },
  improvement: { icon: <Wand2 size={16} />, label: "Melhorias", color: "text-violet-500" },
  fix: { icon: <Bug size={16} />, label: "Correções", color: "text-amber-500" },
};

export function WhatsNewModal({ open, onClose }: Props) {
  const versionData = WHATS_NEW.find((v) => v.version === APP_VERSION);
  if (!versionData) return null;

  const grouped = versionData.changes.reduce(
    (acc, c) => {
      if (!acc[c.type]) acc[c.type] = [];
      acc[c.type].push(c.description);
      return acc;
    },
    {} as Record<string, string[]>
  );

  function handleDismiss() {
    setLastSeenVersion(APP_VERSION);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleDismiss} title="">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)]/10">
          <PartyPopper size={28} className="text-[var(--accent)]" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">Novidades da versão</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            v{versionData.version} • {new Date(versionData.date + "T12:00:00").toLocaleDateString("pt-BR")}
          </p>
        </div>

        <div className="w-full space-y-4 text-left">
          {(Object.keys(config) as ChangeType[]).map((type) => {
            const items = grouped[type];
            if (!items?.length) return null;
            const { icon, label, color } = config[type];
            return (
              <div key={type}>
                <h3 className={`mb-2 flex items-center gap-2 text-sm font-semibold ${color}`}>
                  {icon}
                  {label}
                </h3>
                <ul className="space-y-1.5">
                  {items.map((desc, i) => (
                    <li key={i} className="flex items-start gap-2 pl-1 text-sm text-[var(--foreground)]/80">
                      <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                      {desc}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <Button className="mt-2 w-full" onClick={handleDismiss}>
          Entendi!
        </Button>
      </div>
    </Modal>
  );
}
