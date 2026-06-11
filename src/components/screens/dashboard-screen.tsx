"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, StatCard } from "@/components/ui/page";
import { buildDashboardMetrics } from "@/lib/finance";
import { clampPercent, formatCurrency, formatDate, formatMonthYear, numberFormatter } from "@/lib/format";
import { useFinanceStore } from "@/store/use-finance-store";

const axisStyle = { fontSize: 12, fill: "#64748b" };

export function DashboardScreen() {
  const cards = useFinanceStore((state) => state.cards);
  const purchases = useFinanceStore((state) => state.purchases);
  const recurringExpenses = useFinanceStore((state) => state.recurringExpenses);
  const invoicePayments = useFinanceStore((state) => state.invoicePayments);
  const categories = useFinanceStore((state) => state.categories);
  const loadSeedData = useFinanceStore((state) => state.loadSeedData);
  const data = useMemo(
    () => ({
      cards,
      purchases,
      recurringExpenses,
      invoicePayments,
      categories,
    }),
    [cards, purchases, recurringExpenses, invoicePayments, categories],
  );
  const metrics = useMemo(() => buildDashboardMetrics(data), [data]);
  const hasCards = cards.length > 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão consolidada das faturas, limites, próximas cobranças e principais gastos."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/compras">
              <Button icon={<Plus className="h-4 w-4" />}>Nova compra</Button>
            </Link>
            <Link href="/configuracoes">
              <Button variant="secondary" icon={<Download className="h-4 w-4" />}>
                Backup
              </Button>
            </Link>
          </div>
        }
      />

      {!hasCards ? (
        <EmptyState
          title="Comece cadastrando um cartão"
          description="Você pode criar cartões manualmente ou carregar dados de exemplo para testar dashboard, faturas, compras parceladas e recorrências."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/cartoes">
                <Button>Cadastrar cartão</Button>
              </Link>
              <Button variant="secondary" onClick={() => void loadSeedData()}>
                Carregar exemplo
              </Button>
            </div>
          }
        />
      ) : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Faturas abertas" value={formatCurrency(metrics.openTotal)} helper="Inclui faturas em aberto ou vencidas" />
        <StatCard title="Faturas fechadas" value={formatCurrency(metrics.closedTotal)} helper="Aguardando pagamento" />
        <StatCard title="Pago no mês" value={formatCurrency(metrics.paidThisMonth)} helper="Total marcado como pago neste mês" tone="success" />
        <StatCard title="Previsto futuro" value={formatCurrency(metrics.forecastTotal)} helper="Parcelas e recorrências futuras" />
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Limite total" value={formatCurrency(metrics.limit.total)} />
        <StatCard title="Limite utilizado" value={formatCurrency(metrics.limit.used)} tone={metrics.limit.percent > 80 ? "danger" : "neutral"} />
        <StatCard title="Limite disponível" value={formatCurrency(metrics.limit.available)} tone="success" />
        <StatCard
          title="Uso do limite"
          value={`${numberFormatter.format(clampPercent(metrics.limit.percent))}%`}
          helper={
            metrics.nextDue
              ? `Próxima fatura: ${metrics.nextDue.cardName}, ${formatDate(metrics.nextDue.dueDate)}`
              : "Sem vencimentos próximos"
          }
          tone={metrics.limit.percent > 80 ? "danger" : metrics.limit.percent > 60 ? "warning" : "neutral"}
        />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Gastos por mês" description="Compras, parcelas e recorrências por fatura." />
          <CardBody className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickFormatter={(value) => formatMonthYear(Number(value.slice(5)), Number(value.slice(0, 4)))} tick={axisStyle} />
                <YAxis tick={axisStyle} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} labelFormatter={(label) => formatMonthYear(Number(String(label).slice(5)), Number(String(label).slice(0, 4)))} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Próxima fatura" description="Vencimento mais próximo." />
          <CardBody>
            {metrics.nextDue ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-slate-200 p-4" style={{ borderLeft: `6px solid ${metrics.nextDue.cardColor}` }}>
                  <p className="text-sm font-medium text-slate-500">{metrics.nextDue.cardName}</p>
                  <strong className="mt-1 block text-2xl text-slate-950">{formatCurrency(metrics.nextDue.total)}</strong>
                  <span className="mt-2 block text-sm text-slate-600">
                    Vence em {metrics.daysToNextDue} dia(s), em {formatDate(metrics.nextDue.dueDate)}
                  </span>
                </div>
                <Link href="/faturas">
                  <Button className="w-full" variant="secondary">
                    Ver faturas
                  </Button>
                </Link>
              </div>
            ) : (
              <EmptyState title="Sem faturas próximas" description="As próximas faturas aparecerão quando houver compras ou recorrências." />
            )}
          </CardBody>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <ChartCard title="Gastos por categoria" data={metrics.categoryChart} />
        <ChartCard title="Gastos por cartão" data={metrics.cardChart} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Próximas faturas" description="Ordenadas por vencimento." />
          <CardBody>
            <div className="space-y-3">
              {metrics.nextInvoices.length ? (
                metrics.nextInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="font-semibold text-slate-950">{invoice.cardName}</p>
                      <p className="text-sm text-slate-500">
                        {formatMonthYear(invoice.month, invoice.year)} • vence {formatDate(invoice.dueDate)}
                      </p>
                    </div>
                    <strong className="text-slate-950">{formatCurrency(invoice.total)}</strong>
                  </div>
                ))
              ) : (
                <EmptyState title="Sem faturas" description="Cadastre compras para montar a previsão." />
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Maiores compras do mês" description="Top compras lançadas no mês atual." />
          <CardBody>
            <div className="space-y-3">
              {metrics.largestPurchases.length ? (
                metrics.largestPurchases.map((purchase) => (
                  <div key={purchase.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="font-semibold text-slate-950">{purchase.description}</p>
                      <p className="text-sm text-slate-500">
                        {purchase.cardName} • {purchase.categoryName}
                      </p>
                    </div>
                    <strong className="text-slate-950">{formatCurrency(purchase.totalAmount)}</strong>
                  </div>
                ))
              ) : (
                <EmptyState title="Nenhuma compra no mês" description="As maiores compras aparecem conforme os lançamentos." />
              )}
            </div>
          </CardBody>
        </Card>
      </section>
    </>
  );
}

function ChartCard({ title, data }: { title: string; data: Array<{ name: string; value: number; color: string }> }) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody className="grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={54} outerRadius={88} paddingAngle={2}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          {data.length ? (
            data.slice(0, 6).map((entry) => (
              <div key={entry.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-slate-600">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="truncate">{entry.name}</span>
                </span>
                <strong className="shrink-0 text-slate-950">{formatCurrency(entry.value)}</strong>
              </div>
            ))
          ) : (
            <EmptyState title="Sem dados" description="Os gráficos serão preenchidos com compras e recorrências." />
          )}
        </div>
      </CardBody>
    </Card>
  );
}
