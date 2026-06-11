import type { Category } from "@/types/finance";

const now = new Date("2026-01-01T00:00:00.000Z").toISOString();

export const defaultCategories: Category[] = [
  { id: "cat-alimentacao", name: "Alimentação", color: "#ef4444", createdAt: now, updatedAt: now },
  { id: "cat-transporte", name: "Transporte", color: "#f97316", createdAt: now, updatedAt: now },
  { id: "cat-mercado", name: "Mercado", color: "#22c55e", createdAt: now, updatedAt: now },
  { id: "cat-saude", name: "Saúde", color: "#06b6d4", createdAt: now, updatedAt: now },
  { id: "cat-educacao", name: "Educação", color: "#3b82f6", createdAt: now, updatedAt: now },
  { id: "cat-moradia", name: "Moradia", color: "#8b5cf6", createdAt: now, updatedAt: now },
  { id: "cat-lazer", name: "Lazer", color: "#ec4899", createdAt: now, updatedAt: now },
  { id: "cat-assinaturas", name: "Assinaturas", color: "#14b8a6", createdAt: now, updatedAt: now },
  { id: "cat-viagem", name: "Viagem", color: "#0ea5e9", createdAt: now, updatedAt: now },
  { id: "cat-compras", name: "Compras", color: "#a855f7", createdAt: now, updatedAt: now },
  { id: "cat-servicos", name: "Serviços", color: "#64748b", createdAt: now, updatedAt: now },
  { id: "cat-outros", name: "Outros", color: "#71717a", createdAt: now, updatedAt: now },
];

export const defaultCategoryColors = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#22c55e",
  "#14b8a6",
  "#0ea5e9",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
];
