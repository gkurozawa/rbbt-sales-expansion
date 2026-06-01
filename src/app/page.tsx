"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { CompanyAnalysis } from "@/lib/scoring";
import { CompanySize, DiscoveredCompany, SIZE_META } from "@/lib/discover-types";
import { CompanyDetail } from "@/components/CompanyDetail";
import { DiscoveryRow } from "@/components/DiscoveryRow";

type Mode = "single" | "discover";

const COUNT_OPTIONS = [10, 20, 50] as const;

export default function Home() {
  const [mode, setMode] = useState<Mode>("single");

  // single mode
  const [company, setCompany] = useState("");
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleError, setSingleError] = useState<string | null>(null);
  const [singleResult, setSingleResult] = useState<CompanyAnalysis | null>(null);

  // discover mode
  const [size, setSize] = useState<CompanySize>("medium");
  const [count, setCount] = useState<number>(10);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [discoverResult, setDiscoverResult] = useState<DiscoveredCompany[] | null>(null);

  async function handleSingleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim()) return;
    setSingleLoading(true);
    setSingleError(null);
    setSingleResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: company.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setSingleResult(data as CompanyAnalysis);
    } catch (err) {
      setSingleError(err instanceof Error ? err.message : "erro desconhecido");
    } finally {
      setSingleLoading(false);
    }
  }

  async function handleDiscoverSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDiscoverLoading(true);
    setDiscoverError(null);
    setDiscoverResult(null);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size, count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setDiscoverResult((data?.companies as DiscoveredCompany[]) || []);
    } catch (err) {
      setDiscoverError(err instanceof Error ? err.message : "erro desconhecido");
    } finally {
      setDiscoverLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">RBBT Sales — Expansion</h1>
        <p className="mt-2 text-sm opacity-70">
          Avalie quão atrativa uma empresa é como cliente do RBBT Sales — ou descubra novas empresas-alvo por porte.
        </p>
      </header>

      <div className="mb-6 inline-flex rounded-xl border border-black/10 p-1 dark:border-white/10">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
            mode === "single" ? "bg-indigo-600 text-white" : "opacity-70 hover:opacity-100"
          }`}
        >
          Analisar uma empresa
        </button>
        <button
          type="button"
          onClick={() => setMode("discover")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
            mode === "discover" ? "bg-indigo-600 text-white" : "opacity-70 hover:opacity-100"
          }`}
        >
          Descobrir por porte
        </button>
      </div>

      {mode === "single" && (
        <>
          <form
            onSubmit={handleSingleSubmit}
            className="mb-10 space-y-3 rounded-2xl border border-black/10 p-5 dark:border-white/10"
          >
            <div>
              <label className="mb-1 block text-sm font-medium">Empresa</label>
              <input
                className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/15"
                placeholder="ex.: Riachuelo"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                disabled={singleLoading}
              />
            </div>
            <button
              type="submit"
              disabled={singleLoading || !company.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {singleLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {singleLoading ? "Analisando…" : "Analisar"}
            </button>
          </form>

          {singleError && (
            <div className="mb-6 rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm">
              <div className="font-medium">Erro</div>
              <div className="opacity-80">{singleError}</div>
            </div>
          )}

          {singleResult && <CompanyDetail analysis={singleResult} />}
        </>
      )}

      {mode === "discover" && (
        <>
          <form
            onSubmit={handleDiscoverSubmit}
            className="mb-10 space-y-4 rounded-2xl border border-black/10 p-5 dark:border-white/10"
          >
            <div>
              <label className="mb-2 block text-sm font-medium">Porte das empresas</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(SIZE_META) as CompanySize[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSize(key)}
                    disabled={discoverLoading}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                      size === key
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                    } disabled:opacity-50`}
                  >
                    <div className="font-medium">{SIZE_META[key].label}</div>
                    <div className="text-xs opacity-70">{SIZE_META[key].range}</div>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs opacity-60">
                Faturamento considera a empresa total (matriz + operações), não unidades fragmentadas.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Quantidade de resultados</label>
              <div className="flex gap-2">
                {COUNT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCount(n)}
                    disabled={discoverLoading}
                    className={`rounded-lg border px-4 py-2 text-sm transition ${
                      count === n
                        ? "border-indigo-500 bg-indigo-500/10 font-medium"
                        : "border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                    } disabled:opacity-50`}
                  >
                    {n} empresas
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={discoverLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {discoverLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {discoverLoading ? "Buscando…" : "Buscar empresas"}
            </button>
            {discoverLoading && (
              <p className="text-xs opacity-60">
                Listas maiores levam alguns minutos — o modelo precisa gerar e justificar cada empresa.
              </p>
            )}
          </form>

          {discoverError && (
            <div className="mb-6 rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm">
              <div className="font-medium">Erro</div>
              <div className="opacity-80">{discoverError}</div>
            </div>
          )}

          {discoverResult && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">
                  {discoverResult.length} empresas candidatas — porte {SIZE_META[size].label.toLowerCase()}
                </h2>
                <p className="text-xs opacity-60">
                  Cada linha traz um resumo de qualificação. Clique em <strong>Mais detalhes</strong> para o breakdown completo.
                </p>
              </div>
              <div className="space-y-3">
                {discoverResult.map((item, i) => (
                  <DiscoveryRow key={`${item.company}-${i}`} item={item} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
