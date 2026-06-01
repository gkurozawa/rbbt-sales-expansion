"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { CompanyAnalysis } from "@/lib/scoring";
import { CompanySize, DiscoveredCompany, SIZE_META } from "@/lib/discover-types";
import { CompanyDetail } from "@/components/CompanyDetail";
import { DiscoveryRow } from "@/components/DiscoveryRow";

type Mode = "single" | "discover";
type SortKey = "score-desc" | "score-asc" | "verdict" | "traffic-desc" | "alpha";

const COUNT_OPTIONS = [10, 20, 50] as const;

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "score-desc", label: "Score ↓" },
  { key: "score-asc", label: "Score ↑" },
  { key: "verdict", label: "Veredito" },
  { key: "traffic-desc", label: "Tráfego ↓" },
  { key: "alpha", label: "A–Z" },
];

const VERDICT_RANK: Record<string, number> = { vender: 0, qualificar: 1, passar: 2 };

// Converte "~2,5 mi visitas/mês" → 2_500_000; "~80k/mês" → 80_000; "500 mil/mês" → 500_000.
// Em ranges como "25-35 mi", usa o limite inferior (conservador).
export function parseTrafficValue(value: string | undefined): number | null {
  if (!value) return null;
  const s = value.toLowerCase();
  const numMatch = s.match(/(\d+(?:[.,]\d+)?)/);
  if (!numMatch) return null;
  const n = parseFloat(numMatch[1].replace(",", "."));
  if (!Number.isFinite(n)) return null;
  if (/milh[ãa]o|milh[oõ]es|\bmi\b/.test(s)) return n * 1_000_000;
  if (/\bmil\b|\d\s*k(?![a-z])|k\/m[eê]s|k$/.test(s)) return n * 1_000;
  return n;
}

function sortDiscovered(list: DiscoveredCompany[], key: SortKey): DiscoveredCompany[] {
  const arr = [...list];
  switch (key) {
    case "score-desc":
      return arr.sort((a, b) => (b.estimatedScore ?? -1) - (a.estimatedScore ?? -1));
    case "score-asc":
      return arr.sort((a, b) => (a.estimatedScore ?? 999) - (b.estimatedScore ?? 999));
    case "verdict":
      return arr.sort((a, b) => {
        const av = a.estimatedVerdict ? VERDICT_RANK[a.estimatedVerdict] : 3;
        const bv = b.estimatedVerdict ? VERDICT_RANK[b.estimatedVerdict] : 3;
        if (av !== bv) return av - bv;
        return (b.estimatedScore ?? -1) - (a.estimatedScore ?? -1);
      });
    case "traffic-desc":
      return arr.sort((a, b) => {
        // Sem dado vai pro fim
        const at = parseTrafficValue(a.monthlyTraffic?.value) ?? -1;
        const bt = parseTrafficValue(b.monthlyTraffic?.value) ?? -1;
        if (bt !== at) return bt - at;
        return (b.estimatedScore ?? -1) - (a.estimatedScore ?? -1);
      });
    case "alpha":
      return arr.sort((a, b) => a.company.localeCompare(b.company, "pt-BR"));
  }
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("single");

  // single mode
  const [company, setCompany] = useState("");
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleError, setSingleError] = useState<string | null>(null);
  const [singleResult, setSingleResult] = useState<CompanyAnalysis | null>(null);

  // discover mode
  const [sizes, setSizes] = useState<CompanySize[]>(["medium"]);
  const [count, setCount] = useState<number>(10);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [discoverResult, setDiscoverResult] = useState<DiscoveredCompany[] | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("score-desc");

  const sortedResult = useMemo(
    () => (discoverResult ? sortDiscovered(discoverResult, sortKey) : null),
    [discoverResult, sortKey]
  );

  function toggleSize(key: CompanySize) {
    setSizes((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev; // sempre ao menos um
        return prev.filter((s) => s !== key);
      }
      return [...prev, key];
    });
  }

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
        body: JSON.stringify({ sizes, count }),
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
              <label className="mb-2 block text-sm font-medium">
                Porte das empresas <span className="opacity-60">(pode selecionar mais de um)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(SIZE_META) as CompanySize[]).map((key) => {
                  const active = sizes.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleSize(key)}
                      disabled={discoverLoading}
                      aria-pressed={active}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                        active
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                      } disabled:opacity-50`}
                    >
                      <div className="font-medium">{SIZE_META[key].label}</div>
                      <div className="text-xs opacity-70">{SIZE_META[key].range}</div>
                    </button>
                  );
                })}
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

          {sortedResult && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">
                  {sortedResult.length} empresas candidatas — portes{" "}
                  {sizes.map((s) => SIZE_META[s].label.toLowerCase()).join(", ")}
                </h2>
                <p className="text-xs opacity-60">
                  Cada linha traz um resumo de qualificação. Clique em <strong>Mais detalhes</strong> para o breakdown completo.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="opacity-70">Ordenar por:</span>
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setSortKey(opt.key)}
                    aria-pressed={sortKey === opt.key}
                    className={`rounded-full border px-2.5 py-1 transition ${
                      sortKey === opt.key
                        ? "border-indigo-500 bg-indigo-500/10 font-medium"
                        : "border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {sortedResult.map((item, i) => (
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
