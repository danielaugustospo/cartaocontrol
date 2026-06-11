"use client";

import { FormEvent, useState } from "react";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormGrid, Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Notice, PageHeader } from "@/components/ui/page";
import { zodToFieldErrors, type FieldErrors } from "@/components/forms/form-utils";
import { defaultCategoryColors } from "@/data/default-categories";
import { categorySchema, type CategoryFormValues } from "@/lib/validation";
import { useFinanceStore } from "@/store/use-finance-store";
import type { Category } from "@/types/finance";

const emptyForm: CategoryFormValues = { name: "", color: "#0f766e" };

export function CategoriesScreen() {
  const store = useFinanceStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = categorySchema.safeParse({
      name: form.get("name"),
      color: form.get("color"),
    });
    if (!parsed.success) {
      setErrors(zodToFieldErrors(parsed.error));
      return;
    }
    if (editing) {
      await store.updateCategory(editing.id, parsed.data);
      setNotice("Categoria atualizada.");
    } else {
      await store.addCategory(parsed.data);
      setNotice("Categoria criada.");
    }
    setOpen(false);
  };

  const remove = async (category: Category) => {
    const linkedPurchases = store.purchases.filter((purchase) => purchase.categoryId === category.id).length;
    const linkedRecurring = store.recurringExpenses.filter((recurring) => recurring.categoryId === category.id).length;
    const message =
      linkedPurchases || linkedRecurring
        ? `Esta categoria possui ${linkedPurchases} compra(s) e ${linkedRecurring} recorrência(s). Excluir mesmo assim?`
        : "Excluir esta categoria?";
    if (!window.confirm(message)) return;
    await store.deleteCategory(category.id);
    setNotice("Categoria excluída.");
  };

  return (
    <>
      <PageHeader
        title="Categorias"
        description="Organize seus gastos por cor e tipo de despesa."
        action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => { setEditing(null); setErrors({}); setOpen(true); }}>Nova categoria</Button>}
      />
      {notice ? <Notice>{notice}</Notice> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {store.categories.length ? (
          store.categories.map((category) => (
            <Card key={category.id}>
              <CardBody>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="h-10 w-10 shrink-0 rounded-lg" style={{ backgroundColor: category.color }} />
                    <div className="min-w-0">
                      <h2 className="truncate font-bold text-slate-950">{category.name}</h2>
                      <p className="text-xs text-slate-500">{category.color}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" className="h-9 w-9 px-0" aria-label="Editar" onClick={() => { setEditing(category); setErrors({}); setOpen(true); }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" className="h-9 w-9 px-0" aria-label="Excluir" onClick={() => void remove(category)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))
        ) : (
          <EmptyState title="Sem categorias" description="Crie categorias para segmentar relatórios e filtros." />
        )}
      </div>
      <Modal title={editing ? "Editar categoria" : "Nova categoria"} open={open} onClose={() => setOpen(false)}>
        <CategoryForm initial={editing ?? emptyForm} errors={errors} onSubmit={submit} />
      </Modal>
    </>
  );
}

function CategoryForm({
  initial,
  errors,
  onSubmit,
}: {
  initial: Partial<Category> | CategoryFormValues;
  errors: FieldErrors;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <FormGrid>
        <Field label="Nome" error={errors.name}>
          <Input name="name" defaultValue={initial.name} placeholder="Pets, impostos, academia" />
        </Field>
        <Field label="Cor" error={errors.color}>
          <Input name="color" type="color" defaultValue={initial.color} />
        </Field>
      </FormGrid>
      <div className="flex flex-wrap gap-2">
        {defaultCategoryColors.map((color) => (
          <button
            key={color}
            type="button"
            className="h-8 w-8 rounded-full border border-white shadow ring-1 ring-slate-200"
            style={{ backgroundColor: color }}
            aria-label={`Usar cor ${color}`}
            onClick={(event) => {
              const form = event.currentTarget.closest("form");
              const input = form?.querySelector<HTMLInputElement>('input[name="color"]');
              if (input) input.value = color;
            }}
          />
        ))}
      </div>
      <div className="flex justify-end">
        <Button type="submit">Salvar categoria</Button>
      </div>
    </form>
  );
}
