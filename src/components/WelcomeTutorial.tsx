"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Sparkles, ListTodo, Repeat, MessageCircle } from "lucide-react";

const STORAGE_KEY = "secretaria_tutorial_visto";

const slides = [
  {
    target: "#tour-header",
    icon: <Sparkles size={24} style={{ color: "var(--accent)" }} />,
    title: "Bem-vindo à Secretaria Monetária",
    desc: "Controle suas finanças de forma simples. Acompanhe receitas, despesas e planeje o futuro com inteligência.",
  },
  {
    target: "#tour-nova-transacao",
    icon: <ListTodo size={24} className="text-green-500" />,
    title: "Transações",
    desc: "Clique aqui para adicionar gastos ou receitas. Você também pode editar, excluir e organizar por categoria.",
  },
  {
    target: "#tour-recorrentes",
    icon: <Repeat size={24} className="text-yellow-500" />,
    title: "Recorrentes + Previsto",
    desc: "Cadastre contas que se repetem todo mês. Elas aparecem automaticamente como 'Previsto' — é só confirmar quando pagar.",
  },
  {
    target: "#tour-chat",
    icon: <MessageCircle size={24} style={{ color: "var(--accent)" }} />,
    title: "Chat IA + Filtro",
    desc: "Use o chat para adicionar transações rapidamente. O toggle 'Mostrar previstos' controla se valores futuros aparecem nos gráficos.",
  },
];

export function WelcomeTutorial() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const [pos, setPos] = useState({ top: 0, left: 0, showBelow: true });

  useEffect(() => {
    const visto = localStorage.getItem(STORAGE_KEY);
    if (!visto) setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const step = slides[slide];
    const el = document.querySelector(step.target);
    const tooltip = document.querySelector(".tour-tooltip");
    if (!el || !tooltip) return;

    const elRect = el.getBoundingClientRect();
    const tooltipW = tooltip.clientWidth;
    const tooltipH = tooltip.clientHeight;

    let left = elRect.left + elRect.width / 2 - tooltipW / 2;
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipW - 16));

    const spaceBelow = window.innerHeight - elRect.bottom;
    const below = spaceBelow >= tooltipH + 20;

    setPos({
      top: below ? elRect.bottom + 12 : Math.max(8, elRect.top - tooltipH - 12),
      left,
      showBelow: below,
    });
  }, [open, slide]);

  useEffect(() => {
    if (!open) return;
    document.querySelector(slides[slide]?.target)?.classList.add("tutorial-highlight");
    const el = document.querySelector(slides[slide]?.target);
    return () => el?.classList.remove("tutorial-highlight");
  }, [open, slide]);

  function finish() {
    slides.forEach((s) => document.querySelector(s.target)?.classList.remove("tutorial-highlight"));
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  function goTo(idx: number) {
    document.querySelector(slides[slide]?.target)?.classList.remove("tutorial-highlight");
    setSlide(idx);
  }

  if (!open) return null;

  const step = slides[slide];
  const isLast = slide === slides.length - 1;
  const isFirst = slide === 0;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={finish} />

      <div
        className="tour-tooltip fixed z-60 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl"
        style={{ top: pos.top, left: pos.left }}
      >
        <div
          className={`absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-[var(--border)] bg-[var(--card)] ${
            pos.showBelow ? "-top-1.5" : "-bottom-1.5"
          }`}
        />

        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--muted)]">
            {step.icon}
          </div>
          <h3 className="text-base font-bold text-[var(--foreground)]">{step.title}</h3>
          <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{step.desc}</p>
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === slide ? "w-6 bg-[var(--accent)]" : "w-1.5 bg-[var(--muted-foreground)]/30"}`} />
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button onClick={finish} className="cursor-pointer rounded-lg px-2 py-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">Pular</button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button onClick={() => goTo(slide - 1)} className="flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
                <ChevronLeft size={16} /> Anterior
              </button>
            )}
            {!isLast ? (
              <button onClick={() => goTo(slide + 1)} className="flex cursor-pointer items-center gap-1 rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 transition-opacity">
                Próximo <ChevronRight size={16} />
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => { finish(); router.push("/ajuda"); }} className="cursor-pointer rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors">Ajuda</button>
                <button onClick={finish} className="cursor-pointer rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 transition-opacity">Começar</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .tutorial-highlight {
          outline: 3px solid var(--accent);
          outline-offset: 3px;
          border-radius: 8px;
          animation: tutorial-pulse 2s ease-in-out infinite;
        }
        @keyframes tutorial-pulse {
          0%, 100% { outline-color: var(--accent); }
          50% { outline-color: transparent; }
        }
      `}</style>
    </>
  );
}
