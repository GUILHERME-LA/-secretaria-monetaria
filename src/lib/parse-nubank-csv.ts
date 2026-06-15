export interface ParsedTransaction {
  date: string;
  descricao: string;
  valor: number;
  tipo: "receita" | "despesa";
  categoria_nubank?: string;
  identificador?: string;
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/R\$\s*/g, "").trim();
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  if (hasComma && hasDot) {
    return parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
  }
  if (hasComma && !hasDot) {
    return parseFloat(cleaned.replace(",", "."));
  }
  if (hasDot && !hasComma) {
    const parts = cleaned.split(".");
    const last = parts[parts.length - 1];
    return parseFloat(last.length <= 2 ? cleaned : cleaned.replace(/\./g, ""));
  }
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

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseNubankCsv(content: string): ParsedTransaction[] {
  let text = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headerLine = lines[0].toLowerCase().replace(/"/g, "").trim();
  const delimiter = headerLine.includes(";") ? ";" : ",";
  const cols = headerLine.split(delimiter).map((c) => c.trim());

  const dateCol = cols.findIndex((c) => c === "date" || c === "data");
  const titleCol = cols.findIndex((c) =>
    c === "title" || c === "titulo" || c === "título" ||
    c === "estabelecimento" || c === "descrição" || c === "descricao" ||
    c === "description"
  );
  const amountCol = cols.findIndex((c) => c === "amount" || c === "valor");
  const categoryCol = cols.findIndex((c) => c === "category" || c === "categoria");
  const idCol = cols.findIndex((c) => c === "identificador" || c === "identifier" || c === "id");

  if (dateCol === -1 || titleCol === -1 || amountCol === -1) return [];

  const titleIsLast = titleCol === cols.length - 1;
  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cells = splitCsvLine(line, delimiter);

    let rawDate: string | undefined;
    let descricao: string | undefined;
    let rawAmount: string | undefined;
    let categoria: string | undefined;
    let identificador: string | undefined;

    rawDate = cells[dateCol];
    rawAmount = cells[amountCol];
    if (categoryCol >= 0) categoria = cells[categoryCol];
    if (idCol >= 0) identificador = cells[idCol];

    if (titleIsLast) {
      descricao = cells.slice(titleCol).join(delimiter);
    } else {
      descricao = cells[titleCol];
    }

    if (!rawDate || !descricao || !rawAmount) continue;

    const valor = parseAmount(rawAmount);
    if (isNaN(valor)) continue;

    transactions.push({
      date: normalizeDate(rawDate),
      descricao,
      valor: Math.abs(valor),
      tipo: valor < 0 ? "despesa" : "receita",
      categoria_nubank: categoria || undefined,
      identificador: identificador || undefined,
    });
  }

  return transactions;
}
