import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">CartãoControl</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  title,
  value,
  helper,
  tone = "neutral",
}: {
  title: string;
  value: string;
  helper?: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const tones = {
    neutral: "border-slate-200",
    success: "border-emerald-200 bg-emerald-50/60",
    warning: "border-amber-200 bg-amber-50/70",
    danger: "border-rose-200 bg-rose-50/70",
  };

  return (
    <div className={cn("rounded-lg border bg-white p-4 shadow-sm", tones[tone])}>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <strong className="mt-2 block text-2xl font-bold text-slate-950">{value}</strong>
      {helper ? <span className="mt-2 block text-xs font-medium text-slate-500">{helper}</span> : null}
    </div>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">{children}</div>;
}
