"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Database,
  Loader2,
  Play,
  Sparkles,
  XCircle,
} from "lucide-react";
import {
  CATEGORY_LABEL,
  MIN_POINTS_REQUIRED,
  Objective,
  PRIORITY_META,
  Recommendation,
  RecommendationSet,
  STATUS_LABEL,
  ValidationReport,
  variableId,
  variableLabel,
} from "@/lib/objective-types";
import { DIMENSION_META } from "@/lib/seller-types";
import { HistoricalSeriesEditor } from "@/components/HistoricalSeriesEditor";

type Step = 1 | 2 | 3 | 4;

const STEPS: { n: Step; label: string; hint: string }[] = [
  { n: 1, label: "Variáveis", hint: "o que pode ser otimizado" },
  { n: 2, label: "Dados históricos", hint: "input do seller" },
  { n: 3, label: "Validação", hint: "consistência" },
  { n: 4, label: "Recomendações", hint: "onde concentrar" },
];

export default function ObjetivoDetailPage() {
  const params = useParams<{ id: string }>();
  const [o, setO] = useState<Objective | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [validating, setValidating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/objectives/${params.id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || `HTTP ${r.status}`);
        const obj = d as Objective;
        setO(obj);
        // Vai pra etapa mais adequada ao estado atual
        if (obj.recommendations) setStep(4);
        else if (obj.validation) setStep(3);
        else if (Object.keys(obj.series).length > 0) setStep(2);
        else setStep(2);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "erro"))
      .finally(() => setLoading(false));
  }, [params.id]);

  const series = o?.series || {};

  const filledCount = useMemo(() => {
    if (!o) return 0;
    return o.variables.filter((v) => (series[variableId(v)]?.points.length ?? 0) >= MIN_POINTS_REQUIRED).length;
  }, [o, series]);

  const requiredCount = useMemo(() => (o ? o.variables.filter((v) => v.required).length : 0), [o]);
  const requiredFilled = useMemo(() => {
    if (!o) return 0;
    return o.variables.filter(
      (v) => v.required && (series[variableId(v)]?.points.length ?? 0) >= MIN_POINTS_REQUIRED
    ).length;
  }, [o, series]);

  async function runValidation() {
    if (!o) return;
    setValidating(true);
    try {
      const res = await fetch(`/api/objectives/${o.id}/validate`, { method: "POST" });
      const d = (await res.json()) as ValidationReport;
      // recarrega objeto pra pegar status atualizado
      const o2 = await fetch(`/api/objectives/${o.id}`).then((r) => r.json());
      setO(o2 as Objective);
      // se passou, avança
      if (d.overall !== "fail") setStep(4);
    } finally {
      setValidating(false);
    }
  }

  async function generate() {
    if (!o) return;
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch(`/api/objectives/${o.id}/recommend`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || `HTTP ${res.status}`);
      const o2 = await fetch(`/api/objectives/${o.id}`).then((r) => r.json());
      setO(o2 as Objective);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "erro");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="muted flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      </div>
    );
  }

  if (!o) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link href="/" className="muted mb-4 inline-flex items-center gap-1 text-sm hover:text-[var(--text)]">
          <ArrowLeft className="h-4 w-4" /> Workspace
        </Link>
        <p className="text-sm text-rose-600">{error || "Objetivo não encontrado"}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/objetivos" className="muted mb-4 inline-flex items-center gap-1 text-sm hover:text-[var(--text)]">
        <ArrowLeft className="h-4 w-4" /> Objetivos
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="muted text-xs font-medium uppercase tracking-wider">
            {CATEGORY_LABEL[o.category]} · {STATUS_LABEL[o.status]}
          </div>
          <h1 className="h-display mt-1 text-2xl">{o.title}</h1>
          {o.description && <p className="muted mt-2 max-w-2xl text-sm leading-relaxed">{o.description}</p>}
        </div>
        <div className="surface px-4 py-3 text-right">
          <div className="muted text-[11px] uppercase tracking-wider">Meta</div>
          <div className="tabular text-xl font-semibold">
            {o.target}
            {o.metricUnit}
          </div>
          <div className="muted text-xs">
            {o.metricLabel} · {o.direction === "up" ? "↑" : "↓"} em {o.horizonDays}d
          </div>
          {o.baseline !== undefined && (
            <div className="muted mt-1 text-[11px]">
              baseline {o.baseline}
              {o.metricUnit}
            </div>
          )}
        </div>
      </header>

      <nav className="mt-8">
        <ol className="grid grid-cols-4 gap-2">
          {STEPS.map((s) => {
            const active = step === s.n;
            return (
              <li key={s.n}>
                <button
                  type="button"
                  onClick={() => setStep(s.n)}
                  className={`w-full rounded-md border px-3 py-2 text-left transition ${
                    active
                      ? "border-[var(--accent)] bg-[var(--accent)]/[0.06]"
                      : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  <div className="muted text-[11px] uppercase tracking-wider">Etapa {s.n}</div>
                  <div className="mt-0.5 text-sm font-medium">{s.label}</div>
                  <div className="muted text-[11px]">{s.hint}</div>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {step === 1 && <Step1 o={o} />}

      {step === 2 && (
        <Step2
          o={o}
          requiredFilled={requiredFilled}
          requiredCount={requiredCount}
          filledCount={filledCount}
          onSeriesSaved={(updatedSeries) => {
            setO((prev) =>
              prev
                ? {
                    ...prev,
                    series: { ...prev.series, [updatedSeries.variableId]: updatedSeries },
                  }
                : prev
            );
          }}
        />
      )}

      {step === 3 && (
        <Step3
          o={o}
          onRun={runValidation}
          running={validating}
          canRun={requiredFilled === requiredCount && requiredCount > 0}
        />
      )}

      {step === 4 && (
        <Step4
          o={o}
          recs={o.recommendations}
          onGenerate={generate}
          generating={generating}
          genError={genError}
        />
      )}
    </div>
  );
}

function Step1({ o }: { o: Objective }) {
  return (
    <section className="surface mt-6 divide-y divide-[var(--border)]">
      <header className="px-5 py-4">
        <h2 className="text-base font-semibold">Variáveis de otimização</h2>
        <p className="muted mt-1 text-sm">
          Cada variável é um campo de uma das 8 dimensões. As marcadas como{" "}
          <strong>obrigatórias</strong> precisam de dados históricos pra validação passar.
        </p>
      </header>
      {o.variables.map((v) => (
        <div key={`${v.dimension}.${v.fieldKey}`} className="flex items-center justify-between px-5 py-3">
          <div>
            <div className="text-sm font-medium">{variableLabel(v)}</div>
            <div className="muted text-xs">{DIMENSION_META[v.dimension].label}</div>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
              v.required ? "bg-rose-500/10 text-rose-600" : "bg-slate-500/10 text-slate-500"
            }`}
          >
            {v.required ? "obrigatória" : "opcional"}
          </span>
        </div>
      ))}
    </section>
  );
}

