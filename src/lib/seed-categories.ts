const CATEGORIAS_PADRAO = [
  { nome: "Salário",       tipo: "receita",  cor: "#22c55e" },
  { nome: "Freela / Extra",tipo: "receita",  cor: "#16a34a" },
  { nome: "Investimentos", tipo: "receita",  cor: "#15803d" },
  { nome: "Alimentação",   tipo: "despesa",  cor: "#ef4444" },
  { nome: "Transporte",    tipo: "despesa",  cor: "#f97316" },
  { nome: "Moradia",       tipo: "despesa",  cor: "#eab308" },
  { nome: "Lazer",         tipo: "despesa",  cor: "#8b5cf6" },
  { nome: "Saúde",         tipo: "despesa",  cor: "#ec4899" },
  { nome: "Educação",      tipo: "despesa",  cor: "#06b6d4" },
  { nome: "Assinaturas",   tipo: "despesa",  cor: "#6366f1" },
];

export async function seedDefaultCategories() {
  const resCount = await fetch("/api/db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "contar_categorias", payload: {} }),
  });
  const { data: countData } = await resCount.json();
  if (!countData || countData.total > 0) return;

  for (const cat of CATEGORIAS_PADRAO) {
    await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "inserir_categoria", payload: { nome: cat.nome, tipo: cat.tipo, cor: cat.cor } }),
    });
  }
}
