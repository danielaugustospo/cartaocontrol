"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  Home,
  ReceiptText,
  Settings,
  Tags,
  UserRound,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useFinanceStore } from "@/store/use-finance-store";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/compras", label: "Compras", icon: ReceiptText },
  { href: "/recorrencias", label: "Recorrências", icon: CalendarDays },
  { href: "/faturas", label: "Faturas", icon: WalletCards },
  { href: "/categorias", label: "Categorias", icon: Tags },
  { href: "/login", label: "Conta", icon: UserRound },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const load = useFinanceStore((state) => state.load);
  const hydrated = useFinanceStore((state) => state.hydrated);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 bg-white p-5 lg:block">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-white">
            <Home className="h-5 w-5" />
          </span>
          <span>
            <strong className="block text-lg">CartãoControl</strong>
            <span className="text-xs text-slate-500">Finanças de cartão</span>
          </span>
        </Link>
        <nav className="mt-8 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 transition",
                  active ? "bg-teal-50 text-teal-700" : "hover:bg-slate-100 hover:text-slate-950",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="min-h-screen pb-24 lg:pl-72">
        <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          {!hydrated ? (
            <div className="grid min-h-[60vh] place-items-center text-sm font-medium text-slate-500">
              Carregando dados locais...
            </div>
          ) : (
            children
          )}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white px-2 py-2 shadow-lg lg:hidden">
        {nav.slice(0, 5).map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-semibold",
                active ? "bg-teal-50 text-teal-700" : "text-slate-500",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
