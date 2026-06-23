"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { X, Undo2, CheckCircle, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  message: string;
  type: ToastType;
  undo?: () => void;
  undoLabel?: string;
};

type ToastContext = {
  toast: (t: Omit<Toast, "id">) => void;
};

const Ctx = createContext<ToastContext>({ toast: () => {} });

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = String(++idRef.current);
      setToasts((prev) => [...prev, { ...t, id }]);
      setTimeout(() => remove(id), 5000);
    },
    [remove]
  );

  const iconMap = {
    success: <CheckCircle size={18} className="text-emerald-500" />,
    error: <AlertCircle size={18} className="text-red-500" />,
    info: <Info size={18} className="text-blue-500" />,
  };

  const borderMap = {
    success: "border-l-emerald-500",
    error: "border-l-red-500",
    info: "border-l-blue-500",
  };

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-lg border-l-4 ${borderMap[t.type]} animate-slide-up`}
          >
            <div className="mt-0.5 shrink-0">{iconMap[t.type]}</div>
            <p className="flex-1 text-sm text-[var(--foreground)]">{t.message}</p>
            {t.undo && (
              <button
                onClick={() => { t.undo!(); remove(t.id); }}
                className="flex cursor-pointer items-center gap-1 shrink-0 rounded-md px-2 py-1 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
              >
                <Undo2 size={12} />
                {t.undoLabel || "Desfazer"}
              </button>
            )}
            <button
              onClick={() => remove(t.id)}
              className="shrink-0 cursor-pointer text-slate-400 hover:text-[var(--foreground)] transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <style jsx global>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.25s ease-out; }
      `}</style>
    </Ctx.Provider>
  );
}
