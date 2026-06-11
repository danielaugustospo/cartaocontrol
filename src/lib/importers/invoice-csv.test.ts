import { describe, expect, it } from "vitest";
import { parseInvoiceCsv } from "@/lib/importers/invoice-csv";
import type { Category, CreditCard } from "@/types/finance";

const card: CreditCard = {
  id: "card-1",
  name: "Roxo Platinum",
  issuer: "Nubank",
  brand: "Mastercard",
  lastDigits: "4321",
  limit: 1000,
  closingDay: 20,
  dueDay: 28,
  color: "#7c3aed",
  active: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const category: Category = {
  id: "cat-1",
  name: "Mercado",
  color: "#22c55e",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("parseInvoiceCsv", () => {
  it("imports purchases from semicolon CSV with Brazilian money and dates", () => {
    const csv = [
      "descrição;valor;data;cartão;categoria;parcelas;observação",
      "Compra do mês;R$ 1.234,56;10/06/2026;4321;Mercado;3;Cupom aplicado",
    ].join("\n");

    const result = parseInvoiceCsv(csv, [card], [category]);

    expect(result.warnings).toEqual([]);
    expect(result.purchases).toEqual([
      {
        description: "Compra do mês",
        totalAmount: 1234.56,
        purchaseDate: "2026-06-10",
        cardId: "card-1",
        categoryId: "cat-1",
        type: "installment",
        installments: 3,
        notes: "Cupom aplicado",
        status: "active",
      },
    ]);
  });
});
