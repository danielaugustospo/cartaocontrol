import {
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  formatISO,
  isAfter,
  isBefore,
  isSameMonth,
  parseISO,
} from "date-fns";
import type { MonthKey } from "@/types/finance";

export const monthId = (month: number, year: number) => `${year}-${String(month).padStart(2, "0")}`;

export const parseMonthId = (id: string): MonthKey => {
  const [year, month] = id.split("-").map(Number);
  return { month, year };
};

export const clampDay = (year: number, monthIndex: number, day: number) => {
  const lastDay = endOfMonth(new Date(year, monthIndex, 1)).getDate();
  return Math.min(Math.max(day, 1), lastDay);
};

export const makeClampedDate = (year: number, month: number, day: number) => {
  const monthIndex = month - 1;
  return new Date(year, monthIndex, clampDay(year, monthIndex, day), 12, 0, 0, 0);
};

export const toIsoDate = (date: Date) => formatISO(date, { representation: "date" });

export const addMonthsToKey = ({ month, year }: MonthKey, amount: number): MonthKey => {
  const date = addMonths(new Date(year, month - 1, 1), amount);
  return { month: date.getMonth() + 1, year: date.getFullYear() };
};

export const compareMonthKeys = (a: MonthKey, b: MonthKey) => a.year * 12 + a.month - (b.year * 12 + b.month);

export const isMonthBetween = (target: MonthKey, start: MonthKey, end: MonthKey) =>
  compareMonthKeys(target, start) >= 0 && compareMonthKeys(target, end) <= 0;

export const calculateInvoiceMonth = (dateInput: string | Date, closingDay: number): MonthKey => {
  const date = typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
  const closingDate = makeClampedDate(date.getFullYear(), date.getMonth() + 1, closingDay);
  const invoiceDate = isAfter(date, closingDate) ? addMonths(closingDate, 1) : closingDate;
  return { month: invoiceDate.getMonth() + 1, year: invoiceDate.getFullYear() };
};

export const getInvoiceClosingDate = (year: number, month: number, closingDay: number) =>
  makeClampedDate(year, month, closingDay);

export const getInvoiceDueDate = (year: number, month: number, dueDay: number) =>
  makeClampedDate(year, month, dueDay);

export const daysUntil = (dateInput: string | Date, reference = new Date()) => {
  const date = typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
  return differenceInCalendarDays(date, reference);
};

export const isPastDate = (dateInput: string | Date, reference = new Date()) => {
  const date = typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
  return isBefore(date, reference) && !isSameMonth(date, reference);
};
