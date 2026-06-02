"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { CATEGORY_LABEL, Objective, STATUS_LABEL } from "@/lib/objective-types";

function statusTone(status: string): string {
  if (status === "ready") return "text-emerald-600 bg-emerald-500/10";
  if (status === "validation") return "text-amber-600 bg-amber-500/10";
  if (status === "data") return "text-indigo-600 bg-indigo-500/10";
  return "text-slate-500 bg-slate-500/10";
}

export default function ObjetivosListPage() {
  const [items, setItems] = useState<Objective[] | null>(null);

  useEffect(() => {
    fetch("/api/objectives").then((r) => r.json()).then((d) => setItems(d.objectives));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider muted">Workspace</div>
          <h1 className="h-display mt-1 text-2xl">Objetivos</h1>
        </div>
        <Link
          href="/objetivos/novo"
          className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)]"
        >
          <Plus className="h-4 w-4" /> Novo objetivo
        </Link>
      </div>

      {!items && <div className="muted text-sm">Carregando…</div>}

      {items && items.length === 0 && (
        <div className="surface px-6 py-10 text-center text-sm muted">
          Nenhum objetivo ainda.{" "}
          <Link href="/objetivos/novo" className="text-[var(--accent)] hover:underline">
            Criar o primeiro
          </Link>
          .
        </div>
      )}

      {items && items.length > 0 && (
        <div className="surface divide-y divide-[var(--border)]">
          {items.map((o) => (
            <Link
              key={o.id}
              href={`/objetivos/${o.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[var(--surface-2)]"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${statusTone(o.status)}`}>
                    {STATUS_LABEL[o.status]}
                  </span>
                  <span className="muted text-xs">{CATEGORY_LABEL[o.category]}</span>
                </div>
                <div className="mt-1 font-medium">{o.title}</div>
                <div className="muted mt-0.5 text-xs">
                  Meta {o.target}
                  {o.metricUnit} em {o.horizonDays} dias · {o.variables.length} variáveis
                </div>
              </div>
              <ArrowRight className="h-4 w-4 opacity-50" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
