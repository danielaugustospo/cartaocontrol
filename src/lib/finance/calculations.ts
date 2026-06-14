import { addMonths, addYears, isAfter, parseISO } from "date-fns";
import type {
  Category,
  CreditCard,
  FinanceData,
  Installment,
  InvoiceItem,
  InvoicePayment,
  InvoiceStatus,
  InvoiceSummary,
  MonthKey,
  Purchase,
  RecurringCharge,
  RecurringExpense,
} from "@/types/finance";
import {
  addMonthsToKey,
  calculateInvoiceMonth,
  compareMonthKeys,
  daysUntil,
  getInvoiceClosingDate,
  getInvoiceDueDate,
  isMonthBetween,
  monthId,
  toIsoDate,
} from "@/lib/finance/dates";

const cents = (value: number) => Math.round(value * 100);
const money = (valueInCents: number) => Number((valueInCents / 100).toFixed(2));

export const splitAmount = (totalAmount: number, installments: number) => {
  const total = cents(totalAmount);
  const base = Math.floor(total / installments);
  const remainder = total - base * installments;
  return Array.from({ length: installments }, (_, index) => money(base + (index < remainder ? 1 : 0)));
};

export const generatePurchaseInstallments = (purchase: Purchase, card: CreditCard): Installment[] => {
  if (purchase.importedInvoiceMonth && purchase.importedInvoiceYear) {
    return [
      {
        id: `${purchase.id}-imported`,
        purchaseId: purchase.id,
        cardId: purchase.cardId,
        categoryId: purchase.categoryId,
        amount: purchase.totalAmount,
        installmentNumber: 1,
        totalInstallments: 1,
        dueMonth: purchase.importedInvoiceMonth,
        dueYear: purchase.importedInvoiceYear,
        status: purchase.status,
        description: purchase.description,
        purchaseDate: purchase.purchaseDate,
        installmentLabel: purchase.importedInstallmentLabel ?? "Importado PDF",
      },
    ];
  }

  const totalInstallments = purchase.type === "installment" ? Math.max(purchase.installments, 1) : 1;
  const initialInvoice = calculateInvoiceMonth(purchase.purchaseDate, card.closingDay);
  const amounts = splitAmount(purchase.totalAmount, totalInstallments);

  return amounts.map((amount, index) => {
    const invoiceMonth = addMonthsToKey(initialInvoice, index);
    return {
      id: `${purchase.id}-${index + 1}`,
      purchaseId: purchase.id,
      cardId: purchase.cardId,
      categoryId: purchase.categoryId,
      amount,
      installmentNumber: index + 1,
      totalInstallments,
      dueMonth: invoiceMonth.month,
      dueYear: invoiceMonth.year,
      status: purchase.status,
      description: purchase.description,
      purchaseDate: purchase.purchaseDate,
    };
  });
};

export const generateAllInstallments = (purchases: Purchase[], cards: CreditCard[]) =>
  purchases.flatMap((purchase) => {
    const card = cards.find((item) => item.id === purchase.cardId);
    return card ? generatePurchaseInstallments(purchase, card) : [];
  });

