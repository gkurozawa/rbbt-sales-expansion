"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { DiscoveredCompany } from "@/lib/discover-types";
import { CompanyAnalysis } from "@/lib/scoring";
import { CompanyDetail } from "./CompanyDetail";

export function DiscoveryRow({ item }: { item: DiscoveredCompany }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CompanyAnalysis | null>(null);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (analysis || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: item.company }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setAnalysis(data as CompanyAnalysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-black/10 bg-white/50 p-4 transition dark:border-white/10 dark:bg-white/[0.02]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-lg font-semibold">{item.company}</h3>
            {item.category && (
              <span className="text-xs uppercase tracking-wide opacity-60">{item.category}</span>
            )}
          </div>
          {item.estimatedRevenue && (
            <div className="mt-0.5 text-xs opacity-60">{item.estimatedRevenue}</div>
          )}
          <p className="mt-2 text-sm leading-relaxed">{item.briefRationale}</p>
        </div>
        <button
          type="button"
          onClick={toggle}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-black/15 px-3 py-1.5 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {open ? "Recolher" : "Mais detalhes"}
        </button>
      </div>

      {open && (
        <div className="mt-5 border-t border-black/5 pt-5 dark:border-white/5">
          {loading && (
            <div className="flex items-center gap-2 text-sm opacity-70">
              <Loader2 className="h-4 w-4 animate-spin" /> Analisando {item.company}…
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm">
              <div className="font-medium">Erro ao analisar</div>
              <div className="opacity-80">{error}</div>
            </div>
          )}
          {analysis && <CompanyDetail analysis={analysis} />}
        </div>
      )}
    </div>
  );
}
