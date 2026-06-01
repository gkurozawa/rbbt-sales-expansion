"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { CHANNEL_LABEL, Channel, Seller, SellerVertical, VERTICAL_LABEL } from "@/lib/seller-types";

const VERTICALS: SellerVertical[] = ["moda", "suplementos", "beleza", "eletronicos", "casa", "outros"];
const CHANNELS: Channel[] = [
  "mercado-livre",
  "amazon",
  "shopee",
  "magalu",
  "americanas",
  "loja-propria",
  "ifood",
  "outros",
];

export default function NewSellerPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [vertical, setVertical] = useState<SellerVertical>("moda");
  const [channels, setChannels] = useState<Channel[]>(["mercado-livre"]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<string>("");
  const [skuCount, setSkuCount] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleChannel(c: Channel) {
    setChannels((prev) => {
      if (prev.includes(c)) {
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== c);
      }
      return [...prev, c];
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          vertical,
          channels,
          monthlyRevenue: monthlyRevenue ? Number(monthlyRevenue) : undefined,
          skuCount: skuCount ? Number(skuCount) : undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = (await res.json()) as Seller | { error?: string };
      if (!res.ok) throw new Error(("error" in data && data.error) || `HTTP ${res.status}`);
      router.push(`/sellers/${(data as Seller).id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro desconhecido");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm opacity-70 hover:opacity-100">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="mb-2 text-2xl font-bold">Cadastrar seller</h1>
      <p className="mb-6 text-sm opacity-70">
        Dados básicos pra o operador. Você complementa cada dimensão depois.
      </p>

      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <div>
          <label className="mb-1 block text-sm font-medium">Nome do seller *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="ex.: Camys"
            className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/15"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Vertical *</label>
          <div className="flex flex-wrap gap-2">
            {VERTICALS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVertical(v)}
                aria-pressed={vertical === v}
                className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                  vertical === v
                    ? "border-indigo-500 bg-indigo-500/10 font-medium"
                    : "border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                }`}
              >
                {VERTICAL_LABEL[v]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Canais ativos * <span className="font-normal opacity-60">(multiseleção)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((c) => {
              const active = channels.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleChannel(c)}
                  aria-pressed={active}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                    active
                      ? "border-indigo-500 bg-indigo-500/10 font-medium"
                      : "border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                  }`}
                >
                  {CHANNEL_LABEL[c]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Receita mensal estimada (R$)</label>
            <input
              value={monthlyRevenue}
              onChange={(e) => setMonthlyRevenue(e.target.value.replace(/\D/g, ""))}
              placeholder="ex.: 8500000"
              inputMode="numeric"
              className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/15"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">SKUs ativos</label>
            <input
              value={skuCount}
              onChange={(e) => setSkuCount(e.target.value.replace(/\D/g, ""))}
              placeholder="ex.: 4200"
              inputMode="numeric"
              className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/15"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Notas (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="contexto sobre o negócio: principal dor sentida, estágio, time, fornecedores etc."
            rows={3}
            className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/15"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm">
            <div className="font-medium">Erro</div>
            <div className="opacity-80">{error}</div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Salvando…" : "Criar e continuar"}
        </button>
      </form>
    </main>
  );
}
