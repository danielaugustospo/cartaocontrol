export type CardStatus = "active" | "inactive";
export type PurchaseType = "single" | "installment";
export type PurchaseStatus = "active" | "canceled";
export type RecurringFrequency = "monthly" | "yearly";
export type InvoiceStatus = "open" | "closed" | "paid" | "overdue";
export type InvoiceItemKind = "purchase" | "recurring";

export type CreditCard = {
  id: string;
  name: string;
  issuer: string;
  brand: string;
  lastDigits?: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Category = {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

export type Purchase = {
  id: string;
  description: string;
  totalAmount: number;
  purchaseDate: string;
  cardId: string;
  categoryId: string;
  type: PurchaseType;
  installments: number;
  notes?: string;
  status: PurchaseStatus;
  importedInvoiceMonth?: number;
  importedInvoiceYear?: number;
  importedSource?: string;
  importedInstallmentLabel?: string;
  createdAt: string;
  updatedAt: string;
};

export type Installment = {
  id: string;
  purchaseId: string;
  cardId: string;
  categoryId: string;
  amount: number;
  installmentNumber: number;
  totalInstallments: number;
  dueMonth: number;
  dueYear: number;
  invoiceId?: string;
  status: PurchaseStatus;
  description: string;
  purchaseDate: string;
  installmentLabel?: string;
};

export type RecurringExpense = {
  id: string;
  description: string;
  amount: number;
  cardId: string;
  categoryId: string;
  chargeDay: number;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RecurringCharge = {
  id: string;
  recurringExpenseId: string;
  description: string;
  amount: number;
  cardId: string;
  categoryId: string;
  chargeDate: string;
  dueMonth: number;
  dueYear: number;
  status: "active" | "inactive";
};

export type InvoicePayment = {
  id: string;
  cardId: string;
  month: number;
  year: number;
  status: InvoiceStatus;
  paidAt?: string;
  paidAmount?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceItem = {
  id: string;
  kind: InvoiceItemKind;
  description: string;
  amount: number;
  cardId: string;
  categoryId: string;
  month: number;
  year: number;
  sourceId: string;
  date: string;
  installmentLabel?: string;
  status: "active" | "canceled" | "inactive";
};

export type InvoiceSummary = {
  id: string;
  cardId: string;
  cardName: string;
  cardColor: string;
  month: number;
  year: number;
  total: number;
  closingDate: string;
  dueDate: string;
  status: InvoiceStatus;
  payment?: InvoicePayment;
  items: InvoiceItem[];
};

export type FinanceData = {
  cards: CreditCard[];
  purchases: Purchase[];
  recurringExpenses: RecurringExpense[];
  invoicePayments: InvoicePayment[];
  categories: Category[];
};

export type BackupFile = {
  version: 1;
  exportedAt: string;
  data: FinanceData;
};

export type MonthKey = {
  month: number;
  year: number;
};
