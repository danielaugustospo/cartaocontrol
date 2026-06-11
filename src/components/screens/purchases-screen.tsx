"use client";

import { FormEvent, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Edit2, Plus, Search, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Notice, PageHeader } from "@/components/ui/page";
import { zodToFieldErrors, type FieldErrors } from "@/components/forms/form-utils";
import { generatePurchaseInstallments } from "@/lib/finance";
import { formatCurrency, formatDate, formatMonthYear, toInputDate } from "@/lib/format";
import { purchaseSchema, type PurchaseFormValues } from "@/lib/validation";
import { useFinanceStore } from "@/store/use-finance-store";
import type { Purchase } from "@/types/finance";

const emptyForm: PurchaseFormValues = {
  description: "",
  totalAmount: 0,
  purchaseDate: toInputDate(new Date()),
  cardId: "",
  categoryId: "",
  type: "single",
  installments: 1,
  notes: "",
  status: "active",
};

export function PurchasesScreen() {
  const store = useFinanceStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    cardId: "all",
    categoryId: "all",
    month: format(new Date(), "yyyy-MM"),
    status: "all",
    onlyInstallments: false,
  });

  const cardById = useMemo(() => new Map(store.cards.map((card) => [card.id, card])), [store.cards]);
  const categoryById = useMemo(() => new Map(store.categories.map((category) => [category.id, category])), [store.categories]);
  const purchases = useMemo(() => {
    return store.purchases
      .filter((purchase) => purchase.description.toLowerCase().includes(filters.search.toLowerCase()))
      .filter((purchase) => filters.cardId === "all" || purchase.cardId === filters.cardId)
      .filter((purchase) => filters.categoryId === "all" || purchase.categoryId === filters.categoryId)
      .filter((purchase) => filters.status === "all" || purchase.status === filters.status)
      .filter((purchase) => !filters.onlyInstallments || purchase.type === "installment")
      .filter((purchase) => {
        if (!filters.month) return true;
        return format(parseISO(purchase.purchaseDate), "yyyy-MM") === filters.month;
      })
      .sort((a, b) => parseISO(b.purchaseDate).getTime() - parseISO(a.purchaseDate).getTime());
  }, [filters, store.purchases]);

  const startCreate = () => {
    setEditing(null);
    setErrors({});
    setOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const type = String(form.get("type")) as "single" | "installment";
    const parsed = purchaseSchema.safeParse({
      description: form.get("description"),
      totalAmount: form.get("totalAmount"),
      purchaseDate: form.get("purchaseDate"),
      cardId: form.get("cardId"),
      categoryId: form.get("categoryId"),
      type,
      installments: type === "single" ? 1 : form.get("installments"),
      notes: form.get("notes"),
      status: form.get("status"),
    });
    if (!parsed.success) {
      setErrors(zodToFieldErrors(parsed.error));
      return;
    }
    if (editing) {
      await store.updatePurchase(editing.id, parsed.data);
      setNotice("Compra atualizada e parcelas recalculadas.");
    } else {
      await store.addPurchase(parsed.data);
      setNotice("Compra cadastrada.");
    }
    setOpen(false);
  };

  const cancel = async (purchase: Purchase) => {
    if (!window.confirm("Cancelar esta compra? Ela sairá das faturas, mas continuará no histórico.")) return;
    await store.cancelPurchase(purchase.id);
    setNotice("Compra cancelada.");
  };

  const remove = async (purchase: Purchase) => {
    if (!window.confirm("Excluir definitivamente esta compra?")) return;
    await store.deletePurchase(purchase.id);
    setNotice("Compra excluída.");
  };

  return (
    <>
      <PageHeader
        title="Compras"
        description="Lance compras à vista e parceladas. As parcelas entram automaticamente nas faturas corretas."
        action={<Button icon={<Plus className="h-4 w-4" />} onClick={startCreate}>Nova compra</Button>}
      />
      {notice ? <Notice>{notice}</Notice> : null}

      <Card className="mb-4">
        <CardBody className="grid gap-3 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr_auto]">
          <Field label="Buscar">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input className="pl-9" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Descrição" />
            </div>
          </Field>
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
          <Field label="Mês">
            <Input type="month" value={filters.month} onChange={(event) => setFilters({ ...filters, month: event.target.value })} />
          </Field>
          <Field label="Status">
            <Select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="all">Todos</option>
              <option value="active">Ativas</option>
              <option value="canceled">Canceladas</option>
            </Select>
          </Field>
          <label className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={filters.onlyInstallments} onChange={(event) => setFilters({ ...filters, onlyInstallments: event.target.checked })} />
            Parceladas
          </label>
        </CardBody>
      </Card>

      <div className="space-y-3">
        {purchases.length ? (
          purchases.map((purchase) => {
            const card = cardById.get(purchase.cardId);
            const category = categoryById.get(purchase.categoryId);
            const installments = card ? generatePurchaseInstallments(purchase, card) : [];
            const nextInstallment = installments.find((installment) => new Date(installment.dueYear, installment.dueMonth - 1, 1) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)) ?? installments.at(-1);
            return (
              <Card key={purchase.id}>
                <CardBody>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-lg font-bold text-slate-950">{purchase.description}</h2>
                        <Badge variant={purchase.status === "active" ? "success" : "danger"}>{purchase.status === "active" ? "Ativa" : "Cancelada"}</Badge>
                        <Badge variant={purchase.type === "installment" ? "info" : "neutral"}>{purchase.type === "installment" ? `${purchase.installments}x` : "À vista"}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(purchase.purchaseDate)} • {card?.name ?? "Cartão removido"} • {category?.name ?? "Sem categoria"}
                      </p>
                      {purchase.type === "installment" && nextInstallment ? (
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          Próxima: Parcela {nextInstallment.installmentNumber}/{nextInstallment.totalInstallments} em {formatMonthYear(nextInstallment.dueMonth, nextInstallment.dueYear)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <strong className="text-xl text-slate-950">{formatCurrency(purchase.totalAmount)}</strong>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" icon={<Edit2 className="h-4 w-4" />} onClick={() => { setEditing(purchase); setErrors({}); setOpen(true); }}>Editar</Button>
                        {purchase.status === "active" ? <Button variant="ghost" icon={<XCircle className="h-4 w-4" />} onClick={() => void cancel(purchase)}>Cancelar</Button> : null}
                        <Button variant="ghost" icon={<Trash2 className="h-4 w-4" />} onClick={() => void remove(purchase)}>Excluir</Button>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })
        ) : (
          <EmptyState
            title="Nenhuma compra encontrada"
            description="Cadastre compras para gerar faturas, dashboards e previsão de limite."
            action={<Button onClick={startCreate}>Cadastrar compra</Button>}
          />
        )}
      </div>

      <Modal title={editing ? "Editar compra" : "Nova compra"} open={open} onClose={() => setOpen(false)} size="lg">
        <PurchaseForm
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

function PurchaseForm({
  initial,
  errors,
  cards,
  categories,
  onSubmit,
}: {
  initial: Partial<Purchase> | PurchaseFormValues;
  errors: FieldErrors;
  cards: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <FormGrid>
        <Field label="Descrição" error={errors.description}>
          <Input name="description" defaultValue={initial.description} placeholder="Supermercado, notebook, viagem" />
        </Field>
        <Field label="Valor total" error={errors.totalAmount}>
          <Input name="totalAmount" type="number" min="0" step="0.01" defaultValue={initial.totalAmount} />
        </Field>
        <Field label="Data da compra" error={errors.purchaseDate}>
          <Input name="purchaseDate" type="date" defaultValue={initial.purchaseDate ? toInputDate(initial.purchaseDate) : toInputDate(new Date())} />
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
        <Field label="Tipo" error={errors.type}>
          <Select name="type" defaultValue={initial.type}>
            <option value="single">À vista</option>
            <option value="installment">Parcelada</option>
          </Select>
        </Field>
        <Field label="Número de parcelas" error={errors.installments}>
          <Input name="installments" type="number" min="1" max="120" defaultValue={initial.installments ?? 1} />
        </Field>
        <Field label="Status" error={errors.status}>
          <Select name="status" defaultValue={initial.status ?? "active"}>
            <option value="active">Ativa</option>
            <option value="canceled">Cancelada</option>
          </Select>
        </Field>
      </FormGrid>
      <Field label="Observação" error={errors.notes}>
        <Textarea name="notes" defaultValue={initial.notes} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit">Salvar compra</Button>
      </div>
    </form>
  );
}
