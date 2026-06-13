"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel, getLast6Months } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (month: string) => void;
};

export function MonthSelector({ value, onChange }: Props) {
  const meses = getLast6Months(value);

  function prev() {
    const [ano, mes] = value.split("-").map(Number);
    const d = new Date(ano, mes - 2, 1);
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  function next() {
    const [ano, mes] = value.split("-").map(Number);
    const d = new Date(ano, mes, 1);
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={prev}
        className="cursor-pointer rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
      >
        <ChevronLeft size={18} />
      </button>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--foreground)] outline-none max-w-[170px] sm:max-w-none truncate"
      >
        {meses.map((m) => (
          <option key={m} value={m}>
            {monthLabel(m)}
          </option>
        ))}
      </select>

      <button
        onClick={next}
        className="cursor-pointer rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
