import { describe, expect, it } from "vitest";
import { parseSantanderInvoiceLines } from "@/lib/importers/santander-pdf";

describe("parseSantanderInvoiceLines", () => {
  it("imports Santander PDF invoice lines into the selected card and invoice month", () => {
    const result = parseSantanderInvoiceLines(
      [
        "R$13.229,92 09/05/2026 R$43.510,00",
        "3 10/04 MP*CURTOCAFE 5,00 3 05/04 POSTOEXCLUSIVO 150,00",
        "1 10/01 LISTO *BNVEICULOS 04/06 2.736,83",
        "24/04 OPENAI*CHATGPTSUBSCR 105,02 20,00",
        "IOFDESPESANOEXTERIOR 3,68",
        "09/04 DEB AUTOM DEFATURAEMC/ -7.226,21",
        "VALORTOTAL 2.826,65 0,00",
      ],
      {
        cardId: "card-santander",
        categoryId: "cat-outros",
        sourceFileName: "FaturaSantanderMaio.pdf",
      },
    );

    expect(result.warnings).toEqual([]);
    expect(result.invoice).toEqual({ month: 5, year: 2026, dueDate: "2026-05-09" });
    expect(result.purchases).toEqual([
      expect.objectContaining({
        description: "MP*CURTOCAFE",
        totalAmount: 5,
        purchaseDate: "2026-04-10",
        cardId: "card-santander",
        categoryId: "cat-outros",
        importedInvoiceMonth: 5,
        importedInvoiceYear: 2026,
        importedInstallmentLabel: "Importado PDF",
      }),
      expect.objectContaining({
        description: "POSTOEXCLUSIVO",
        totalAmount: 150,
        purchaseDate: "2026-04-05",
      }),
      expect.objectContaining({
        description: "LISTO *BNVEICULOS",
        totalAmount: 2736.83,
        purchaseDate: "2026-01-10",
        importedInstallmentLabel: "Parcela 04/06",
      }),
      expect.objectContaining({
        description: "OPENAI*CHATGPTSUBSCR",
        totalAmount: 105.02,
        purchaseDate: "2026-04-24",
      }),
      expect.objectContaining({
        description: "IOF DESPESA NO EXTERIOR",
        totalAmount: 3.68,
        purchaseDate: "2026-05-09",
      }),
    ]);
  });
});