export const generateRecurringCharges = (
  recurringExpenses: RecurringExpense[],
  cards: CreditCard[],
  start: MonthKey,
  end: MonthKey,
): RecurringCharge[] => {
  const charges: RecurringCharge[] = [];

  recurringExpenses.forEach((expense) => {
    const card = cards.find((item) => item.id === expense.cardId);
    if (!card) return;

    let chargeDate = parseISO(expense.startDate);
    const endDate = expense.endDate ? parseISO(expense.endDate) : undefined;
    const step = expense.frequency === "monthly" ? addMonths : addYears;

    for (let guard = 0; guard < 240; guard += 1) {
      const realChargeDate = new Date(
        chargeDate.getFullYear(),
        chargeDate.getMonth(),
        Math.min(
          expense.chargeDay,
          new Date(chargeDate.getFullYear(), chargeDate.getMonth() + 1, 0).getDate(),
        ),
        12,
      );
      if (endDate && isAfter(realChargeDate, endDate)) break;

      const invoiceMonth = calculateInvoiceMonth(realChargeDate, card.closingDay);
      if (compareMonthKeys(invoiceMonth, end) > 0) break;
      if (isMonthBetween(invoiceMonth, start, end)) {
        charges.push({
          id: `${expense.id}-${monthId(invoiceMonth.month, invoiceMonth.year)}`,
          recurringExpenseId: expense.id,
          description: expense.description,
          amount: expense.amount,
          cardId: expense.cardId,
          categoryId: expense.categoryId,
          chargeDate: toIsoDate(realChargeDate),
          dueMonth: invoiceMonth.month,
          dueYear: invoiceMonth.year,
          status: expense.active ? "active" : "inactive",
        });
      }

      chargeDate = step(chargeDate, 1);
    }
  });

  return charges;
};

export const buildInvoiceItems = (
  data: FinanceData,
  start: MonthKey,
  end: MonthKey,
): InvoiceItem[] => {
  const installments = generateAllInstallments(data.purchases, data.cards)
    .filter((installment) =>
      isMonthBetween({ month: installment.dueMonth, year: installment.dueYear }, start, end),
    )
    .map((installment): InvoiceItem => ({
      id: installment.id,
      kind: "purchase",
      description: installment.description,
      amount: installment.amount,
      cardId: installment.cardId,
      categoryId: installment.categoryId,
      month: installment.dueMonth,
      year: installment.dueYear,
      sourceId: installment.purchaseId,
      date: installment.purchaseDate,
      installmentLabel: installment.installmentLabel ?? `Parcela ${installment.installmentNumber}/${installment.totalInstallments}`,
      status: installment.status,
    }));

  const recurring = generateRecurringCharges(data.recurringExpenses, data.cards, start, end).map(
    (charge): InvoiceItem => ({
      id: charge.id,
      kind: "recurring",
      description: charge.description,
      amount: charge.amount,
      cardId: charge.cardId,
      categoryId: charge.categoryId,
      month: charge.dueMonth,
      year: charge.dueYear,
      sourceId: charge.recurringExpenseId,
      date: charge.chargeDate,
      installmentLabel: "Recorrente",
      status: charge.status,
    }),
  );

  return [...installments, ...recurring];
};

export const getPaymentForInvoice = (
  payments: InvoicePayment[],
  cardId: string,
  month: number,
  year: number,
) => payments.find((payment) => payment.cardId === cardId && payment.month === month && payment.year === year);

export const calculateInvoiceStatus = (
  payment: InvoicePayment | undefined,
  closingDate: Date,
  dueDate: Date,
  reference = new Date(),
): InvoiceStatus => {
  if (payment?.status === "paid") return "paid";
  if (daysUntil(dueDate, reference) < 0) return "overdue";
  if (daysUntil(closingDate, reference) < 0) return "closed";
  return "open";
};

