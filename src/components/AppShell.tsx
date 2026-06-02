"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  Compass,
  Database,
  Home as HomeIcon,
  LineChart,
  Plus,
  Sparkles,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match?: (pathname: string) => boolean;
};

const NAV: NavItem[] = [
  { href: "/", label: "Início", icon: HomeIcon, match: (p) => p === "/" },
  {
    href: "/objetivos",
    label: "Objetivos",
    icon: LineChart,
    match: (p) => p === "/objetivos" || p.startsWith("/objetivos/"),
  },
  { href: "/dimensoes", label: "Dimensões", icon: Compass, match: (p) => p.startsWith("/dimensoes") },
  { href: "/dados", label: "Dados", icon: Database, match: (p) => p.startsWith("/dados") },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="sticky top-0 z-10 hidden h-screen flex-col gap-1 border-r border-[var(--border)] bg-[var(--surface)] p-4 md:flex">
        <div className="mb-4 flex items-center gap-2 px-2 py-1">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-[var(--accent)] text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="text-sm font-semibold tracking-tight">RBBT Operator</div>
        </div>

        <Link
          href="/objetivos/novo"
          className="mb-3 inline-flex items-center justify-between rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--accent-strong)]"
        >
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Novo objetivo
          </span>
          <ChevronRight className="h-4 w-4 opacity-70" />
        </Link>

        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.match ? item.match(pathname) : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${
                  active
                    ? "bg-[var(--surface-2)] font-medium text-[var(--text)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4">
          <div className="surface-muted px-3 py-2 text-xs leading-snug muted">
            Operador neutro, leal ao seller. <br />
            Recomenda por <strong>lucro líquido</strong>, não por ROAS ou GMV.
          </div>
        </div>
      </aside>

      <main className="min-w-0 bg-[var(--bg)]">
        <div className="border-b border-[var(--border)] bg-[var(--surface)] md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="grid h-6 w-6 place-items-center rounded bg-[var(--accent)] text-white">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-semibold">RBBT Operator</span>
            </Link>
            <Link
              href="/objetivos/novo"
              className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)] px-2.5 py-1 text-xs font-medium text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Novo
            </Link>
          </div>
          <nav className="flex items-center gap-1 overflow-x-auto border-t border-[var(--border)] px-4 py-2">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = item.match ? item.match(pathname) : pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs ${
                    active ? "bg-[var(--surface-2)] font-medium" : "text-[var(--text-muted)]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        {children}
      </main>
    </div>
  );
}
