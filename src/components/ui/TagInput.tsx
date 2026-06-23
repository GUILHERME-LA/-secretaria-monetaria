"use client";

import { useState, useRef, useEffect } from "react";
import type { Tag } from "@/lib/types";
import { X, Plus, Tag as TagIcon } from "lucide-react";

type Props = {
  value: string[];
  onChange: (tagIds: string[]) => void;
};

export function TagInput({ value, onChange }: Props) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "listar_tags", payload: {} }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setTags(res.data);
      });
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedTags = tags.filter((t) => value.includes(t.id));

  const filtered = tags.filter(
    (t) =>
      !value.includes(t.id) &&
      t.nome.toLowerCase().includes(query.toLowerCase())
  );

  async function createAndSelect(nome: string) {
    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "criar_tag",
        payload: { nome: nome.trim(), cor: "#6366f1" },
      }),
    });
    const json = await res.json();
    if (json.data?.id) {
      const newTag: Tag = { id: json.data.id, nome: nome.trim(), cor: "#6366f1" };
      setTags((prev) => [...prev, newTag]);
      onChange([...value, newTag.id]);
    }
    setQuery("");
  }

  return (
    <div ref={ref} className="relative">
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
        Tags
      </label>
      <div
        className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 cursor-text transition-colors focus-within:border-[var(--accent)]"
        onClick={() => {
          const input = ref.current?.querySelector("input");
          input?.focus();
          setOpen(true);
        }}
      >
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: `${tag.cor}20`, color: tag.cor }}
          >
            {tag.nome}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(value.filter((id) => id !== tag.id));
              }}
              className="cursor-pointer rounded-sm opacity-60 hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          type="text"
          placeholder={value.length === 0 ? "Adicionar tags..." : ""}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim()) {
              e.preventDefault();
              const match = filtered.find(
                (t) => t.nome.toLowerCase() === query.trim().toLowerCase()
              );
              if (match) {
                onChange([...value, match.id]);
                setQuery("");
              } else {
                createAndSelect(query);
              }
            }
            if (e.key === "Backspace" && !query && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          className="min-w-[120px] flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none"
        />
      </div>

      {open && query && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] p-1 shadow-lg">
          {filtered.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => {
                onChange([...value, tag.id]);
                setQuery("");
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              <TagIcon size={14} style={{ color: tag.cor }} />
              {tag.nome}
            </button>
          ))}
          {query.trim() && !filtered.some((t) => t.nome.toLowerCase() === query.trim().toLowerCase()) && (
            <button
              type="button"
              onClick={() => createAndSelect(query)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--accent)] hover:bg-[var(--muted)] transition-colors"
            >
              <Plus size={14} />
              Criar &ldquo;{query.trim()}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
