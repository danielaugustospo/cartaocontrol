"use client";

import { useEffect, useMemo } from "react";
import { notifyUpcomingInvoices } from "@/lib/notifications/due-notifications";
import { useFinanceStore } from "@/store/use-finance-store";

export function DueNotificationRunner() {
  const hydrated = useFinanceStore((state) => state.hydrated);
  const cards = useFinanceStore((state) => state.cards);
  const purchases = useFinanceStore((state) => state.purchases);
  const recurringExpenses = useFinanceStore((state) => state.recurringExpenses);
  const invoicePayments = useFinanceStore((state) => state.invoicePayments);
  const categories = useFinanceStore((state) => state.categories);
  const data = useMemo(
    () => ({ cards, purchases, recurringExpenses, invoicePayments, categories }),
    [cards, purchases, recurringExpenses, invoicePayments, categories],
  );

  useEffect(() => {
    if (!hydrated) return;
    notifyUpcomingInvoices(data);
  }, [data, hydrated]);

  return null;
}
