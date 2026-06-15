export interface ParsedTransaction {
  date: string;
  descricao: string;
  valor: number;
  tipo: "receita" | "despesa";
  categoria_nubank?: string;
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", ".").trim();
  return parseFloat(cleaned);
}

function normalizeDate(raw: string): string {
  const d = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
    const [dd, mm, yy] = d.split("/");
    return `${yy}-${mm}-${dd}`;
  }
  return d;
}

export function parseNubankCsv(content: string): ParsedTransaction[] {
  let text = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headerLine = lines[0].toLowerCase().replace(/"/g, "").trim();
  const delimiter = headerLine.includes(";") ? ";" : ",";
  const cols = headerLine.split(delimiter).map((c) => c.trim());

  const dateCol = cols.findIndex((c) => c === "date" || c === "data");
  const titleCol = cols.findIndex((c) => c === "title" || c === "titulo" || c === "título" || c === "estabelecimento" || c === "descrição" || c === "descricao" || c === "description");
  const amountCol = cols.findIndex((c) => c === "amount" || c === "valor");
  const categoryCol = cols.findIndex((c) => c === "category" || c === "categoria");

  if (dateCol === -1 || titleCol === -1 || amountCol === -1) return [];

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cells = line.split(delimiter);
    const clean = cells.map((c) => c.replace(/"/g, "").trim());

    const rawDate = clean[dateCol];
    const descricao = clean[titleCol];
    const rawAmount = clean[amountCol];
    const categoria = categoryCol >= 0 ? clean[categoryCol] : undefined;

    if (!rawDate || !descricao || !rawAmount) continue;

    const valor = parseAmount(rawAmount);
    if (isNaN(valor)) continue;

    transactions.push({
      date: normalizeDate(rawDate),
      descricao,
      valor: Math.abs(valor),
      tipo: valor < 0 ? "despesa" : "receita",
      categoria_nubank: categoria || undefined,
    });
  }

  return transactions;
}
