"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { Database, Download, RefreshCw, Smartphone, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Notice, PageHeader } from "@/components/ui/page";
import { useFinanceStore } from "@/store/use-finance-store";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function SettingsScreen() {
  const store = useFinanceStore();
  const [notice, setNotice] = useState("");
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const exportBackup = () => {
    const backup = store.exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cartaocontrol-backup-${backup.exportedAt.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Backup exportado.");
  };

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!window.confirm("Importar este backup substituirá todos os dados locais atuais. Continuar?")) return;

    try {
      const json = JSON.parse(await file.text());
      await store.importBackup(json);
      setNotice("Backup importado com sucesso.");
    } catch (error) {
      console.error(error);
      setNotice("Arquivo inválido. O backup não foi importado.");
    } finally {
      event.target.value = "";
    }
  };

  const clearData = async () => {
    const confirmation = window.prompt('Digite "LIMPAR" para apagar todos os dados locais.');
    if (confirmation !== "LIMPAR") return;
    await store.resetData();
    setNotice("Dados locais limpos.");
  };

  const loadSeed = async () => {
    if (!window.confirm("Carregar dados de exemplo substituirá os dados atuais. Continuar?")) return;
    await store.loadSeedData();
    setNotice("Dados de exemplo carregados.");
  };

  const install = async () => {
    if (!installPrompt) {
      setNotice("Se o botão de instalação do navegador não aparecer, use o menu do navegador e escolha Adicionar à tela inicial.");
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setNotice(choice.outcome === "accepted" ? "Instalação iniciada." : "Instalação cancelada.");
  };

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Backup local, manutenção dos dados e opções de instalação do PWA."
      />
      {notice ? <Notice>{notice}</Notice> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Backup" description="Exporte e importe todos os dados locais em JSON." />
          <CardBody className="space-y-3">
            <Button className="w-full justify-start" icon={<Download className="h-4 w-4" />} onClick={exportBackup}>
              Exportar backup
            </Button>
            <label className="inline-flex min-h-10 w-full cursor-pointer items-center justify-start gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
              <Upload className="h-4 w-4" />
              Importar backup
              <input type="file" accept="application/json" className="hidden" onChange={(event) => void importBackup(event)} />
            </label>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Dados de exemplo" description="Carregue cartões, compras, parcelas, recorrências e faturas para teste." />
          <CardBody className="space-y-3">
            <Button className="w-full justify-start" variant="secondary" icon={<Database className="h-4 w-4" />} onClick={() => void loadSeed()}>
              Carregar dados de exemplo
            </Button>
            <Button className="w-full justify-start" variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => void clearData()}>
              Limpar dados
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="PWA" description="Instale o CartãoControl no celular ou desktop para acesso rápido." />
          <CardBody className="space-y-3">
            <p className="text-sm text-slate-600">
              O app possui manifest, ícones e service worker básico. Depois do primeiro acesso, parte dos arquivos principais fica em cache para uso offline parcial.
            </p>
            <Button className="w-full justify-start" icon={<Smartphone className="h-4 w-4" />} onClick={() => void install()}>
              Adicionar à tela inicial
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Arquitetura futura" description="A persistência foi isolada para permitir troca por Supabase ou PostgreSQL." />
          <CardBody>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex gap-2"><RefreshCw className="mt-0.5 h-4 w-4 text-teal-700" /> Login e sincronização em nuvem.</li>
              <li className="flex gap-2"><RefreshCw className="mt-0.5 h-4 w-4 text-teal-700" /> Multiusuário e compartilhamento de cartões.</li>
              <li className="flex gap-2"><RefreshCw className="mt-0.5 h-4 w-4 text-teal-700" /> Notificações de vencimento e importação de CSV.</li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