export const calculateInvoices = (
  data: FinanceData,
  start: MonthKey,
  end: MonthKey,
  reference = new Date(),
): InvoiceSummary[] => {
  const items = buildInvoiceItems(data, start, end).filter((item) => item.status === "active");
  const invoiceMap = new Map<string, InvoiceItem[]>();

  items.forEach((item) => {
    const key = `${item.cardId}::${monthId(item.month, item.year)}`;
    invoiceMap.set(key, [...(invoiceMap.get(key) ?? []), item]);
  });

  data.invoicePayments.forEach((payment) => {
    if (!isMonthBetween({ month: payment.month, year: payment.year }, start, end)) return;
    const key = `${payment.cardId}::${monthId(payment.month, payment.year)}`;
    if (!invoiceMap.has(key)) invoiceMap.set(key, []);
  });

  const invoices = Array.from(invoiceMap.entries()).flatMap(([key, invoiceItems]) => {
    const [cardId, yearMonth] = key.split("::");
    const card = data.cards.find((item) => item.id === cardId);
    if (!card) return [];
    const [yearText, monthText] = yearMonth.split("-");
    const parsed = { year: Number(yearText), month: Number(monthText) };
    const month = parsed.month;
    const year = parsed.year;
    const closingDate = getInvoiceClosingDate(year, month, card.closingDay);
    const dueDate = getInvoiceDueDate(year, month, card.dueDay);
    const payment = getPaymentForInvoice(data.invoicePayments, cardId, month, year);
    const total = invoiceItems.reduce((sum, item) => sum + item.amount, 0);

    return {
      id: key,
      cardId,
      cardName: card.name,
      cardColor: card.color,
      month,
      year,
      total,
      closingDate: toIsoDate(closingDate),
      dueDate: toIsoDate(dueDate),
      status: calculateInvoiceStatus(payment, closingDate, dueDate, reference),
      payment,
      items: invoiceItems.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()),
    };
  });

  return invoices.sort((a, b) => {
    const byMonth = compareMonthKeys({ month: a.month, year: a.year }, { month: b.month, year: b.year });
    return byMonth || a.cardName.localeCompare(b.cardName);
  });
};

export const calculateCardLimitUsage = (data: FinanceData, cardId: string, reference = new Date()) => {
  const card = data.cards.find((item) => item.id === cardId);
  if (!card) return { used: 0, available: 0, percent: 0 };

  const current = { month: reference.getMonth() + 1, year: reference.getFullYear() };
  const installments = generateAllInstallments(data.purchases, data.cards).filter(
    (installment) =>
      installment.cardId === cardId &&
      installment.status === "active" &&
      compareMonthKeys({ month: installment.dueMonth, year: installment.dueYear }, current) >= 0,
  );
  const unpaidInstallments = installments.filter((installment) => {
    const payment = getPaymentForInvoice(data.invoicePayments, installment.cardId, installment.dueMonth, installment.dueYear);
    return payment?.status !== "paid";
  });
  const used = unpaidInstallments.reduce((sum, installment) => sum + installment.amount, 0);
  const available = Math.max(card.limit - used, 0);
  return { used, available, percent: card.limit ? (used / card.limit) * 100 : 0 };
};

export const calculatePortfolioLimit = (data: FinanceData, reference = new Date()) =>
  data.cards.reduce(
    (acc, card) => {
      if (!card.active) return acc;
      const usage = calculateCardLimitUsage(data, card.id, reference);
      return {
        total: acc.total + card.limit,
        used: acc.used + usage.used,
        available: acc.available + usage.available,
      };
    },
    { total: 0, used: 0, available: 0 },
  );

export const getNextDueInvoices = (invoices: InvoiceSummary[], reference = new Date()) =>
  invoices
    .filter((invoice) => invoice.status !== "paid" && daysUntil(invoice.dueDate, reference) >= -30)
    .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());

export const getLargestPurchasesInMonth = (data: FinanceData, month: number, year: number) => {
  const cardById = new Map(data.cards.map((card) => [card.id, card]));
  const categoryById = new Map(data.categories.map((category) => [category.id, category]));
  return data.purchases
    .filter((purchase) => {
      const date = parseISO(purchase.purchaseDate);
      return purchase.status === "active" && date.getMonth() + 1 === month && date.getFullYear() === year;
    })
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 6)
    .map((purchase) => ({
      ...purchase,
      cardName: cardById.get(purchase.cardId)?.name ?? "Cartão removido",
      categoryName: categoryById.get(purchase.categoryId)?.name ?? "Sem categoria",
    }));
};

export const buildMonthlyChartData = (items: InvoiceItem[], months: MonthKey[]) =>
  months.map((entry) => ({
    month: monthId(entry.month, entry.year),
    total: items
      .filter((item) => item.status === "active" && item.month === entry.month && item.year === entry.year)
      .reduce((sum, item) => sum + item.amount, 0),
  }));

