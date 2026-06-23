"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel } from "@/lib/utils";
import { CustomSelect } from "./ui/CustomSelect";

type Props = {
  months: string[];
  value: string;
  onChange: (month: string) => void;
};

export function MonthSelector({ months, value, onChange }: Props) {
  const idx = months.indexOf(value);
  const temAnterior = idx > 0;
  const temProximo = idx < months.length - 1;

  function prev() {
    if (temAnterior) onChange(months[idx - 1]);
  }

  function next() {
    if (temProximo) onChange(months[idx + 1]);
  }

  if (months.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={prev}
        disabled={!temAnterior}
        className="cursor-pointer rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={18} />
      </button>

      <CustomSelect
        value={value}
        onChange={onChange}
        options={months.map((m) => ({ value: m, label: monthLabel(m) }))}
        className="w-[170px] sm:w-auto"
      />

      <button
        onClick={next}
        disabled={!temProximo}
        className="cursor-pointer rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
