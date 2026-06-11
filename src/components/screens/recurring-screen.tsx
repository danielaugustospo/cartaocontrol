"use client";

import { FormEvent, useMemo, useState } from "react";
import { addMonths } from "date-fns";
import { CalendarClock, Edit2, PauseCircle, PlayCircle, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormGrid, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Notice, PageHeader } from "@/components/ui/page";
import { zodToFieldErrors, type FieldErrors } from "@/components/forms/form-utils";
import { generateRecurringCharges } from "@/lib/finance";
import { formatCurrency, formatDate, formatMonthYear, toInputDate } from "@/lib/format";
import { recurringExpenseSchema, type RecurringExpenseFormValues } from "@/lib/validation";
import { useFinanceStore } from "@/store/use-finance-store";
import type { RecurringExpense } from "@/types/finance";

const emptyForm: RecurringExpenseFormValues = {
  description: "",
  amount: 0,
  cardId: "",
  categoryId: "",
  chargeDay: 10,
  frequency: "monthly",
  startDate: toInputDate(new Date()),
  endDate: "",
  active: true,
};

export function RecurringScreen() {
  const store = useFinanceStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringExpense | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState("");
  const [filters, setFilters] = useState({ cardId: "all", categoryId: "all", active: "all" });
  const cardById = useMemo(() => new Map(store.cards.map((card) => [card.id, card])), [store.cards]);
  const categoryById = useMemo(() => new Map(store.categories.map((category) => [category.id, category])), [store.categories]);
  const current = { month: new Date().getMonth() + 1, year: new Date().getFullYear() };
  const future = addMonths(new Date(), 12);
  const end = { month: future.getMonth() + 1, year: future.getFullYear() };
  const charges = generateRecurringCharges(store.recurringExpenses, store.cards, current, end);
  const recurring = store.recurringExpenses
    .filter((item) => filters.cardId === "all" || item.cardId === filters.cardId)
    .filter((item) => filters.categoryId === "all" || item.categoryId === filters.categoryId)
    .filter((item) => filters.active === "all" || String(item.active) === filters.active);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = recurringExpenseSchema.safeParse({
      description: form.get("description"),
      amount: form.get("amount"),
      cardId: form.get("cardId"),
      categoryId: form.get("categoryId"),
      chargeDay: form.get("chargeDay"),
      frequency: form.get("frequency"),
      startDate: form.get("startDate"),
      endDate: form.get("endDate"),
      active: form.get("active") === "on",
    });
    if (!parsed.success) {
      setErrors(zodToFieldErrors(parsed.error));
      return;
    }
    const data = { ...parsed.data, endDate: parsed.data.endDate || undefined };
    if (editing) {
      await store.updateRecurringExpense(editing.id, data);
      setNotice("Recorrência atualizada.");
    } else {
      await store.addRecurringExpense(data);
      setNotice("Recorrência cadastrada.");
    }
    setOpen(false);
  };

  const toggle = async (item: RecurringExpense) => {
    await store.updateRecurringExpense(item.id, { ...item, active: !item.active });
    setNotice(item.active ? "Recorrência pausada." : "Recorrência reativada.");
  };

  const remove = async (item: RecurringExpense) => {
    if (!window.confirm("Excluir esta recorrência? Cobranças futuras deixarão de aparecer.")) return;
    await store.deleteRecurringExpense(item.id);
    setNotice("Recorrência excluída.");
  };

  return (
    <>
      <PageHeader
        title="Recorrências"
        description="Controle assinaturas e cobranças fixas que entram automaticamente nas faturas."
        action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => { setEditing(null); setErrors({}); setOpen(true); }}>Nova recorrência</Button>}
      />
      {notice ? <Notice>{notice}</Notice> : null}

      <Card className="mb-4">
        <CardBody className="grid gap-3 md:grid-cols-3">
          <Field label="Cartão">
            <Select value={filters.cardId} onChange={(event) => setFilters({ ...filters, cardId: event.target.value })}>
              <option value="all">Todos</option>
              {store.cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
            </Select>
          </Field>
          <Field label="Categoria">
            <Select value={filters.categoryId} onChange={(event) => setFilters({ ...filters, categoryId: event.target.value })}>
              <option value="all">Todas</option>
              {store.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={filters.active} onChange={(event) => setFilters({ ...filters, active: event.target.value })}>
              <option value="all">Todos</option>
              <option value="true">Ativas</option>
              <option value="false">Inativas</option>
            </Select>
          </Field>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {recurring.length ? (
          recurring.map((item) => {
            const nextCharges = charges.filter((charge) => charge.recurringExpenseId === item.id).slice(0, 4);
            return (
              <Card key={item.id}>
                <CardBody>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-950">{item.description}</h2>
                        <Badge variant={item.active ? "success" : "warning"}>{item.active ? "Ativa" : "Inativa"}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {cardById.get(item.cardId)?.name ?? "Cartão removido"} • {categoryById.get(item.categoryId)?.name ?? "Sem categoria"} • dia {item.chargeDay}
                      </p>
                    </div>
                    <strong className="text-xl text-slate-950">{formatCurrency(item.amount)}</strong>
                  </div>
                  <div className="mt-4 rounded-lg bg-slate-50 p-3">
                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <CalendarClock className="h-4 w-4" /> Próximas cobranças
                    </p>
                    {nextCharges.length ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {nextCharges.map((charge) => (
                          <span key={charge.id} className="rounded-md bg-white px-3 py-2 text-sm text-slate-600">
                            {formatDate(charge.chargeDate)} • {formatMonthYear(charge.dueMonth, charge.dueYear)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-500">Sem cobranças futuras no período.</span>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="secondary" icon={<Edit2 className="h-4 w-4" />} onClick={() => { setEditing(item); setErrors({}); setOpen(true); }}>Editar</Button>
                    <Button variant="ghost" icon={item.active ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />} onClick={() => void toggle(item)}>
                      {item.active ? "Pausar" : "Reativar"}
                    </Button>
                    <Button variant="ghost" icon={<Trash2 className="h-4 w-4" />} onClick={() => void remove(item)}>Excluir</Button>
                  </div>
                </CardBody>
              </Card>
            );
          })
        ) : (
          <EmptyState title="Nenhuma recorrência" description="Cadastre assinaturas e cobranças fixas para projetar faturas futuras." />
        )}
      </div>

      <Modal title={editing ? "Editar recorrência" : "Nova recorrência"} open={open} onClose={() => setOpen(false)} size="lg">
        <RecurringForm
          initial={editing ?? { ...emptyForm, cardId: store.cards[0]?.id ?? "", categoryId: store.categories[0]?.id ?? "" }}
          errors={errors}
          cards={store.cards}
          categories={store.categories}
          onSubmit={submit}
        />
      </Modal>
    </>
  );
}

function RecurringForm({
  initial,
  errors,
  cards,
  categories,
  onSubmit,
}: {
  initial: Partial<RecurringExpense> | RecurringExpenseFormValues;
  errors: FieldErrors;
  cards: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <FormGrid>
        <Field label="Descrição" error={errors.description}>
          <Input name="description" defaultValue={initial.description} placeholder="Netflix, internet, seguro" />
        </Field>
        <Field label="Valor" error={errors.amount}>
          <Input name="amount" type="number" min="0" step="0.01" defaultValue={initial.amount} />
        </Field>
        <Field label="Cartão" error={errors.cardId}>
          <Select name="cardId" defaultValue={initial.cardId}>
            {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
          </Select>
        </Field>
        <Field label="Categoria" error={errors.categoryId}>
          <Select name="categoryId" defaultValue={initial.categoryId}>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </Select>
        </Field>
        <Field label="Dia de cobrança" error={errors.chargeDay}>
          <Input name="chargeDay" type="number" min="1" max="31" defaultValue={initial.chargeDay} />
        </Field>
        <Field label="Frequência" error={errors.frequency}>
          <Select name="frequency" defaultValue={initial.frequency}>
            <option value="monthly">Mensal</option>
            <option value="yearly">Anual</option>
          </Select>
        </Field>
        <Field label="Data de início" error={errors.startDate}>
          <Input name="startDate" type="date" defaultValue={initial.startDate ? toInputDate(initial.startDate) : toInputDate(new Date())} />
        </Field>
        <Field label="Data final" error={errors.endDate}>
          <Input name="endDate" type="date" defaultValue={initial.endDate ? toInputDate(initial.endDate) : ""} />
        </Field>
      </FormGrid>
      <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-medium text-slate-700">
        <input name="active" type="checkbox" defaultChecked={initial.active ?? true} className="h-4 w-4 rounded border-slate-300 text-teal-600" />
        Recorrência ativa
      </label>
      <div className="flex justify-end">
        <Button type="submit">Salvar recorrência</Button>
      </div>
    </form>
  );
}
