const CATEGORIAS_PADRAO = [
  { nome: "Salário",       tipo: "receita",  cor: "#6366f1" },
  { nome: "Freela / Extra",tipo: "receita",  cor: "#8b5cf6" },
  { nome: "Investimentos", tipo: "receita",  cor: "#a855f7" },
  { nome: "Alimentação",   tipo: "despesa",  cor: "#f97316" },
  { nome: "Transporte",    tipo: "despesa",  cor: "#06b6d4" },
  { nome: "Moradia",       tipo: "despesa",  cor: "#eab308" },
  { nome: "Lazer",         tipo: "despesa",  cor: "#ec4899" },
  { nome: "Saúde",         tipo: "despesa",  cor: "#14b8a6" },
  { nome: "Educação",      tipo: "despesa",  cor: "#3b82f6" },
  { nome: "Assinaturas",   tipo: "despesa",  cor: "#d946ef" },
  { nome: "Outros",        tipo: "despesa",  cor: "#78716c" },
  { nome: "Outros",        tipo: "receita",  cor: "#78716c" },
];

export async function seedDefaultCategories() {
  for (const cat of CATEGORIAS_PADRAO) {
    await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seed_categoria", payload: { nome: cat.nome, tipo: cat.tipo, cor: cat.cor } }),
    });
  }
}
