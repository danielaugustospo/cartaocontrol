"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Notice, PageHeader } from "@/components/ui/page";
import { addMonthsToKey, calculateInvoices } from "@/lib/finance";
import { formatCurrency, formatDate, formatMonthYear, toInputDate } from "@/lib/format";
import { useFinanceStore } from "@/store/use-finance-store";
import type { InvoiceStatus } from "@/types/finance";

const statusLabel: Record<InvoiceStatus, string> = {
  open: "Aberta",
  closed: "Fechada",
  paid: "Paga",
  overdue: "Vencida",
};

const statusVariant: Record<InvoiceStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
  open: "info",
  closed: "warning",
  paid: "success",
  overdue: "danger",
};

export function InvoicesScreen() {
  const store = useFinanceStore();
  const [notice, setNotice] = useState("");
  const [filters, setFilters] = useState({
    cardId: "all",
    month: "",
    status: "all",
  });
  const data = {
    cards: store.cards,
    purchases: store.purchases,
    recurringExpenses: store.recurringExpenses,
    invoicePayments: store.invoicePayments,
    categories: store.categories,
  };
  const current = { month: new Date().getMonth() + 1, year: new Date().getFullYear() };
  const start = addMonthsToKey(current, -6);
  const end = addMonthsToKey(current, 18);
  const invoices = calculateInvoices(data, start, end);
  const categoryById = useMemo(() => new Map(store.categories.map((category) => [category.id, category])), [store.categories]);
  const filteredInvoices = invoices
    .filter((invoice) => filters.cardId === "all" || invoice.cardId === filters.cardId)
    .filter((invoice) => filters.status === "all" || invoice.status === filters.status)
    .filter((invoice) => {
      if (!filters.month) return true;
      const [year, month] = filters.month.split("-").map(Number);
      return invoice.month === month && invoice.year === year;
    });

  const submitPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await store.upsertInvoicePayment({
      cardId: String(form.get("cardId")),
      month: Number(form.get("month")),
      year: Number(form.get("year")),
      status: "paid",
      paidAt: String(form.get("paidAt")),
      paidAmount: Number(form.get("paidAmount")),
      notes: String(form.get("notes") ?? ""),
    });
    setNotice("Fatura marcada como paga.");
  };

  return (
    <>
      <PageHeader
        title="Faturas"
        description="Faturas calculadas com base em compras, parcelas e recorrências."
      />
      {notice ? <Notice>{notice}</Notice> : null}

      <Card className="mb-4">
        <CardBody className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <Field label="Cartão">
            <Select value={filters.cardId} onChange={(event) => setFilters({ ...filters, cardId: event.target.value })}>
              <option value="all">Todos</option>
              {store.cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
            </Select>
          </Field>
          <Field label="Mês">
            <Input type="month" value={filters.month} onChange={(event) => setFilters({ ...filters, month: event.target.value })} />
          </Field>
          <Field label="Status">
            <Select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="all">Todos</option>
              <option value="open">Aberta</option>
              <option value="closed">Fechada</option>
              <option value="paid">Paga</option>
              <option value="overdue">Vencida</option>
            </Select>
          </Field>
          <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Filter className="h-4 w-4" />
            {filteredInvoices.length} fatura(s)
          </div>
        </CardBody>
      </Card>

      <div className="space-y-4">
        {filteredInvoices.length ? (
          filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className={invoice.status === "overdue" ? "border-rose-300 bg-rose-50/50" : ""}>
              <CardBody>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="h-4 w-4 rounded-full" style={{ backgroundColor: invoice.cardColor }} />
                      <h2 className="text-xl font-bold text-slate-950">
                        {invoice.cardName} • {formatMonthYear(invoice.month, invoice.year)}
                      </h2>
                      <Badge variant={statusVariant[invoice.status]}>{statusLabel[invoice.status]}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Fecha em {formatDate(invoice.closingDate)} • vence em {formatDate(invoice.dueDate)}
                    </p>
                  </div>
                  <div className="text-left xl:text-right">
                    <span className="text-sm text-slate-500">Total da fatura</span>
                    <strong className="block text-2xl text-slate-950">{formatCurrency(invoice.total)}</strong>
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Lançamento</th>
                        <th className="px-3 py-2">Categoria</th>
                        <th className="px-3 py-2">Data</th>
                        <th className="px-3 py-2">Tipo</th>
                        <th className="px-3 py-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoice.items.length ? (
                        invoice.items.map((item) => {
                          const category = categoryById.get(item.categoryId);
                          return (
                            <tr key={item.id}>
                              <td className="px-3 py-3 font-medium text-slate-950">{item.description}</td>
                              <td className="px-3 py-3">
                                <span className="inline-flex items-center gap-2 text-slate-600">
                                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category?.color ?? "#71717a" }} />
                                  {category?.name ?? "Sem categoria"}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-slate-600">{formatDate(item.date)}</td>
                              <td className="px-3 py-3 text-slate-600">{item.installmentLabel ?? (item.kind === "purchase" ? "Compra" : "Recorrente")}</td>
                              <td className="px-3 py-3 text-right font-semibold text-slate-950">{formatCurrency(item.amount)}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-slate-500">Sem lançamentos nesta fatura.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <form className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-[1fr_1fr_2fr_auto]" onSubmit={submitPayment}>
                  <input type="hidden" name="cardId" value={invoice.cardId} />
                  <input type="hidden" name="month" value={invoice.month} />
                  <input type="hidden" name="year" value={invoice.year} />
                  <Field label="Data de pagamento">
                    <Input name="paidAt" type="date" defaultValue={invoice.payment?.paidAt ? toInputDate(invoice.payment.paidAt) : toInputDate(new Date())} />
                  </Field>
                  <Field label="Valor pago">
                    <Input name="paidAmount" type="number" min="0" step="0.01" defaultValue={invoice.payment?.paidAmount ?? invoice.total} />
                  </Field>
                  <Field label="Observação">
                    <Textarea name="notes" defaultValue={invoice.payment?.notes ?? ""} className="min-h-10" />
                  </Field>
                  <Button type="submit" className="mt-6" icon={<CheckCircle2 className="h-4 w-4" />}>
                    Marcar paga
                  </Button>
                </form>
              </CardBody>
            </Card>
          ))
        ) : (
          <EmptyState title="Nenhuma fatura encontrada" description="Ajuste os filtros ou cadastre compras e recorrências." />
        )}
      </div>
    </>
  );
}
