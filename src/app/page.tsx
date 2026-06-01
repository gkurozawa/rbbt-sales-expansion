"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Plus, Sparkles } from "lucide-react";
import { Seller, VERTICAL_LABEL, CHANNEL_LABEL } from "@/lib/seller-types";

export default function Home() {
  const [sellers, setSellers] = useState<Seller[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sellers")
      .then((r) => r.json())
      .then((d) => setSellers(d.sellers as Seller[]))
      .catch(() => setSellers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-10">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
          <Sparkles className="h-3.5 w-3.5" /> Full Stack AI para sellers de marketplace
        </div>
        <h1 className="text-3xl font-bold tracking-tight">AI Business Operator</h1>
        <p className="mt-2 max-w-2xl text-sm opacity-80">
          O sistema operacional de quem vende em múltiplos canais. CFO, COO, CMO e gestor de marketplace em
          uma camada só — entrega um plano priorizado por semana: o que aumentar, o que pausar, o que
          reforçar.
        </p>
      </header>

      <section className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { kpi: "8", label: "dimensões geridas" },
          { kpi: "1 plano", label: "por semana, priorizado" },
          { kpi: "Margem", label: "líquida, não ROAS" },
          { kpi: "Neutro", label: "leal ao seller, não ao canal" },
        ].map((b, i) => (
          <div key={i} className="rounded-xl border border-black/10 p-4 dark:border-white/10">
            <div className="text-xl font-bold">{b.kpi}</div>
            <div className="text-xs opacity-70">{b.label}</div>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Sellers cadastrados</h2>
          <Link
            href="/sellers/new"
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Novo seller
          </Link>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm opacity-70">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        )}

        {sellers && sellers.length === 0 && (
          <div className="rounded-xl border border-dashed border-black/15 p-8 text-center dark:border-white/15">
            <p className="text-sm opacity-70">Nenhum seller cadastrado ainda.</p>
            <Link
              href="/sellers/new"
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> Cadastrar o primeiro
            </Link>
          </div>
        )}

        {sellers && sellers.length > 0 && (
          <div className="space-y-2">
            {sellers.map((s) => (
              <Link
                key={s.id}
                href={`/sellers/${s.id}`}
                className="flex items-center justify-between rounded-xl border border-black/10 p-4 transition hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/[0.02]"
              >
                <div>
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs opacity-70">
                    {VERTICAL_LABEL[s.vertical]} · {s.channels.map((c) => CHANNEL_LABEL[c]).join(", ")}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 opacity-60" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
