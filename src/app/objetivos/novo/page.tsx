"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import {
  CATEGORY_LABEL,
  OBJECTIVE_TEMPLATES,
  ObjectiveTemplate,
  variableLabel,
} from "@/lib/objective-types";

export default function NovoObjetivoPage() {
  const router = useRouter();
  const [tplId, setTplId] = useState<string>(OBJECTIVE_TEMPLATES[0].id);
  const tpl = useMemo<ObjectiveTemplate>(
    () => OBJECTIVE_TEMPLATES.find((t) => t.id === tplId) || OBJECTIVE_TEMPLATES[0],
    [tplId]
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [baseline, setBaseline] = useState("");
  const [target, setTarget] = useState("");
  const [horizonDays, setHorizonDays] = useState(String(tpl.defaultHorizonDays));

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickTemplate(id: string) {
    const t = OBJECTIVE_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setTplId(id);
    setHorizonDays(String(t.defaultHorizonDays));
    if (!title) setTitle(t.title);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!target.trim()) return setError("Defina a meta.");
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || tpl.title,
          description: description.trim() || undefined,
          templateId: tpl.id,
          metricLabel: tpl.metricLabel,
          metricUnit: tpl.metricUnit,
          baseline: baseline ? Number(baseline.replace(",", ".")) : undefined,
          target: Number(target.replace(",", ".")),
          direction: tpl.direction,
          horizonDays: Number(horizonDays) || tpl.defaultHorizonDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      router.push(`/objetivos/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/" className="muted mb-4 inline-flex items-center gap-1 text-sm hover:text-[var(--text)]">
        <ArrowLeft className="h-4 w-4" /> Workspace
      </Link>

      <div className="text-xs font-medium uppercase tracking-wider muted">Novo objetivo</div>
      <h1 className="h-display mt-1 text-2xl">Escolha o que mover</h1>
      <p className="muted mt-2 max-w-2xl text-sm leading-relaxed">
        Selecione um template — cada um já vem com as variáveis-chave (subset das 8 dimensões) que
        sustentam aquele tipo de decisão. Você revisa, completa baseline/meta, e a partir daí informa
        os dados históricos.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-2">
          {OBJECTIVE_TEMPLATES.map((t) => {
            const active = t.id === tplId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => pickTemplate(t.id)}
                aria-pressed={active}
                className={`block w-full rounded-xl border px-5 py-4 text-left transition ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent)]/[0.06]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold">{t.title}</span>
                  <span className="muted text-[11px] uppercase tracking-wider">
                    {CATEGORY_LABEL[t.category]}
                  </span>
                </div>
                <p className="muted mt-1 text-xs leading-relaxed">{t.shortDescription}</p>
                <div className="muted mt-2 text-[11px]">
                  {t.variables.length} variáveis · horizonte sugerido {t.defaultHorizonDays}d
                </div>
              </button>
            );
          })}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <form onSubmit={submit} className="surface space-y-4 px-5 py-5">
            <div>
              <div className="muted text-[11px] uppercase tracking-wider">Template selecionado</div>
              <div className="mt-0.5 text-sm font-semibold">{tpl.title}</div>
              <p className="muted mt-2 text-xs leading-relaxed">{tpl.rationale}</p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider muted">
                Título do objetivo
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={tpl.title}
                className="surface-muted w-full bg-transparent px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider muted">
                Descrição (contexto do seller)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ex.: estamos comprimidos no ML por causa de comissão + frete grátis; canal próprio cresce, mas devagar"
                rows={3}
                className="surface-muted w-full bg-transparent px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider muted">
                  Baseline ({tpl.metricUnit || "—"})
                </label>
                <input
                  inputMode="decimal"
                  value={baseline}
                  onChange={(e) => setBaseline(e.target.value)}
                  placeholder="ex.: 6"
                  className="surface-muted w-full bg-transparent px-3 py-2 text-sm tabular"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider muted">
                  Meta ({tpl.metricUnit || "—"})
                </label>
                <input
                  inputMode="decimal"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="ex.: 8"
                  required
                  className="surface-muted w-full bg-transparent px-3 py-2 text-sm tabular"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider muted">
                Horizonte (dias)
              </label>
              <input
                inputMode="numeric"
                value={horizonDays}
                onChange={(e) => setHorizonDays(e.target.value.replace(/\D/g, ""))}
                className="surface-muted w-full bg-transparent px-3 py-2 text-sm tabular"
              />
            </div>

            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wider muted">Variáveis</div>
              <div className="space-y-1 text-sm">
                {tpl.variables.map((v) => (
                  <div key={`${v.dimension}.${v.fieldKey}`} className="flex items-baseline justify-between gap-2">
                    <span className="truncate">{variableLabel(v)}</span>
                    <span className="muted text-[10px] uppercase tracking-wider">
                      {v.required ? "obrigatória" : "opcional"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)] disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {submitting ? "Criando…" : "Criar e ir aos dados"}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
