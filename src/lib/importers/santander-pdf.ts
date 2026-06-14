import type { Purchase } from "@/types/finance";

type ImportPurchase = Omit<Purchase, "id" | "createdAt" | "updatedAt">;

type PdfTextItemLike = {
  str: string;
  transform: number[];
  width?: number;
};

type ParsedInvoiceDate = {
  day: number;
  month: number;
  year: number;
  iso: string;
};

export type SantanderPdfImportResult = {
  purchases: ImportPurchase[];
  warnings: string[];
  invoice?: {
    month: number;
    year: number;
    dueDate: string;
  };
};

const dateTokenPattern = /^\d{2}\/\d{2}$/;
const installmentPattern = /^\d{2}\/\d{2}$/;
const leadTokenPattern = /^\d{1,2}$/;
const moneyTokenPattern = /^-?(?:R\$)?\d{1,3}(?:\.\d{3})*,\d{2}$/;
const fullDatePattern = /\b(\d{2})\/(\d{2})\/(\d{4})\b/;

const toIsoDate = (year: number, month: number, day: number) => {
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) return "";
  return date.toISOString().slice(0, 10);
};

const parseMoney = (raw: string) => {
  const cleaned = raw.replace(/R\$/i, "").replace(/\./g, "").replace(",", ".");
  return Number(cleaned.replace(/[^\d.-]/g, ""));
};

const isPdfTextItem = (item: unknown): item is PdfTextItemLike => {
  const candidate = item as Partial<PdfTextItemLike>;
  return (
    typeof candidate.str === "string" &&
    Array.isArray(candidate.transform) &&
    typeof candidate.transform[4] === "number" &&
    typeof candidate.transform[5] === "number"
  );
};

export const buildPdfTextLines = (items: readonly unknown[]) => {
  const lines: Array<{ y: number; parts: Array<{ x: number; width: number; str: string }> }> = [];

  items.filter(isPdfTextItem).forEach((item) => {
    if (!item.str.trim()) return;
    const x = item.transform[4];
    const y = item.transform[5];
    const line = lines.find((entry) => Math.abs(entry.y - y) < 3);
    const target = line ?? { y, parts: [] };
    if (!line) lines.push(target);
    target.parts.push({ x, width: item.width ?? 0, str: item.str });
  });

  return lines
    .sort((a, b) => b.y - a.y)
    .map((line) => {
      let text = "";
      let lastEnd: number | undefined;
      line.parts
        .sort((a, b) => a.x - b.x)
        .forEach((part) => {
          if (lastEnd !== undefined && part.x - lastEnd > 2.5) text += " ";
          text += part.str;
          lastEnd = part.x + part.width;
        });
      return text.replace(/\s+/g, " ").trim();
    })
    .filter(Boolean);
};

const parseInvoiceDueDate = (lines: string[]): ParsedInvoiceDate | undefined => {
  const match = lines.join("\n").match(fullDatePattern);
  if (!match) return undefined;

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const iso = toIsoDate(year, month, day);
  return iso ? { day, month, year, iso } : undefined;
};

const inferPurchaseDate = (dateText: string, invoice: ParsedInvoiceDate) => {
  const [dayText, monthText] = dateText.split("/");
  const day = Number(dayText);
  const month = Number(monthText);
  const year = month > invoice.month ? invoice.year - 1 : invoice.year;
  return toIsoDate(year, month, day);
};

const shouldSkipDescription = (description: string) => {
  const normalized = description.toUpperCase();
  return (
    normalized.length < 2 ||
    normalized.includes("VALORTOTAL") ||
    normalized.includes("COTACAODOLAR") ||
    normalized.includes("COTAÇÃODOLAR") ||
    normalized.includes("IOFDESPESA") ||
    normalized.includes("SALDOANTERIOR")
  );
};

