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

export function parseNubankCsv(content: string): ParsedTransaction[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase().replace(/"/g, "").trim();
  const cols = header.split(",").map((c) => c.trim());

  const isFatura =
    cols.includes("date") &&
    cols.includes("title") &&
    cols.includes("amount");

  const isExtrato =
    cols.includes("date") &&
    (cols.includes("description") || cols.includes("descricao")) &&
    cols.includes("amount");

  if (!isFatura && !isExtrato) return [];

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cells = line.match(/(".*?"|[^,]+)/g) || [];
    const clean = cells.map((c) => c.replace(/"/g, "").trim());

    if (isFatura) {
      const dateIdx = cols.indexOf("date");
      const titleIdx = cols.indexOf("title");
      const amountIdx = cols.indexOf("amount");
      const categoryIdx = cols.indexOf("category");

      const rawDate = clean[dateIdx];
      const descricao = clean[titleIdx];
      const rawAmount = clean[amountIdx];
      const categoria = categoryIdx >= 0 ? clean[categoryIdx] : undefined;

      if (!rawDate || !descricao || !rawAmount) continue;

      const valor = parseAmount(rawAmount);
      if (isNaN(valor)) continue;

      let dateStr = rawDate;
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        dateStr = rawDate;
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
        const [d, m, y] = rawDate.split("/");
        dateStr = `${y}-${m}-${d}`;
      }

      transactions.push({
        date: dateStr,
        descricao,
        valor: Math.abs(valor),
        tipo: valor < 0 ? "despesa" : "receita",
        categoria_nubank: categoria || undefined,
      });
    } else {
      const dateIdx = cols.indexOf("date");
      const descIdx = cols.indexOf("description") !== -1
        ? cols.indexOf("description")
        : cols.indexOf("descricao");
      const amountIdx = cols.indexOf("amount");

      const rawDate = clean[dateIdx];
      const descricao = clean[descIdx];
      const rawAmount = clean[amountIdx];

      if (!rawDate || !descricao || !rawAmount) continue;

      const valor = parseAmount(rawAmount);
      if (isNaN(valor)) continue;

      let dateStr = rawDate;
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        dateStr = rawDate;
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
        const [d, m, y] = rawDate.split("/");
        dateStr = `${y}-${m}-${d}`;
      }

      transactions.push({
        date: dateStr,
        descricao,
        valor: Math.abs(valor),
        tipo: valor < 0 ? "despesa" : "receita",
      });
    }
  }

  return transactions;
}
