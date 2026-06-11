import { formatISO, isValid, parse as parseDate } from "date-fns";
import type { Category, CreditCard, Purchase } from "@/types/finance";

type ParsedRow = Record<string, string>;

export type InvoiceCsvImportResult = {
  purchases: Array<Omit<Purchase, "id" | "createdAt" | "updatedAt">>;
  warnings: string[];
};

const aliases = {
  description: ["descricao", "descrição", "description", "lancamento", "lançamento", "estabelecimento", "merchant"],
  amount: ["valor", "amount", "total", "preco", "preço"],
  date: ["data", "date", "data da compra", "purchase_date", "purchase date"],
  card: ["cartao", "cartão", "card", "cartao final", "final"],
  category: ["categoria", "category"],
  installments: ["parcelas", "installments", "parcela"],
  notes: ["observacao", "observação", "notes", "memo"],
};

const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const detectDelimiter = (text: string) => {
  const firstLine = text.split(/\r?\n/).find(Boolean) ?? "";
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semicolons >= commas ? ";" : ",";
};

const splitCsvLine = (line: string, delimiter: string) => {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
};

const parseRows = (text: string): ParsedRow[] => {
  const delimiter = detectDelimiter(text);
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0], delimiter).map(normalize);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
};

const readAlias = (row: ParsedRow, keys: string[]) => {
  for (const key of keys.map(normalize)) {
    if (row[key]) return row[key];
  }
  return "";
};

const parseAmount = (raw: string) => {
  const cleaned = raw.replace(/\s/g, "").replace(/R\$/i, "");
  const decimalComma = cleaned.includes(",");
  const normalized = decimalComma ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned.replace(/,/g, "");
  return Number(normalized.replace(/[^\d.-]/g, ""));
};

const parsePurchaseDate = (raw: string) => {
  const trimmed = raw.trim();
  const formats = ["dd/MM/yyyy", "d/M/yyyy", "yyyy-MM-dd", "dd-MM-yyyy", "MM/dd/yyyy"];
  for (const dateFormat of formats) {
    const parsed = parseDate(trimmed, dateFormat, new Date());
    if (isValid(parsed)) return formatISO(parsed, { representation: "date" });
  }
  const fallback = new Date(trimmed);
  return isValid(fallback) ? formatISO(fallback, { representation: "date" }) : "";
};

const findCard = (cards: CreditCard[], raw: string) => {
  const needle = normalize(raw);
  if (!needle) return cards[0];
  return (
    cards.find((card) => normalize(card.name) === needle) ??
    cards.find((card) => normalize(card.issuer) === needle) ??
    cards.find((card) => card.lastDigits && needle.includes(card.lastDigits)) ??
    cards[0]
  );
};

const findCategory = (categories: Category[], raw: string) => {
  const needle = normalize(raw);
  return categories.find((category) => normalize(category.name) === needle) ?? categories.find((category) => normalize(category.name) === "outros") ?? categories[0];
};

export const parseInvoiceCsv = (
  text: string,
  cards: CreditCard[],
  categories: Category[],
): InvoiceCsvImportResult => {
  const warnings: string[] = [];
  if (!cards.length) return { purchases: [], warnings: ["Cadastre ao menos um cartão antes de importar CSV."] };
  if (!categories.length) return { purchases: [], warnings: ["Cadastre ao menos uma categoria antes de importar CSV."] };

  const rows = parseRows(text);
  const purchases = rows.flatMap((row, index) => {
    const line = index + 2;
    const description = readAlias(row, aliases.description);
    const amount = parseAmount(readAlias(row, aliases.amount));
    const purchaseDate = parsePurchaseDate(readAlias(row, aliases.date));
    const card = findCard(cards, readAlias(row, aliases.card));
    const category = findCategory(categories, readAlias(row, aliases.category));
    const installments = Math.max(Number(readAlias(row, aliases.installments).replace(/[^\d]/g, "")) || 1, 1);

    if (!description || !Number.isFinite(amount) || amount <= 0 || !purchaseDate || !card || !category) {
      warnings.push(`Linha ${line} ignorada: descrição, valor, data, cartão ou categoria inválidos.`);
      return [];
    }

    return [
      {
        description,
        totalAmount: amount,
        purchaseDate,
        cardId: card.id,
        categoryId: category.id,
        type: installments > 1 ? ("installment" as const) : ("single" as const),
        installments,
        notes: readAlias(row, aliases.notes),
        status: "active" as const,
      },
    ];
  });

  return { purchases, warnings };
};