export const buildCategoryChartData = (items: InvoiceItem[], categories: Category[]) => {
  const totals = new Map<string, number>();
  items
    .filter((item) => item.status === "active")
    .forEach((item) => totals.set(item.categoryId, (totals.get(item.categoryId) ?? 0) + item.amount));

  return Array.from(totals.entries())
    .map(([categoryId, total]) => {
      const category = categories.find((item) => item.id === categoryId);
      return {
        name: category?.name ?? "Sem categoria",
        value: total,
        color: category?.color ?? "#71717a",
      };
    })
    .sort((a, b) => b.value - a.value);
};

export const buildCardChartData = (items: InvoiceItem[], cards: CreditCard[]) => {
  const totals = new Map<string, number>();
  items
    .filter((item) => item.status === "active")
    .forEach((item) => totals.set(item.cardId, (totals.get(item.cardId) ?? 0) + item.amount));

  return Array.from(totals.entries())
    .map(([cardId, total]) => {
      const card = cards.find((item) => item.id === cardId);
      return {
        name: card?.name ?? "Cartão removido",
        value: total,
        color: card?.color ?? "#0f766e",
      };
    })
    .sort((a, b) => b.value - a.value);
};

export const buildDashboardMetrics = (data: FinanceData, reference = new Date()) => {
  const current = { month: reference.getMonth() + 1, year: reference.getFullYear() };
  const start = addMonthsToKey(current, -5);
  const end = addMonthsToKey(current, 6);
  const invoices = calculateInvoices(data, start, end, reference);
  const items = buildInvoiceItems(data, start, end);
  const limit = calculatePortfolioLimit(data, reference);
  const openTotal = invoices
    .filter((invoice) => invoice.status === "open" || invoice.status === "overdue")
    .reduce((sum, invoice) => sum + invoice.total, 0);
  const closedTotal = invoices
    .filter((invoice) => invoice.status === "closed")
    .reduce((sum, invoice) => sum + invoice.total, 0);
  const paidThisMonth = data.invoicePayments
    .filter((payment) => payment.status === "paid" && payment.paidAt)
    .filter((payment) => {
      const paidAt = parseISO(payment.paidAt as string);
      return paidAt.getMonth() + 1 === current.month && paidAt.getFullYear() === current.year;
    })
    .reduce((sum, payment) => sum + (payment.paidAmount ?? 0), 0);
  const forecastTotal = items
    .filter((item) => item.status === "active" && compareMonthKeys({ month: item.month, year: item.year }, current) > 0)
    .reduce((sum, item) => sum + item.amount, 0);
  const nextDue = getNextDueInvoices(invoices, reference)[0];
  const months = Array.from({ length: 8 }, (_, index) => addMonthsToKey(addMonthsToKey(current, -3), index));
  const chartItems = buildInvoiceItems(data, months[0], months[months.length - 1]);

  return {
    invoices,
    openTotal,
    closedTotal,
    paidThisMonth,
    forecastTotal,
    limit: {
      ...limit,
      percent: limit.total ? (limit.used / limit.total) * 100 : 0,
    },
    nextDue,
    daysToNextDue: nextDue ? daysUntil(nextDue.dueDate, reference) : undefined,
    monthlyChart: buildMonthlyChartData(chartItems, months),
    categoryChart: buildCategoryChartData(
      chartItems.filter((item) => item.month === current.month && item.year === current.year),
      data.categories,
    ),
    cardChart: buildCardChartData(
      chartItems.filter((item) => item.month === current.month && item.year === current.year),
      data.cards,
    ),
    largestPurchases: getLargestPurchasesInMonth(data, current.month, current.year),
    nextInvoices: getNextDueInvoices(invoices, reference).slice(0, 5),
  };
};
