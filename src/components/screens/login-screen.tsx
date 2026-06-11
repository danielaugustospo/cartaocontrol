"use client";

import { FormEvent, useMemo, useState } from "react";
import { CloudDownload, CloudUpload, LogOut, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { Notice, PageHeader } from "@/components/ui/page";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { pullFinanceDataFromCloud, pushFinanceDataToCloud } from "@/lib/cloud/sync";
import { useFinanceStore } from "@/store/use-finance-store";

export function LoginScreen() {
  const auth = useSupabaseAuth();
  const replaceData = useFinanceStore((state) => state.replaceData);
  const exportBackup = useFinanceStore((state) => state.exportBackup);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const localSummary = useLocalSummary();

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    if (!email) {
      setNotice("Informe um e-mail.");
      return;
    }
    try {
      setBusy(true);
      await auth.signInWithEmail(email);
      setNotice("Enviamos um link de acesso para seu e-mail.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível enviar o link de acesso.");
    } finally {
      setBusy(false);
    }
  };

  const pushCloud = async () => {
    if (!auth.user) return;
    if (!window.confirm("Enviar os dados locais para a nuvem e substituir o backup remoto atual?")) return;
    try {
      setBusy(true);
      const result = await pushFinanceDataToCloud(auth.user.id, exportBackup().data);
      setNotice(`Dados enviados para a nuvem${result.updatedAt ? ` em ${new Date(result.updatedAt).toLocaleString("pt-BR")}` : ""}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Falha ao enviar dados para a nuvem.");
    } finally {
      setBusy(false);
    }
  };

  const pullCloud = async () => {
    if (!auth.user) return;
    if (!window.confirm("Baixar os dados da nuvem substituirá os dados locais deste navegador. Continuar?")) return;
    try {
      setBusy(true);
      const cloudData = await pullFinanceDataFromCloud(auth.user.id);
      if (!cloudData) {
        setNotice("Ainda não há backup salvo na nuvem para este usuário.");
        return;
      }
      await replaceData(cloudData);
      setNotice("Dados baixados da nuvem e aplicados neste navegador.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Falha ao baixar dados da nuvem.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Conta e sincronização"
        description="Login opcional com Supabase para salvar um backup em nuvem por usuário."
      />
      {notice ? <Notice>{notice}</Notice> : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader title="Login" description="Autenticação por magic link, sem senha." />
          <CardBody className="space-y-4">
            {!auth.configured ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Supabase ainda não está configurado. O app segue funcionando em modo local. Para habilitar login na Vercel,
                configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
              </div>
            ) : auth.user ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                    <ShieldCheck className="h-4 w-4" />
                    Usuário conectado
                  </p>
                  <p className="mt-1 text-sm text-emerald-700">{auth.user.email}</p>
                </div>
                <Button variant="secondary" icon={<LogOut className="h-4 w-4" />} onClick={() => void auth.signOut()} disabled={busy}>
                  Sair
                </Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={submitLogin}>
                <Field label="E-mail">
                  <Input name="email" type="email" placeholder="voce@empresa.com" autoComplete="email" />
                </Field>
                <Button type="submit" icon={<Mail className="h-4 w-4" />} disabled={busy || auth.loading}>
                  Enviar link de acesso
                </Button>
              </form>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Sincronização em nuvem" description="Backup remoto simples, uma cópia JSON por usuário." />
          <CardBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Summary label="Cartões" value={localSummary.cards} />
              <Summary label="Compras" value={localSummary.purchases} />
              <Summary label="Recorrências" value={localSummary.recurringExpenses} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                icon={<CloudUpload className="h-4 w-4" />}
                disabled={!auth.user || busy}
                onClick={() => void pushCloud()}
              >
                Enviar para nuvem
              </Button>
              <Button
                variant="secondary"
                icon={<CloudDownload className="h-4 w-4" />}
                disabled={!auth.user || busy}
                onClick={() => void pullCloud()}
              >
                Baixar da nuvem
              </Button>
            </div>
            <p className="text-sm text-slate-500">
              Esta etapa não substitui o backup JSON local. Ela cria uma base para sincronização em nuvem enquanto o modelo
              relacional completo não é normalizado.
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function useLocalSummary() {
  const cards = useFinanceStore((state) => state.cards.length);
  const purchases = useFinanceStore((state) => state.purchases.length);
  const recurringExpenses = useFinanceStore((state) => state.recurringExpenses.length);

  return useMemo(() => ({ cards, purchases, recurringExpenses }), [cards, purchases, recurringExpenses]);
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <strong className="mt-1 block text-2xl text-slate-950">{value}</strong>
    </div>
  );
}
