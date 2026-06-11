"use client";

import { buildDashboardMetrics } from "@/lib/finance";
import { formatCurrency, formatDate } from "@/lib/format";
import type { FinanceData } from "@/types/finance";

const STORAGE_KEY = "cartaocontrol-notified-invoices";

const todayKey = () => new Date().toISOString().slice(0, 10);

const readNotified = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
};

const saveNotified = (data: Record<string, string>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const canUseNotifications = () => typeof window !== "undefined" && "Notification" in window;

export const requestDueNotificationPermission = async () => {
  if (!canUseNotifications()) return "unsupported" as const;
  if (Notification.permission === "granted") return "granted" as const;
  return Notification.requestPermission();
};

export const notifyUpcomingInvoices = (data: FinanceData, daysAhead = 3) => {
  if (!canUseNotifications() || Notification.permission !== "granted") return 0;

  const notified = readNotified();
  const today = todayKey();
  const metrics = buildDashboardMetrics(data);
  const dueInvoices = metrics.nextInvoices.filter((invoice) => {
    const days = Math.ceil((new Date(invoice.dueDate).getTime() - Date.now()) / 86_400_000);
    return days >= 0 && days <= daysAhead && notified[invoice.id] !== today;
  });

  dueInvoices.forEach((invoice) => {
    const days = Math.ceil((new Date(invoice.dueDate).getTime() - Date.now()) / 86_400_000);
    const title = days === 0 ? "Fatura vence hoje" : `Fatura vence em ${days} dia(s)`;
    new Notification(title, {
      body: `${invoice.cardName}: ${formatCurrency(invoice.total)} até ${formatDate(invoice.dueDate)}`,
      icon: "/icons/icon-192.svg",
      tag: invoice.id,
    });
    notified[invoice.id] = today;
  });

  saveNotified(notified);
  return dueInvoices.length;
};
