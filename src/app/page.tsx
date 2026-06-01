"use client";

import { useState } from "react";
import { CompanyAnalysis } from "@/lib/scoring";
import { ScoreBadge } from "@/components/ScoreBadge";
import { CriteriaTable } from "@/components/CriteriaTable";

const CONF_LABEL: Record<string, string> = {
  low: "baixa",
  medium: "média",
  high: "alta",
};

export default function Home() {
  const [company, setCompany] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompanyAnalysis | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: company.trim(), url: url.trim() || undefined, notes: notes.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setResult(data as CompanyAnalysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">RBBT Sales — Expansion</h1>
        <p className="mt-2 text-sm opacity-70">
          Avalie quão atrativa uma empresa é como cliente do RBBT Sales com base em sinais públicos.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mb-10 space-y-3 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <div>
          <label className="mb-1 block text-sm font-medium">Empresa *</label>
          <input
            className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/15"
            placeholder="ex.: Riachuelo"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">URL (opcional)</label>
            <input
              className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/15"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Notas (opcional)</label>
            <input
              className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/15"
              placeholder="contexto adicional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || !company.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Analisando…" : "Analisar"}
        </button>
      </form>

      {error && (
        <div className="mb-6 rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm">
          <div className="font-medium">Erro</div>
          <div className="opacity-80">{error}</div>
        </div>
      )}

      {result && (
        <section className="space-y-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">{result.company}</h2>
              <p className="mt-1 max-w-2xl text-sm opacity-80">{result.overview}</p>
              <p className="mt-2 text-xs opacity-60">Confiança geral: {CONF_LABEL[result.overallConfidence]}</p>
            </div>
            <ScoreBadge value={result.totalScore} />
          </div>

          <div className="rounded-2xl bg-indigo-50 p-5 text-sm leading-relaxed dark:bg-indigo-950/30">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">Oportunidade</div>
            <p>{result.opportunity}</p>
          </div>

          {result.redFlags.length > 0 && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 text-sm">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-70">Red flags</div>
              <ul className="list-disc space-y-1 pl-5">
                {result.redFlags.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          )}

          <div>
            <h3 className="mb-3 text-lg font-semibold">Detalhamento por critério</h3>
            <CriteriaTable analysis={result} />
          </div>

          {result.sources.length > 0 && (
            <div className="text-xs opacity-60">
              <span className="font-semibold">Fontes consultadas pelo modelo:</span>{" "}
              {result.sources.join(", ")}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
