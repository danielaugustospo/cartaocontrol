import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const numberFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

export const formatCurrency = (value: number) => currencyFormatter.format(value || 0);

export const formatDate = (date: string | Date) => {
  const parsed = typeof date === "string" ? parseISO(date) : date;
  return format(parsed, "dd/MM/yyyy", { locale: ptBR });
};

export const formatMonthYear = (month: number, year: number) =>
  format(new Date(year, month - 1, 1), "MMM/yyyy", { locale: ptBR }).replace(".", "");

export const toInputDate = (date: string | Date) => {
  const parsed = typeof date === "string" ? parseISO(date) : date;
  return format(parsed, "yyyy-MM-dd");
};

export const parseCurrencyInput = (value: string) => {
  const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  return Number(normalized || 0);
};

export const clampPercent = (value: number) => Math.min(Math.max(value, 0), 100);
