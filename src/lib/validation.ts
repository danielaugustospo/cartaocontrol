import { z } from "zod";

const isoDate = z.string().min(1, "Informe uma data válida");

const currencyValue = z.coerce.number().finite().nonnegative("Informe um valor válido");
const booleanValue = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  return value === "true" || value === "on";
}, z.boolean());

export const cardSchema = z.object({
  name: z.string().min(2, "Informe o nome do cartão"),
  issuer: z.string().min(2, "Informe o banco ou emissor"),
  brand: z.string().min(2, "Informe a bandeira"),
  lastDigits: z.string().max(4).optional().or(z.literal("")),
  limit: currencyValue.min(1, "Informe um limite maior que zero"),
  closingDay: z.coerce.number().int().min(1).max(31),
  dueDay: z.coerce.number().int().min(1).max(31),
  color: z.string().min(4),
  active: booleanValue,
});

export const purchaseSchema = z
  .object({
    description: z.string().min(2, "Informe a descrição"),
    totalAmount: currencyValue.min(0.01, "Informe um valor maior que zero"),
    purchaseDate: isoDate,
    cardId: z.string().min(1, "Selecione um cartão"),
    categoryId: z.string().min(1, "Selecione uma categoria"),
    type: z.enum(["single", "installment"]),
    installments: z.coerce.number().int().min(1).max(120),
    notes: z.string().optional().or(z.literal("")),
    status: z.enum(["active", "canceled"]),
    importedInvoiceMonth: z.number().int().min(1).max(12).optional(),
    importedInvoiceYear: z.number().int().min(2000).max(2100).optional(),
    importedSource: z.string().optional(),
    importedInstallmentLabel: z.string().optional(),
  })
  .refine((data) => data.type === "installment" || data.installments === 1, {
    path: ["installments"],
    message: "Compras à vista devem ter uma parcela",
  });

export const recurringExpenseSchema = z
  .object({
    description: z.string().min(2, "Informe a descrição"),
    amount: currencyValue.min(0.01, "Informe um valor maior que zero"),
    cardId: z.string().min(1, "Selecione um cartão"),
    categoryId: z.string().min(1, "Selecione uma categoria"),
    chargeDay: z.coerce.number().int().min(1).max(31),
    frequency: z.enum(["monthly", "yearly"]),
    startDate: isoDate,
    endDate: z.string().optional().or(z.literal("")),
  active: booleanValue,
  })
  .refine((data) => !data.endDate || new Date(data.endDate) >= new Date(data.startDate), {
    path: ["endDate"],
    message: "A data final precisa ser posterior ao início",
  });

export const categorySchema = z.object({
  name: z.string().min(2, "Informe o nome da categoria"),
  color: z.string().min(4),
});

export const invoicePaymentSchema = z.object({
  cardId: z.string().min(1),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  status: z.enum(["open", "closed", "paid", "overdue"]),
  paidAt: z.string().optional().or(z.literal("")),
  paidAmount: currencyValue.optional(),
  notes: z.string().optional().or(z.literal("")),
});

export const creditCardEntitySchema = cardSchema.extend({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const purchaseEntitySchema = purchaseSchema.extend({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const recurringExpenseEntitySchema = recurringExpenseSchema.extend({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const categoryEntitySchema = categorySchema.extend({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const invoicePaymentEntitySchema = invoicePaymentSchema.extend({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const financeDataSchema = z.object({
  cards: z.array(creditCardEntitySchema),
  purchases: z.array(purchaseEntitySchema),
  recurringExpenses: z.array(recurringExpenseEntitySchema),
  invoicePayments: z.array(invoicePaymentEntitySchema),
  categories: z.array(categoryEntitySchema),
});

export const backupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  data: financeDataSchema,
});

export type CardFormValues = z.infer<typeof cardSchema>;
export type PurchaseFormValues = z.infer<typeof purchaseSchema>;
export type RecurringExpenseFormValues = z.infer<typeof recurringExpenseSchema>;
export type CategoryFormValues = z.infer<typeof categorySchema>;
export type InvoicePaymentFormValues = z.infer<typeof invoicePaymentSchema>;
