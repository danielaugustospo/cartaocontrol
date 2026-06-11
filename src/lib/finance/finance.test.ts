import { describe, expect, it } from "vitest";
import { calculateInvoiceMonth, getInvoiceDueDate } from "@/lib/finance/dates";
import { calculateCardLimitUsage, generatePurchaseInstallments, splitAmount } from "@/lib/finance/calculations";
import type { CreditCard, FinanceData, Purchase } from "@/types/finance";

const card: CreditCard = {
  id: "card",
  name: "Teste",
  issuer: "Banco",
  brand: "Visa",
  limit: 1000,
  closingDay: 20,
  dueDay: 31,
  color: "#000000",
  active: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("finance calculations", () => {
  it("sends purchases after closing to next invoice", () => {
    expect(calculateInvoiceMonth("2026-01-19", 20)).toEqual({ month: 1, year: 2026 });
    expect(calculateInvoiceMonth("2026-01-21", 20)).toEqual({ month: 2, year: 2026 });
  });

  it("clamps due date to the last valid day of the month", () => {
    expect(getInvoiceDueDate(2026, 2, 31).getDate()).toBe(28);
    expect(getInvoiceDueDate(2028, 2, 31).getDate()).toBe(29);
  });

  it("splits cents without losing the total", () => {
    expect(splitAmount(100, 3)).toEqual([33.34, 33.33, 33.33]);
  });

  it("generates monthly installments from the first invoice month", () => {
    const purchase: Purchase = {
      id: "purchase",
      description: "Compra",
      totalAmount: 1200,
      purchaseDate: "2026-01-21",
      cardId: "card",
      categoryId: "cat",
      type: "installment",
      installments: 12,
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const installments = generatePurchaseInstallments(purchase, card);
    expect(installments).toHaveLength(12);
    expect(installments[0]).toMatchObject({ amount: 100, dueMonth: 2, dueYear: 2026 });
    expect(installments[11]).toMatchObject({ amount: 100, dueMonth: 1, dueYear: 2027 });
  });

  it("uses installments but ignores recurring charges for card limit usage", () => {
    const data: FinanceData = {
      cards: [card],
      categories: [
        {
          id: "cat",
          name: "Categoria",
          color: "#000000",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      purchases: [
        {
          id: "installment-purchase",
          description: "Parcelada",
          totalAmount: 300,
          purchaseDate: "2026-01-05",
          cardId: "card",
          categoryId: "cat",
          type: "installment",
          installments: 3,
          status: "active",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      recurringExpenses: [
        {
          id: "recurring",
          description: "Assinatura",
          amount: 250,
          cardId: "card",
          categoryId: "cat",
          chargeDay: 10,
          frequency: "monthly",
          startDate: "2026-01-01",
          active: true,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      invoicePayments: [],
    };

    expect(calculateCardLimitUsage(data, "card", new Date(2026, 0, 10))).toMatchObject({
      used: 300,
      available: 700,
      percent: 30,
    });
  });
});
