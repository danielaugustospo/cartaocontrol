"use client";

import { FormEvent, useMemo, useState } from "react";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormGrid, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Notice, PageHeader } from "@/components/ui/page";
import { zodToFieldErrors, type FieldErrors } from "@/components/forms/form-utils";
import { calculateCardLimitUsage } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import { cardSchema, type CardFormValues } from "@/lib/validation";
import { useFinanceStore } from "@/store/use-finance-store";
import type { CreditCard } from "@/types/finance";

const emptyForm: CardFormValues = {
  name: "",
  issuer: "",
  brand: "Visa",
  lastDigits: "",
  limit: 0,
  closingDay: 20,
  dueDay: 28,
  color: "#0f766e",
  active: true,
};

export function CardsScreen() {
  const store = useFinanceStore();
  const [editing, setEditing] = useState<CreditCard | null>(null);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState("");
  const data = useMemo(
    () => ({
      cards: store.cards,
      purchases: store.purchases,
      recurringExpenses: store.recurringExpenses,
      invoicePayments: store.invoicePayments,
      categories: store.categories,
    }),
    [store.cards, store.purchases, store.recurringExpenses, store.invoicePayments, store.categories],
  );

  const startCreate = () => {
    setEditing(null);
    setErrors({});
    setOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = cardSchema.safeParse({
      name: form.get("name"),
      issuer: form.get("issuer"),
      brand: form.get("brand"),
      lastDigits: form.get("lastDigits"),
      limit: form.get("limit"),
      closingDay: form.get("closingDay"),
      dueDay: form.get("dueDay"),
      color: form.get("color"),
      active: form.get("active") === "on",
    });
    if (!parsed.success) {
      setErrors(zodToFieldErrors(parsed.error));
      return;
    }
    if (editing) {
      await store.updateCard(editing.id, parsed.data);
      setNotice("Cartão atualizado.");
    } else {
      await store.addCard(parsed.data);
      setNotice("Cartão criado.");
    }
    setOpen(false);
  };

  const remove = async (card: CreditCard) => {
    const linkedPurchases = store.purchases.filter((purchase) => purchase.cardId === card.id).length;
    const linkedRecurring = store.recurringExpenses.filter((recurring) => recurring.cardId === card.id).length;
    const message =
      linkedPurchases || linkedRecurring
        ? `Este cartão possui ${linkedPurchases} compra(s) e ${linkedRecurring} recorrência(s) vinculada(s). Excluir mesmo assim? As faturas históricas vinculadas podem deixar de aparecer.`
        : "Excluir este cartão?";
    if (!window.confirm(message)) return;
    await store.deleteCard(card.id);
    setNotice("Cartão excluído.");
  };

  return (
    <>
      <PageHeader
        title="Cartões"
        description="Cadastre limites, fechamento, vencimento e status dos cartões."
        action={<Button icon={<Plus className="h-4 w-4" />} onClick={startCreate}>Novo cartão</Button>}
      />
      {notice ? <Notice>{notice}</Notice> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {store.cards.length ? (
          store.cards.map((card) => {
            const usage = calculateCardLimitUsage(data, card.id);
            return (
              <Card key={card.id} className="overflow-hidden">
                <div className="h-2" style={{ backgroundColor: card.color }} />
                <CardBody>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{card.issuer} • {card.brand}</p>
                      <h2 className="mt-1 text-xl font-bold text-slate-950">{card.name}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {card.lastDigits ? `Final ${card.lastDigits} • ` : ""}Fecha dia {card.closingDay}, vence dia {card.dueDay}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {card.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <Metric label="Limite" value={formatCurrency(card.limit)} />
                    <Metric label="Usado" value={formatCurrency(usage.used)} />
                    <Metric label="Disponível" value={formatCurrency(usage.available)} />
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-teal-600" style={{ width: `${Math.min(usage.percent, 100)}%` }} />
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      icon={<Edit2 className="h-4 w-4" />}
                      onClick={() => {
                        setEditing(card);
                        setErrors({});
                        setOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button variant="ghost" icon={<Trash2 className="h-4 w-4" />} onClick={() => void remove(card)}>
                      Excluir
                    </Button>
                  </div>
                </CardBody>
              </Card>
            );
          })
        ) : (
          <EmptyState
            title="Nenhum cartão cadastrado"
            description="Crie seu primeiro cartão para lançar compras, recorrências e faturas."
            action={<Button onClick={startCreate}>Cadastrar cartão</Button>}
          />
        )}
      </div>

      <Modal title={editing ? "Editar cartão" : "Novo cartão"} open={open} onClose={() => setOpen(false)}>
        <CardForm initial={editing ?? emptyForm} errors={errors} onSubmit={submit} />
      </Modal>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <strong className="mt-1 block text-sm text-slate-950">{value}</strong>
    </div>
  );
}

function CardForm({
  initial,
  errors,
  onSubmit,
}: {
  initial: Partial<CreditCard> | CardFormValues;
  errors: FieldErrors;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <FormGrid>
        <Field label="Nome do cartão" error={errors.name}>
          <Input name="name" defaultValue={initial.name} placeholder="Roxo Platinum" />
        </Field>
        <Field label="Banco/emissor" error={errors.issuer}>
          <Input name="issuer" defaultValue={initial.issuer} placeholder="Nubank, Itaú, Santander" />
        </Field>
        <Field label="Bandeira" error={errors.brand}>
          <Select name="brand" defaultValue={initial.brand}>
            <option>Visa</option>
            <option>Mastercard</option>
            <option>Elo</option>
            <option>American Express</option>
            <option>Outros</option>
          </Select>
        </Field>
        <Field label="Últimos 4 dígitos" error={errors.lastDigits}>
          <Input name="lastDigits" maxLength={4} defaultValue={initial.lastDigits} placeholder="1234" />
        </Field>
        <Field label="Limite total" error={errors.limit}>
          <Input name="limit" type="number" min="0" step="0.01" defaultValue={initial.limit} />
        </Field>
        <Field label="Cor do cartão" error={errors.color}>
          <Input name="color" type="color" defaultValue={initial.color} />
        </Field>
        <Field label="Dia de fechamento" error={errors.closingDay}>
          <Input name="closingDay" type="number" min="1" max="31" defaultValue={initial.closingDay} />
        </Field>
        <Field label="Dia de vencimento" error={errors.dueDay}>
          <Input name="dueDay" type="number" min="1" max="31" defaultValue={initial.dueDay} />
        </Field>
      </FormGrid>
      <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-medium text-slate-700">
        <input name="active" type="checkbox" defaultChecked={initial.active ?? true} className="h-4 w-4 rounded border-slate-300 text-teal-600" />
        Cartão ativo
      </label>
      <div className="flex justify-end gap-2">
        <Button type="submit">Salvar cartão</Button>
      </div>
    </form>
  );
}
