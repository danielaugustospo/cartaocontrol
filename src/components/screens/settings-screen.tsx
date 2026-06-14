"use client";

import { ChangeEvent, useEffect, useState } from "react";
import {
  Bell,
  Database,
  Download,
  FileText,
  FileUp,
  RefreshCw,
  Smartphone,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/form";
import { Notice, PageHeader } from "@/components/ui/page";
import { parseInvoiceCsv } from "@/lib/importers/invoice-csv";
import { parseSantanderInvoicePdf } from "@/lib/importers/santander-pdf";
import {
  notifyUpcomingInvoices,
  requestDueNotificationPermission,
} from "@/lib/notifications/due-notifications";
import { useFinanceStore } from "@/store/use-finance-store";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const csvFields = [
  {
    name: "descricao",
    requirement: "Obrigatório",
    details: "Nome do lançamento ou estabelecimento.",
  },
  {
    name: "valor",
    requirement: "Obrigatório",
    details: "Valor positivo. Aceita 254,90, 254.90 ou R$ 254,90.",
  },
  {
    name: "data",
    requirement: "Obrigatório",
    details: "Data da compra. Aceita dd/mm/aaaa ou aaaa-mm-dd.",
  },
  {
    name: "cartao",
    requirement: "Recomendado",
    details: "Nome, emissor ou final do cartão cadastrado. Se ficar vazio, usa o primeiro cartão.",
  },
  {
    name: "categoria",
    requirement: "Recomendado",
    details: "Nome de uma categoria cadastrada. Se não encontrar, usa Outros ou a primeira categoria.",
  },
  {
    name: "parcelas",
    requirement: "Opcional",
    details: "Quantidade de parcelas. Vazio vira 1.",
  },
  {
    name: "observacao",
    requirement: "Opcional",
    details: "Texto livre para notas da compra.",
  },
];

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

const buildExampleCsv = (cardName: string, categoryName: string) => {
  const rows = [
    ["descricao", "valor", "data", "cartao", "categoria", "parcelas", "observacao"],
    ["Supermercado Central", "254,90", "15/06/2026", cardName, categoryName, "1", "Compra do mes"],
    ["Farmacia Vida", "89,70", "18/06/2026", cardName, categoryName, "3", "Parcelado em 3 vezes"],
  ];

  return `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
};

const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function SettingsScreen() {
  const store = useFinanceStore();
  const [notice, setNotice] = useState("");
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [pdfCardId, setPdfCardId] = useState("");
  const [pdfImporting, setPdfImporting] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const financeData = {
    cards: store.cards,
    purchases: store.purchases,
    recurringExpenses: store.recurringExpenses,
    invoicePayments: store.invoicePayments,
    categories: store.categories,
  };
  const defaultImportCategory =
    store.categories.find((category) => normalize(category.name) === "outros") ?? store.categories[0];
  const selectedPdfCardId = pdfCardId || store.cards[0]?.id || "";

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
      setNotice("Backup importado com sucesso. Se você estiver logado neste navegador, os dados serão enviados automaticamente para a nuvem.");
    } catch (error) {
      console.error(error);
      setNotice("Arquivo inválido. O backup não foi importado.");
    } finally {
      event.target.value = "";
    }
  };

  const importCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!window.confirm("Importar este CSV criará compras novas a partir das linhas válidas. Continuar?")) return;

    try {
      const result = parseInvoiceCsv(await file.text(), store.cards, store.categories);
      for (const purchase of result.purchases) {
        await store.addPurchase(purchase);
      }
      const warningText = result.warnings.length ? ` Avisos: ${result.warnings.slice(0, 3).join(" ")}` : "";
      setNotice(`${result.purchases.length} compra(s) importada(s) do CSV.${warningText}`);
    } catch (error) {
      console.error(error);
      setNotice("Não foi possível importar o CSV.");
    } finally {
      event.target.value = "";
    }
  };

  const downloadCsvExample = () => {
    const cardName = store.cards[0]?.name ?? "Cartao Principal";
    const categoryName = store.categories[0]?.name ?? "Alimentacao";
    const blob = new Blob([buildExampleCsv(cardName, categoryName)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cartaocontrol-importacao-fatura-exemplo.csv";
    link.click();
    URL.revokeObjectURL(url);
    setNotice("CSV de exemplo baixado.");
  };

  const importSantanderPdf = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const cardId = selectedPdfCardId;
    if (!cardId) {
      setNotice("Cadastre ou selecione um cartão antes de importar PDF.");
      event.target.value = "";
      return;
    }
    if (!defaultImportCategory) {
      setNotice("Cadastre ao menos uma categoria antes de importar PDF.");
      event.target.value = "";
      return;
    }
    if (!window.confirm(`Importar ${files.length} PDF(s) criará compras novas no cartão selecionado. Continuar?`)) {
      event.target.value = "";
      return;
    }

    setPdfImporting(true);
    try {
      let importedCount = 0;
      const invoiceLabels: string[] = [];
      const warnings: string[] = [];

      for (const file of files) {
        const result = await parseSantanderInvoicePdf(file, {
          cardId,
          categoryId: defaultImportCategory.id,
        });
        for (const purchase of result.purchases) {
          await store.addPurchase(purchase);
        }
        importedCount += result.purchases.length;
        if (result.invoice) invoiceLabels.push(`${file.name}: ${String(result.invoice.month).padStart(2, "0")}/${result.invoice.year}`);
        warnings.push(...result.warnings.map((warning) => `${file.name}: ${warning}`));
      }

      const invoiceText = invoiceLabels.length ? ` Faturas: ${invoiceLabels.join("; ")}.` : "";
      const warningText = warnings.length ? ` Avisos: ${warnings.slice(0, 3).join(" ")}` : "";
      setNotice(`${importedCount} compra(s) importada(s) de PDF.${invoiceText}${warningText}`);
    } catch (error) {
      console.error(error);
      setNotice("Não foi possível importar o PDF. Verifique se o arquivo é uma fatura Santander com texto selecionável.");
    } finally {
      setPdfImporting(false);
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

  const enableNotifications = async () => {
    const permission = await requestDueNotificationPermission();
    if (permission === "unsupported") {
      setNotice("Este navegador não suporta notificações locais.");
      return;
    }
    if (permission !== "granted") {
      setNotice("Permissão de notificações não concedida.");
      return;
    }
    const sent = notifyUpcomingInvoices(financeData);
    setNotice(sent ? `${sent} notificação(ões) enviada(s).` : "Notificações ativadas. Não há faturas vencendo nos próximos dias.");
  };

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Backup local, importação, manutenção dos dados, notificações e opções de instalação do PWA."
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
          <CardHeader title="Importar PDF de fatura Santander" description="Carregue a fatura direto do PDF e vincule tudo a um cartão cadastrado." />
          <CardBody className="space-y-3">
            <Field label="Cartão que receberá a fatura">
              <Select value={selectedPdfCardId} onChange={(event) => setPdfCardId(event.target.value)}>
                {store.cards.length ? (
                  store.cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)
                ) : (
                  <option value="">Cadastre um cartão primeiro</option>
                )}
              </Select>
            </Field>
            <label className="inline-flex min-h-10 w-full cursor-pointer items-center justify-start gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
              <FileText className="h-4 w-4" />
              {pdfImporting ? "Importando PDF..." : "Importar PDF Santander"}
              <input
                type="file"
                accept=".pdf,application/pdf"
                multiple
                className="hidden"
                disabled={pdfImporting}
                onChange={(event) => void importSantanderPdf(event)}
              />
            </label>
            <p className="text-sm text-slate-600">
              Todo o conteúdo do PDF será tratado como uma única fatura do cartão selecionado. Cartões adicionais listados dentro da fatura Santander não criam cartões separados.
            </p>
            <p className="text-sm text-slate-500">
              As compras entram na categoria {defaultImportCategory ? `"${defaultImportCategory.name}"` : "padrão"} e ficam presas ao mês de vencimento identificado no PDF.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Importar CSV de fatura" description="Crie compras a partir de um arquivo CSV exportado pelo banco." />
          <CardBody className="space-y-3">
            <label className="inline-flex min-h-10 w-full cursor-pointer items-center justify-start gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
              <FileUp className="h-4 w-4" />
              Importar CSV
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => void importCsv(event)} />
            </label>
            <Button className="w-full justify-start" variant="secondary" icon={<Download className="h-4 w-4" />} onClick={downloadCsvExample}>
              Baixar CSV de exemplo
            </Button>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">Campos aceitos no CSV</p>
              <p className="mt-1 text-sm text-slate-600">
                O arquivo pode usar ponto e vírgula ou vírgula como separador. Antes de importar, cadastre ao menos um cartão e uma categoria.
              </p>
              <dl className="mt-3 grid gap-2">
                {csvFields.map((field) => (
                  <div key={field.name} className="grid gap-1 rounded-md bg-white p-2 text-sm sm:grid-cols-[7rem_6rem_1fr] sm:items-start">
                    <dt className="font-semibold text-slate-950">{field.name}</dt>
                    <dd className="text-xs font-semibold uppercase text-teal-700">{field.requirement}</dd>
                    <dd className="text-slate-600">{field.details}</dd>
                  </div>
                ))}
              </dl>
            </div>
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
          <CardHeader title="Notificações" description="Alertas locais para faturas próximas do vencimento." />
          <CardBody className="space-y-3">
            <Button className="w-full justify-start" icon={<Bell className="h-4 w-4" />} onClick={() => void enableNotifications()}>
              Ativar notificações de vencimento
            </Button>
            <p className="text-sm text-slate-500">
              Nesta versão, as notificações funcionam localmente quando o navegador permite e o app é aberto.
            </p>
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
          <CardHeader title="Arquitetura futura" description="A persistência foi isolada para permitir troca por tabelas relacionais." />
          <CardBody>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex gap-2"><RefreshCw className="mt-0.5 h-4 w-4 text-teal-700" /> Supabase Auth e sincronização em nuvem por usuário.</li>
              <li className="flex gap-2"><RefreshCw className="mt-0.5 h-4 w-4 text-teal-700" /> Normalização futura em PostgreSQL para multiusuário.</li>
              <li className="flex gap-2"><RefreshCw className="mt-0.5 h-4 w-4 text-teal-700" /> Leitura de e-mails exigirá OAuth/IMAP e backend seguro.</li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
