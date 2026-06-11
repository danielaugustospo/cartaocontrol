"use client";

import { create } from "zustand";
import { createEmptyFinanceData, createSeedFinanceData } from "@/data/seed";
import { backupSchema, financeDataSchema } from "@/lib/validation";
import { clearFinanceData, loadFinanceData, saveFinanceData } from "@/lib/storage/local-db";
import type {
  BackupFile,
  Category,
  CreditCard,
  FinanceData,
  InvoicePayment,
  Purchase,
  RecurringExpense,
} from "@/types/finance";

const uid = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const now = () => new Date().toISOString();

type EntityName = keyof FinanceData;

type FinanceStore = FinanceData & {
  hydrated: boolean;
  load: () => Promise<void>;
  replaceData: (data: FinanceData) => Promise<void>;
  resetData: () => Promise<void>;
  loadSeedData: () => Promise<void>;
  exportBackup: () => BackupFile;
  importBackup: (backup: unknown) => Promise<void>;
  addCard: (card: Omit<CreditCard, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateCard: (id: string, card: Omit<CreditCard, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  addPurchase: (purchase: Omit<Purchase, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updatePurchase: (id: string, purchase: Omit<Purchase, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  cancelPurchase: (id: string) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
  addRecurringExpense: (recurring: Omit<RecurringExpense, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateRecurringExpense: (
    id: string,
    recurring: Omit<RecurringExpense, "id" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
  deleteRecurringExpense: (id: string) => Promise<void>;
  addCategory: (category: Omit<Category, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateCategory: (id: string, category: Omit<Category, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  upsertInvoicePayment: (
    payment: Omit<InvoicePayment, "id" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
};

const persist = async (set: (state: Partial<FinanceStore>) => void, data: FinanceData) => {
  const parsed = financeDataSchema.parse(data);
  set(parsed);
  await saveFinanceData(parsed);
};

const appendEntity = <T extends { id: string; createdAt: string; updatedAt: string }>(
  data: FinanceData,
  key: EntityName,
  item: Omit<T, "id" | "createdAt" | "updatedAt">,
) => {
  const date = now();
  const collection = data[key] as unknown as T[];
  return {
    ...data,
    [key]: [...collection, { ...item, id: uid(), createdAt: date, updatedAt: date }],
  } as FinanceData;
};

const updateEntity = <T extends { id: string; createdAt: string; updatedAt: string }>(
  data: FinanceData,
  key: EntityName,
  id: string,
  item: Omit<T, "id" | "createdAt" | "updatedAt">,
) => {
  const collection = data[key] as unknown as T[];
  return {
    ...data,
    [key]: collection.map((entity) =>
      entity.id === id ? { ...entity, ...item, id, updatedAt: now() } : entity,
    ),
  } as FinanceData;
};

const removeEntity = <T extends { id: string }>(data: FinanceData, key: EntityName, id: string) => {
  const collection = data[key] as unknown as T[];
  return {
    ...data,
    [key]: collection.filter((entity) => entity.id !== id),
  } as FinanceData;
};

export const useFinanceStore = create<FinanceStore>((set, get) => ({
  ...createEmptyFinanceData(),
  hydrated: false,
  load: async () => {
    if (get().hydrated) return;
    const data = await loadFinanceData();
    set({ ...data, hydrated: true });
  },
  replaceData: async (data) => {
    await persist(set, data);
    set({ hydrated: true });
  },
  resetData: async () => {
    await clearFinanceData();
    set({ ...createEmptyFinanceData(), hydrated: true });
  },
  loadSeedData: async () => {
    await persist(set, createSeedFinanceData());
    set({ hydrated: true });
  },
  exportBackup: () => ({
    version: 1,
    exportedAt: now(),
    data: {
      cards: get().cards,
      purchases: get().purchases,
      recurringExpenses: get().recurringExpenses,
      invoicePayments: get().invoicePayments,
      categories: get().categories,
    },
  }),
  importBackup: async (backup) => {
    const parsed = backupSchema.parse(backup);
    await persist(set, parsed.data);
    set({ hydrated: true });
  },
  addCard: async (card) => persist(set, appendEntity<CreditCard>(get(), "cards", card)),
  updateCard: async (id, card) => persist(set, updateEntity<CreditCard>(get(), "cards", id, card)),
  deleteCard: async (id) => persist(set, removeEntity<CreditCard>(get(), "cards", id)),
  addPurchase: async (purchase) => persist(set, appendEntity<Purchase>(get(), "purchases", purchase)),
  updatePurchase: async (id, purchase) => persist(set, updateEntity<Purchase>(get(), "purchases", id, purchase)),
  cancelPurchase: async (id) =>
    persist(set, {
      ...get(),
      purchases: get().purchases.map((purchase) =>
        purchase.id === id ? { ...purchase, status: "canceled", updatedAt: now() } : purchase,
      ),
    }),
  deletePurchase: async (id) => persist(set, removeEntity<Purchase>(get(), "purchases", id)),
  addRecurringExpense: async (recurring) =>
    persist(set, appendEntity<RecurringExpense>(get(), "recurringExpenses", recurring)),
  updateRecurringExpense: async (id, recurring) =>
    persist(set, updateEntity<RecurringExpense>(get(), "recurringExpenses", id, recurring)),
  deleteRecurringExpense: async (id) =>
    persist(set, removeEntity<RecurringExpense>(get(), "recurringExpenses", id)),
  addCategory: async (category) => persist(set, appendEntity<Category>(get(), "categories", category)),
  updateCategory: async (id, category) => persist(set, updateEntity<Category>(get(), "categories", id, category)),
  deleteCategory: async (id) => persist(set, removeEntity<Category>(get(), "categories", id)),
  upsertInvoicePayment: async (payment) => {
    const existing = get().invoicePayments.find(
      (item) => item.cardId === payment.cardId && item.month === payment.month && item.year === payment.year,
    );
    if (existing) {
      await persist(set, updateEntity<InvoicePayment>(get(), "invoicePayments", existing.id, payment));
      return;
    }
    await persist(set, appendEntity<InvoicePayment>(get(), "invoicePayments", payment));
  },
}));