function Step2({
  o,
  requiredFilled,
  requiredCount,
  filledCount,
  onSeriesSaved,
}: {
  o: Objective;
  requiredFilled: number;
  requiredCount: number;
  filledCount: number;
  onSeriesSaved: (s: import("@/lib/objective-types").HistoricalSeries) => void;
}) {
  return (
    <section className="mt-6 space-y-5">
      <div className="surface flex flex-wrap items-baseline justify-between gap-3 px-5 py-4">
        <div>
          <div className="text-sm font-semibold">Dados históricos por variável</div>
          <p className="muted mt-1 text-sm">
            Mínimo de <strong>{MIN_POINTS_REQUIRED} pontos</strong> por variável para validação. Aceita CSV
            colado: <code className="surface-muted px-1">YYYY-MM-DD,valor[,segmento]</code> por linha.
          </p>
        </div>
        <div className="muted text-right text-xs">
          <div>
            Obrigatórias preenchidas:{" "}
            <span className={requiredFilled === requiredCount ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
              {requiredFilled}/{requiredCount}
            </span>
          </div>
          <div>
            Total preenchidas: {filledCount}/{o.variables.length}
          </div>
        </div>
      </div>

      {o.variables.map((v) => (
        <div key={`${v.dimension}.${v.fieldKey}`} className="surface px-5 py-4">
          <HistoricalSeriesEditor
            objectiveId={o.id}
            variable={v}
            initial={o.series[variableId(v)]}
            onSaved={onSeriesSaved}
          />
        </div>
      ))}
    </section>
  );
}

function Step3({
  o,
  onRun,
  running,
  canRun,
}: {
  o: Objective;
  onRun: () => void;
  running: boolean;
  canRun: boolean;
}) {
  const report = o.validation;
  return (
    <section className="mt-6 space-y-5">
      <div className="surface flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <div className="text-sm font-semibold">Validação dos dados informados</div>
          <p className="muted mt-1 text-sm">
            Completeness, faixa razoável, outliers e tendência. Só aprovamos recomendações quando a
            validação não retorna nenhum bloqueio.
          </p>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={running || !canRun}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)] disabled:opacity-50"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? "Validando…" : report ? "Validar novamente" : "Validar agora"}
        </button>
      </div>

      {!canRun && !report && (
        <div className="surface flex items-start gap-3 px-5 py-4 text-sm">
          <Database className="h-4 w-4 muted shrink-0" />
          <p className="muted">
            Volte na etapa 2 e preencha as variáveis obrigatórias com pelo menos {MIN_POINTS_REQUIRED} pontos
            cada antes de validar.
          </p>
        </div>
      )}

      {report && (
        <div className="surface px-5 py-4">
          <div className="mb-3 flex items-center gap-2">
            {report.overall === "pass" && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            {report.overall === "warn" && <AlertTriangle className="h-5 w-5 text-amber-500" />}
            {report.overall === "fail" && <XCircle className="h-5 w-5 text-rose-600" />}
            <span className="text-sm font-semibold">
              {report.overall === "pass" ? "Validação OK" : report.overall === "warn" ? "Validação com avisos" : "Validação falhou — corrigir antes de seguir"}
            </span>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {report.checks.map((c, i) => {
              const tone =
                c.status === "fail" ? "text-rose-600" : c.status === "warn" ? "text-amber-600" : "text-emerald-600";
              const Icon = c.status === "fail" ? XCircle : c.status === "warn" ? AlertTriangle : CheckCircle2;
              return (
                <li key={i} className="flex items-start gap-3 py-2 text-sm">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} />
                  <div className="min-w-0">
                    <div className="font-medium">{c.message}</div>
                    {c.suggestion && <div className="muted text-xs">{c.suggestion}</div>}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function Step4({
  o,
  recs,
  onGenerate,
  generating,
  genError,
}: {
  o: Objective;
  recs?: RecommendationSet;
  onGenerate: () => void;
  generating: boolean;
  genError: string | null;
}) {
  const blocked = o.validation?.overall === "fail";
  return (
    <section className="mt-6 space-y-5">
      <div className="surface flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <div className="text-sm font-semibold">Recomendações focadas no objetivo</div>
          <p className="muted mt-1 text-sm">
            A IA cruza variáveis com a validação e prioriza onde concentrar mudança e decisão.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating || blocked}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)] disabled:opacity-50"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? "Gerando…" : recs ? "Regenerar" : "Gerar recomendações"}
        </button>
      </div>

      {blocked && (
        <div className="surface flex items-start gap-3 px-5 py-4 text-sm">
          <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <p className="muted">
            Validação falhou — volte na etapa 3, corrija os pontos críticos e valide novamente antes de
            gerar recomendações.
          </p>
        </div>
      )}

      {genError && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">
          {genError}
        </div>
      )}

      {recs && (
        <>
          {recs.headline && (
            <div className="surface px-5 py-4">
              <div className="muted text-xs font-medium uppercase tracking-wider">Headline</div>
              <p className="mt-1 text-base leading-relaxed">{recs.headline}</p>
            </div>
          )}

          <div className="space-y-3">
            {recs.recommendations.map((r) => (
              <RecommendationCard key={r.id} r={r} />
            ))}
          </div>

          {recs.notes && (
            <div className="surface px-5 py-4">
              <div className="muted text-xs font-medium uppercase tracking-wider">Gaps / notas</div>
              <p className="muted mt-1 text-sm">{recs.notes}</p>
            </div>
          )}

          <p className="muted text-xs">
            Gerado em {new Date(recs.generatedAt).toLocaleString("pt-BR")}
          </p>
        </>
      )}

      {!recs && !generating && !blocked && (
        <div className="surface flex items-center gap-3 px-5 py-6 text-sm">
          <Circle className="h-4 w-4 muted" />
          <p className="muted">Nenhuma recomendação gerada ainda. Clique em <strong>Gerar recomendações</strong> acima.</p>
        </div>
      )}
    </section>
  );
}

function RecommendationCard({ r }: { r: Recommendation }) {
  const meta = PRIORITY_META[r.priority];
  return (
    <div className={`rounded-xl border border-[var(--border)] ${meta.bg} px-5 py-4`}>
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
        <span className="text-xs font-medium uppercase tracking-wider">prioridade {meta.label}</span>
        {r.variableId && (
          <span className="muted text-xs">· variável {r.variableId}</span>
        )}
      </div>
      <h3 className="mt-1 text-base font-semibold leading-snug">{r.title}</h3>
      {r.rationale && <p className="mt-1 text-sm leading-relaxed">{r.rationale}</p>}

      {r.impacts.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {r.impacts.map((i, idx) => (
            <div key={idx} className="surface-muted px-3 py-2 text-xs">
              <div className="font-medium">{i.metric}</div>
              <div className="muted">{i.estimate} · confiança {i.confidence}</div>
            </div>
          ))}
        </div>
      )}

      {r.evidence.length > 0 && (
        <div className="mt-3">
          <div className="muted text-[11px] uppercase tracking-wider">Evidências</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
            {r.evidence.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {r.guardrail && (
        <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">
          <span className="font-semibold">Guardrail.</span> {r.guardrail}
        </div>
      )}
    </div>
  );
}
