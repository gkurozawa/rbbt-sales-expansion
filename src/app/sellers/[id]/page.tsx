"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Circle, CircleDashed, FileText, Loader2 } from "lucide-react";
import {
  CHANNEL_LABEL,
  DIMENSION_META,
  DIMENSION_ORDER,
  DimensionKey,
  Seller,
  VERTICAL_LABEL,
} from "@/lib/seller-types";

function StatusIcon({ state }: { state: "ok" | "partial" | "missing" }) {
  if (state === "ok") return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
  if (state === "partial") return <CircleDashed className="h-5 w-5 text-amber-500" />;
  return <Circle className="h-5 w-5 opacity-30" />;
}

function dimensionStatus(seller: Seller, key: DimensionKey): "ok" | "partial" | "missing" {
  const dim = seller.dimensions?.[key];
  if (!dim) return "missing";
  return dim.filled ? "ok" : "partial";
}

function fmtBRL(n?: number): string {
  if (typeof n !== "number") return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function SellerDashboard() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/sellers/${params.id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || `HTTP ${r.status}`);
        setSeller(d as Seller);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "erro"))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function remove() {
    if (!seller) return;
    if (!confirm(`Apagar o seller "${seller.name}"? Os dados das dimensões serão perdidos.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/sellers/${seller.id}`, { method: "DELETE" });
      router.push("/");
    } catch {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center gap-2 text-sm opacity-70">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      </main>
    );
  }

  if (error || !seller) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm opacity-70 hover:opacity-100">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <p className="text-sm text-rose-600">{error || "seller não encontrado"}</p>
      </main>
    );
  }

  const filledCount = DIMENSION_ORDER.filter((k) => dimensionStatus(seller, k) === "ok").length;
  const ratio = filledCount / DIMENSION_ORDER.length;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm opacity-70 hover:opacity-100">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{seller.name}</h1>
          <p className="mt-1 text-sm opacity-80">
            {VERTICAL_LABEL[seller.vertical]} · {seller.channels.map((c) => CHANNEL_LABEL[c]).join(", ")}
          </p>
          <p className="mt-1 text-xs opacity-60">
            Receita mensal: {fmtBRL(seller.monthlyRevenue)} · SKUs: {seller.skuCount ?? "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/sellers/${seller.id}/plan`}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            <FileText className="h-4 w-4" /> Gerar plano operacional
          </Link>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-black/10 p-4 dark:border-white/10">
        <div className="mb-2 flex items-baseline justify-between">
          <div className="text-sm font-medium">Cobertura das dimensões</div>
          <div className="text-xs opacity-70">
            {filledCount} de {DIMENSION_ORDER.length} preenchidas
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${ratio * 100}%` }} />
        </div>
        <p className="mt-2 text-xs opacity-70">
          Quanto mais dimensões preenchidas, mais útil o plano. Mas você pode rodar a qualquer momento — o
          modelo aponta gaps.
        </p>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Dimensões</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DIMENSION_ORDER.map((key) => {
          const meta = DIMENSION_META[key];
          const state = dimensionStatus(seller, key);
          return (
            <Link
              key={key}
              href={`/sellers/${seller.id}/dimensions/${key}`}
              className="group rounded-xl border border-black/10 p-4 transition hover:border-indigo-400 hover:bg-indigo-50/30 dark:border-white/10 dark:hover:border-indigo-400 dark:hover:bg-indigo-950/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{meta.label}</div>
                  <div className="text-xs opacity-70">{meta.tagline}</div>
                </div>
                <StatusIcon state={state} />
              </div>
              <p className="mt-2 text-xs opacity-70 line-clamp-2">{meta.description}</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 border-t border-black/10 pt-4 text-xs opacity-50 dark:border-white/10">
        <button onClick={remove} disabled={deleting} className="underline hover:text-rose-600 disabled:opacity-50">
          {deleting ? "apagando…" : "apagar seller"}
        </button>
      </div>
    </main>
  );
}
