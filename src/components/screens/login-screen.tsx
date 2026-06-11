"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CloudDownload, CloudUpload, LogOut, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { Notice, PageHeader } from "@/components/ui/page";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { pullFinanceDataFromCloud, pushFinanceDataToCloud } from "@/lib/cloud/sync";
import { useFinanceStore } from "@/store/use-finance-store";

const EMAIL_COOLDOWN_SECONDS = 60;
const cooldownKey = (email: string) => `cartaocontrol-login-cooldown:${email.toLowerCase()}`;

const getFriendlyAuthError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "Não foi possível enviar o link de acesso.";
  const normalized = message.toLowerCase();
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Limite de envio de e-mails atingido no Supabase. Aguarde alguns minutos antes de tentar novamente. Para produção, configure SMTP próprio no Supabase Auth.";
  }
  return message;
};

export function LoginScreen() {
  const auth = useSupabaseAuth();
  const replaceData = useFinanceStore((state) => state.replaceData);
  const exportBackup = useFinanceStore((state) => state.exportBackup);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(0);
  const localSummary = useLocalSummary();

  const cooldownRemaining = Math.max(Math.ceil((cooldownUntil - now) / 1000), 0);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleEmailChange = (nextEmail: string) => {
    setEmail(nextEmail);
    setNow(Date.now());
    if (!nextEmail) {
      setCooldownUntil(0);
      return;
    }
    const stored = Number(localStorage.getItem(cooldownKey(nextEmail)) ?? 0);
    setCooldownUntil(Number.isFinite(stored) ? stored : 0);
  };

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    const form = new FormData(event.currentTarget);
    const submittedEmail = String(form.get("email") ?? "").trim().toLowerCase();
    if (!submittedEmail) {
      setNotice("Informe um e-mail.");
      return;
    }
    const storedCooldown = Number(localStorage.getItem(cooldownKey(submittedEmail)) ?? 0);
    if (storedCooldown > Date.now()) {
      setCooldownUntil(storedCooldown);
      setNotice(`Aguarde ${Math.ceil((storedCooldown - Date.now()) / 1000)}s antes de solicitar outro link para este e-mail.`);
      return;
    }

    try {
      setBusy(true);
      await auth.signInWithEmail(submittedEmail);
      const nextCooldown = Date.now() + EMAIL_COOLDOWN_SECONDS * 1000;
      localStorage.setItem(cooldownKey(submittedEmail), String(nextCooldown));
      setCooldownUntil(nextCooldown);
      setNotice("Enviamos um link de acesso para seu e-mail. Use o mesmo link em vez de pedir outro em cada navegador.");
    } catch (error) {
      setNotice(getFriendlyAuthError(error));
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
                  <Input
                    name="email"
                    type="email"
                    placeholder="voce@empresa.com"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => handleEmailChange(event.target.value)}
                  />
                </Field>
                <Button
                  type="submit"
                  icon={<Mail className="h-4 w-4" />}
                  disabled={busy || auth.loading || cooldownRemaining > 0}
                >
                  {cooldownRemaining > 0 ? `Aguarde ${cooldownRemaining}s` : "Enviar link de acesso"}
                </Button>
                <p className="text-sm text-slate-500">
                  O provedor padrão do Supabase tem limite baixo de e-mails. Evite pedir vários links seguidos; para produção,
                  configure SMTP próprio no Supabase Auth.
                </p>
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
