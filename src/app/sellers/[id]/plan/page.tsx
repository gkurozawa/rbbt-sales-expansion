"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Circle, CircleDashed, Loader2, Play } from "lucide-react";
import {
  DIMENSION_META,
  DIMENSION_ORDER,
  DimensionKey,
  OperatingPlan,
  PRIORITY_META,
  Seller,
} from "@/lib/seller-types";

const CONF_LABEL: Record<string, string> = {
  baixa: "baixa",
  media: "média",
  alta: "alta",
};

function CoverageBar({ coverage }: { coverage: OperatingPlan["coverage"] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {DIMENSION_ORDER.map((k) => {
        const state = coverage[k] ?? "missing";
        const Icon =
          state === "ok" ? CheckCircle2 : state === "partial" ? CircleDashed : Circle;
        const color =
          state === "ok"
            ? "text-emerald-600"
            : state === "partial"
            ? "text-amber-500"
            : "opacity-30";
        return (
          <div key={k} className="flex items-center gap-2 rounded-md border border-black/10 p-2 text-xs dark:border-white/10">
            <Icon className={`h-4 w-4 ${color}`} />
            <span className="truncate">{DIMENSION_META[k].label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function PlanPage() {
  const params = useParams<{ id: string }>();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loadingSeller, setLoadingSeller] = useState(true);

  const [plan, setPlan] = useState<OperatingPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/sellers/${params.id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || `HTTP ${r.status}`);
        setSeller(d as Seller);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "erro"))
      .finally(() => setLoadingSeller(false));
  }, [params.id]);

  async function generate() {
    setGenerating(true);
    setError(null);
    setPlan(null);
    try {
      const res = await fetch(`/api/sellers/${params.id}/plan`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || `HTTP ${res.status}`);
      setPlan(d as OperatingPlan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro ao gerar plano");
    } finally {
      setGenerating(false);
    }
  }

  if (loadingSeller) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center gap-2 text-sm opacity-70">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      </main>
    );
  }

  if (!seller) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm opacity-70 hover:opacity-100">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <p className="text-sm text-rose-600">seller não encontrado</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href={`/sellers/${seller.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm opacity-70 hover:opacity-100"
      >
        <ArrowLeft className="h-4 w-4" /> {seller.name}
      </Link>

      <h1 className="text-2xl font-bold">Plano operacional</h1>
      <p className="mt-1 text-sm opacity-80">
        Ações priorizadas para essa semana, baseadas nos dados informados em cada dimensão.
      </p>

      <div className="mt-6">
        <button
          onClick={generate}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {generating ? "Gerando plano…" : plan ? "Gerar novamente" : "Gerar plano"}
        </button>
        {generating && (
          <p className="mt-2 text-xs opacity-70">
            O modelo está analisando todas as dimensões. Costuma levar 1-3 minutos.
          </p>
        )}
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm">
          <div className="font-medium">Erro</div>
          <div className="opacity-80">{error}</div>
        </div>
      )}

      {plan && (
        <section className="mt-8 space-y-6">
          {plan.headline && (
            <div className="rounded-2xl bg-indigo-50 p-5 dark:bg-indigo-950/30">
              <div className="text-xs font-semibold uppercase tracking-widest opacity-70">Headline da semana</div>
              <p className="mt-1 text-base leading-relaxed">{plan.headline}</p>
            </div>
          )}

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-70">
              Cobertura dos dados de entrada
            </div>
            <CoverageBar coverage={plan.coverage} />
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Ações priorizadas ({plan.topActions.length})</h2>
            <div className="space-y-3">
              {plan.topActions.map((a) => {
                const meta = PRIORITY_META[a.priority];
                return (
                  <div
                    key={a.id}
                    className="rounded-xl border border-black/10 p-4 dark:border-white/10"
                  >
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${meta.bg}`}>
                        {meta.label}
                      </span>
                      <span className="text-xs uppercase tracking-wide opacity-60">
                        {DIMENSION_META[a.dimension as DimensionKey]?.label}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold">{a.title}</h3>
                    {a.rationale && <p className="mt-1 text-sm opacity-90">{a.rationale}</p>}

                    {a.impacts.length > 0 && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {a.impacts.map((imp, i) => (
                          <div key={i} className="rounded-md bg-black/5 p-2 text-xs dark:bg-white/5">
                            <div className="font-semibold">{imp.metric}</div>
                            <div className="opacity-90">{imp.estimate}</div>
                            <div className="opacity-60">confiança {CONF_LABEL[imp.confidence] || imp.confidence}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {a.evidence && a.evidence.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs font-semibold uppercase tracking-wide opacity-70">Evidências</div>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm opacity-90">
                          {a.evidence.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                      </div>
                    )}

                    {a.guardrail && (
                      <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs">
                        <div className="font-semibold opacity-80">Guardrail</div>
                        <div className="opacity-90">{a.guardrail}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {plan.notes && (
            <div className="rounded-xl border border-black/10 p-4 text-sm dark:border-white/10">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">Notas / gaps</div>
              <p className="opacity-90">{plan.notes}</p>
            </div>
          )}

          <p className="text-xs opacity-50">
            Gerado em {new Date(plan.generatedAt).toLocaleString("pt-BR")}.
          </p>
        </section>
      )}
    </main>
  );
}
