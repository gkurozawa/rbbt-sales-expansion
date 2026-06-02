"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Activity, CheckCircle2, Database, Plus, Target } from "lucide-react";
import {
  CATEGORY_LABEL,
  Objective,
  STATUS_LABEL,
} from "@/lib/objective-types";
import { DIMENSION_META, DIMENSION_ORDER } from "@/lib/seller-types";

function statusTone(status: string): string {
  if (status === "ready") return "text-emerald-600 bg-emerald-500/10";
  if (status === "validation") return "text-amber-600 bg-amber-500/10";
  if (status === "data") return "text-indigo-600 bg-indigo-500/10";
  if (status === "archived") return "text-slate-500 bg-slate-500/10";
  return "text-slate-500 bg-slate-500/10";
}

export default function HomePage() {
  const [objectives, setObjectives] = useState<Objective[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/objectives")
      .then((r) => r.json())
      .then((d) => setObjectives(d.objectives as Objective[]))
      .catch(() => setObjectives([]))
      .finally(() => setLoading(false));
  }, []);

  const total = objectives?.length || 0;
  const ready = objectives?.filter((o) => o.status === "ready").length || 0;
  const waitingData = objectives?.filter((o) => o.status === "draft" || o.status === "data").length || 0;
  const recommendations = (objectives || []).reduce(
    (acc, o) => acc + (o.recommendations?.recommendations.length || 0),
    0
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-10">
        <div className="text-xs font-medium uppercase tracking-wider muted">Workspace</div>
        <h1 className="h-display mt-1 text-3xl">Operador do seu negócio</h1>
        <p className="muted mt-2 max-w-2xl text-sm leading-relaxed">
          O RBBT Operator transforma decisão fragmentada em plano priorizado. Você define o objetivo,
          envia dados históricos, e a IA aponta onde concentrar mudança e decisão — calibrado por
          lucro líquido, não por GMV.
        </p>
      </header>

      <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPI icon={Target} label="Objetivos" value={total} hint={total === 1 ? "ativo" : "ativos"} />
        <KPI icon={CheckCircle2} label="Prontos" value={ready} hint="com recomendações" />
        <KPI icon={Database} label="Aguardando dados" value={waitingData} hint="precisam de input" />
        <KPI icon={Activity} label="Recomendações" value={recommendations} hint="geradas no total" />
      </section>

      <section className="mb-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Objetivos ativos</h2>
          <Link
            href="/objetivos/novo"
            className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)] px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--accent-strong)]"
          >
            <Plus className="h-3.5 w-3.5" /> Novo objetivo
          </Link>
        </div>

        {loading && <div className="muted text-sm">Carregando…</div>}

        {objectives && objectives.length === 0 && (
          <div className="surface px-6 py-10 text-center">
            <Target className="mx-auto mb-3 h-6 w-6 muted" />
            <p className="text-sm font-medium">Nenhum objetivo ainda.</p>
            <p className="muted mt-1 text-sm">
              Comece pelo objetivo mais doloroso do seu negócio — margem, capital, ads ou devolução.
            </p>
            <Link
              href="/objetivos/novo"
              className="mt-4 inline-flex items-center gap-1 rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)]"
            >
              <Plus className="h-4 w-4" /> Criar objetivo
            </Link>
          </div>
        )}

        {objectives && objectives.length > 0 && (
          <div className="surface divide-y divide-[var(--border)]">
            {objectives.map((o) => (
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
                    Meta: {o.target}
                    {o.metricUnit} em {o.horizonDays} dias · {o.variables.length} variáveis
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 opacity-50" />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-semibold">8 dimensões que o operador gerencia</h2>
          <Link href="/dimensoes" className="text-xs font-medium text-[var(--accent)] hover:underline">
            Ver todas →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {DIMENSION_ORDER.map((k) => {
            const meta = DIMENSION_META[k];
            return (
              <div key={k} className="surface px-4 py-3">
                <div className="text-sm font-medium">{meta.label}</div>
                <div className="muted mt-0.5 text-xs leading-snug">{meta.tagline}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function KPI({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="surface px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs muted">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="tabular mt-1 text-2xl font-semibold">{value}</div>
      <div className="muted text-xs">{hint}</div>
    </div>
  );
}
