"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  DIMENSION_FIELDS,
  DIMENSION_META,
  DIMENSION_ORDER,
  DimensionKey,
  Seller,
} from "@/lib/seller-types";

export default function DimensionPage() {
  const params = useParams<{ id: string; key: string }>();
  const router = useRouter();
  const key = params.key as DimensionKey;
  const validKey = DIMENSION_ORDER.includes(key);

  const [seller, setSeller] = useState<Seller | null>(null);
  const [data, setData] = useState<Record<string, string | number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!validKey) return;
    fetch(`/api/sellers/${params.id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || `HTTP ${r.status}`);
        const s = d as Seller;
        setSeller(s);
        setData(s.dimensions?.[key]?.data ?? {});
      })
      .catch((err) => setError(err instanceof Error ? err.message : "erro"))
      .finally(() => setLoading(false));
  }, [params.id, key, validKey]);

  function update(fieldKey: string, value: string) {
    setData((prev) => ({ ...prev, [fieldKey]: value }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const cleaned: Record<string, string | number> = {};
      for (const [k, v] of Object.entries(data)) {
        if (v === "" || v === undefined || v === null) continue;
        const fieldDef = DIMENSION_FIELDS[key].find((f) => f.key === k);
        if (fieldDef && (fieldDef.type === "number" || fieldDef.type === "currency" || fieldDef.type === "percent")) {
          const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
          if (Number.isFinite(n)) cleaned[k] = n;
        } else {
          cleaned[k] = String(v);
        }
      }
      const res = await fetch(`/api/sellers/${params.id}/dimensions/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: cleaned }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || `HTTP ${res.status}`);
      setSeller(d as Seller);
      setSavedAt(new Date().toLocaleTimeString("pt-BR"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (!validKey) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm text-rose-600">Dimensão inválida.</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center gap-2 text-sm opacity-70">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      </main>
    );
  }

  if (!seller) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm opacity-70 hover:opacity-100">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <p className="text-sm text-rose-600">{error || "seller não encontrado"}</p>
      </main>
    );
  }

  const meta = DIMENSION_META[key];
  const fields = DIMENSION_FIELDS[key];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href={`/sellers/${seller.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm opacity-70 hover:opacity-100"
      >
        <ArrowLeft className="h-4 w-4" /> {seller.name}
      </Link>

      <h1 className="text-2xl font-bold">{meta.label}</h1>
      <p className="mt-1 text-sm opacity-80">{meta.description}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="mt-6 space-y-4 rounded-2xl border border-black/10 p-5 dark:border-white/10"
      >
        {fields.map((f) => {
          const value = data[f.key] ?? "";
          if (f.type === "textarea") {
            return (
              <div key={f.key}>
                <label className="mb-1 block text-sm font-medium">{f.label}</label>
                <textarea
                  value={String(value)}
                  onChange={(e) => update(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={5}
                  className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/15"
                />
                {f.help && <p className="mt-1 text-xs opacity-60">{f.help}</p>}
              </div>
            );
          }
          const inputType = f.type === "text" ? "text" : "text";
          const suffix = f.type === "percent" ? "%" : f.type === "currency" ? "R$" : "";
          return (
            <div key={f.key}>
              <label className="mb-1 block text-sm font-medium">{f.label}</label>
              <div className="flex items-center gap-2">
                {suffix && f.type === "currency" && (
                  <span className="text-sm opacity-60">{suffix}</span>
                )}
                <input
                  type={inputType}
                  inputMode={f.type === "text" ? "text" : "decimal"}
                  value={String(value)}
                  onChange={(e) => update(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/15"
                />
                {suffix && f.type === "percent" && (
                  <span className="text-sm opacity-60">{suffix}</span>
                )}
              </div>
              {f.help && <p className="mt-1 text-xs opacity-60">{f.help}</p>}
            </div>
          );
        })}

        {error && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm">
            <div className="font-medium">Erro</div>
            <div className="opacity-80">{error}</div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Salvando…" : "Salvar"}
          </button>
          {savedAt && <span className="text-xs opacity-60">Salvo às {savedAt}</span>}
          <button
            type="button"
            onClick={() => router.push(`/sellers/${seller.id}`)}
            className="ml-auto rounded-lg border border-black/15 px-3 py-2 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
          >
            Voltar ao dashboard
          </button>
        </div>
      </form>
    </main>
  );
}
