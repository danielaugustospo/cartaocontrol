import { subMonths } from "date-fns";
import { defaultCategories } from "@/data/default-categories";
import type { FinanceData } from "@/types/finance";

const iso = (date: Date) => date.toISOString();
const now = new Date();
const stamp = iso(now);

export const createEmptyFinanceData = (): FinanceData => ({
  cards: [],
  purchases: [],
  recurringExpenses: [],
  invoicePayments: [],
  categories: defaultCategories.map((category) => ({ ...category })),
});

export const createSeedFinanceData = (): FinanceData => {
  const categories = defaultCategories.map((category) => ({ ...category }));
  const cards = [
    {
      id: "card-nubank",
      name: "Roxo Platinum",
      issuer: "Nubank",
      brand: "Mastercard",
      lastDigits: "4321",
      limit: 8500,
      closingDay: 20,
      dueDay: 28,
      color: "#7c3aed",
      active: true,
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: "card-itau",
      name: "Itaú Personnalité",
      issuer: "Itaú",
      brand: "Visa",
      lastDigits: "0912",
      limit: 12000,
      closingDay: 5,
      dueDay: 15,
      color: "#f97316",
      active: true,
      createdAt: stamp,
      updatedAt: stamp,
    },
  ];

  const purchases = [
    ["purchase-mercado", "Compra do mês", 876.42, -8, "card-nubank", "cat-mercado", "single", 1],
    ["purchase-combustivel", "Posto Shell", 289.9, -7, "card-nubank", "cat-transporte", "single", 1],
    ["purchase-farmacia", "Farmácia", 132.7, -4, "card-itau", "cat-saude", "single", 1],
    ["purchase-restaurante", "Restaurante japonês", 218.5, -2, "card-nubank", "cat-alimentacao", "single", 1],
    ["purchase-livros", "Livros técnicos", 340, -17, "card-itau", "cat-educacao", "single", 1],
    ["purchase-tenis", "Tênis de corrida", 699.9, -23, "card-nubank", "cat-compras", "installment", 3],
    ["purchase-notebook", "Notebook trabalho", 7200, -41, "card-itau", "cat-compras", "installment", 12],
    ["purchase-hotel", "Hotel viagem", 1800, -35, "card-itau", "cat-viagem", "installment", 6],
    ["purchase-cinema", "Cinema", 96, -1, "card-nubank", "cat-lazer", "single", 1],
    ["purchase-manutencao", "Manutenção residencial", 450, -15, "card-itau", "cat-servicos", "single", 1],
  ].map(([id, description, totalAmount, days, cardId, categoryId, type, installments]) => ({
    id: String(id),
    description: String(description),
    totalAmount: Number(totalAmount),
    purchaseDate: iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + Number(days))),
    cardId: String(cardId),
    categoryId: String(categoryId),
    type: type as "single" | "installment",
    installments: Number(installments),
    notes: "",
    status: "active" as const,
    createdAt: stamp,
    updatedAt: stamp,
  }));

  const recurringExpenses = [
    {
      id: "rec-netflix",
      description: "Netflix",
      amount: 55.9,
      cardId: "card-nubank",
      categoryId: "cat-assinaturas",
      chargeDay: 10,
      frequency: "monthly" as const,
      startDate: iso(subMonths(now, 7)),
      active: true,
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: "rec-internet",
      description: "Internet residencial",
      amount: 119.9,
      cardId: "card-itau",
      categoryId: "cat-moradia",
      chargeDay: 2,
      frequency: "monthly" as const,
      startDate: iso(subMonths(now, 12)),
      active: true,
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: "rec-prime",
      description: "Amazon Prime anual",
      amount: 166.8,
      cardId: "card-nubank",
      categoryId: "cat-assinaturas",
      chargeDay: 18,
      frequency: "yearly" as const,
      startDate: iso(subMonths(now, 3)),
      active: true,
      createdAt: stamp,
      updatedAt: stamp,
    },
  ];

  const invoicePayments = [
    {
      id: "pay-nubank-prev",
      cardId: "card-nubank",
      month: now.getMonth() === 0 ? 12 : now.getMonth(),
      year: now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
      status: "paid" as const,
      paidAt: iso(subMonths(now, 1)),
      paidAmount: 1220.5,
      notes: "Pago pelo app do banco.",
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: "pay-itau-prev",
      cardId: "card-itau",
      month: now.getMonth() === 0 ? 12 : now.getMonth(),
      year: now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
      status: "paid" as const,
      paidAt: iso(subMonths(now, 1)),
      paidAmount: 910.75,
      notes: "",
      createdAt: stamp,
      updatedAt: stamp,
    },
  ];

  return { cards, purchases, recurringExpenses, invoicePayments, categories };
};