const parseTransactionSegment = (
  segment: string[],
  invoice: ParsedInvoiceDate,
  cardId: string,
  categoryId: string,
  sourceFileName: string,
): ImportPurchase | undefined => {
  const dateText = segment[0];
  const firstMoneyIndex = segment.findIndex((token) => moneyTokenPattern.test(token));
  if (!dateTokenPattern.test(dateText) || firstMoneyIndex <= 1) return undefined;

  const amount = parseMoney(segment[firstMoneyIndex]);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;

  const maybeInstallment = segment[firstMoneyIndex - 1];
  const hasInstallment = installmentPattern.test(maybeInstallment);
  const description = segment.slice(1, hasInstallment ? firstMoneyIndex - 1 : firstMoneyIndex).join(" ").trim();
  if (shouldSkipDescription(description)) return undefined;

  const purchaseDate = inferPurchaseDate(dateText, invoice);
  if (!purchaseDate) return undefined;

  const installmentLabel = hasInstallment ? `Parcela ${maybeInstallment}` : "Importado PDF";

  return {
    description,
    totalAmount: amount,
    purchaseDate,
    cardId,
    categoryId,
    type: "single",
    installments: 1,
    notes: `Importado de ${sourceFileName}. Data original no PDF: ${dateText}.`,
    status: "active",
    importedInvoiceMonth: invoice.month,
    importedInvoiceYear: invoice.year,
    importedSource: "santander-pdf",
    importedInstallmentLabel: installmentLabel,
  };
};

const parseLineTransactions = (
  line: string,
  invoice: ParsedInvoiceDate,
  cardId: string,
  categoryId: string,
  sourceFileName: string,
) => {
  const tokens = line.split(/\s+/).filter(Boolean);
  const dateIndexes = tokens
    .map((token, index) => (dateTokenPattern.test(token) && !moneyTokenPattern.test(tokens[index + 1] ?? "") ? index : -1))
    .filter((index) => index >= 0);

  return dateIndexes.flatMap((dateIndex, index) => {
    const nextDateIndex = dateIndexes[index + 1] ?? tokens.length;
    const endIndex = nextDateIndex < tokens.length && leadTokenPattern.test(tokens[nextDateIndex - 1])
      ? nextDateIndex - 1
      : nextDateIndex;
    const segment = tokens.slice(dateIndex, endIndex);
    const purchase = parseTransactionSegment(segment, invoice, cardId, categoryId, sourceFileName);
    return purchase ? [purchase] : [];
  });
};

const parseInvoiceOnlyCharges = (
  line: string,
  invoice: ParsedInvoiceDate,
  cardId: string,
  categoryId: string,
  sourceFileName: string,
) => {
  const normalized = line.replace(/\s+/g, "").toUpperCase();
  if (!normalized.includes("IOFDESPESANOEXTERIOR")) return [];

  const amountToken = line.split(/\s+/).find((token) => moneyTokenPattern.test(token));
  if (!amountToken) return [];
  const amount = parseMoney(amountToken);
  if (!Number.isFinite(amount) || amount <= 0) return [];

  return [
    {
      description: "IOF DESPESA NO EXTERIOR",
      totalAmount: amount,
      purchaseDate: invoice.iso,
      cardId,
      categoryId,
      type: "single" as const,
      installments: 1,
      notes: `Importado de ${sourceFileName}. Lançamento sem data detalhada no PDF.`,
      status: "active" as const,
      importedInvoiceMonth: invoice.month,
      importedInvoiceYear: invoice.year,
      importedSource: "santander-pdf",
      importedInstallmentLabel: "Importado PDF",
    },
  ];
};

export const parseSantanderInvoiceLines = (
  lines: string[],
  options: {
    cardId: string;
    categoryId: string;
    sourceFileName: string;
  },
): SantanderPdfImportResult => {
  const warnings: string[] = [];
  const invoice = parseInvoiceDueDate(lines);
  if (!invoice) {
    return {
      purchases: [],
      warnings: ["Não foi possível identificar a data de vencimento da fatura no PDF."],
    };
  }

  const purchases = lines.flatMap((line) => [
    ...parseLineTransactions(line, invoice, options.cardId, options.categoryId, options.sourceFileName),
    ...parseInvoiceOnlyCharges(line, invoice, options.cardId, options.categoryId, options.sourceFileName),
  ]);

  if (!purchases.length) warnings.push("Nenhuma compra foi identificada no PDF.");

  return {
    purchases,
    warnings,
    invoice: {
      month: invoice.month,
      year: invoice.year,
      dueDate: invoice.iso,
    },
  };
};

export const parseSantanderInvoicePdf = async (
  file: File,
  options: {
    cardId: string;
    categoryId: string;
  },
): Promise<SantanderPdfImportResult> => {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  }
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  }).promise;
  const lines: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    lines.push(...buildPdfTextLines(textContent.items));
  }

  return parseSantanderInvoiceLines(lines, {
    ...options,
    sourceFileName: file.name,
  });
};
