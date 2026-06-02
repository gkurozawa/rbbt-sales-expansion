"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import { HistoricalPoint, HistoricalSeries, MIN_POINTS_REQUIRED, VariableSelection, variableLabel, variableUnit, variableId } from "@/lib/objective-types";

type Props = {
  objectiveId: string;
  variable: VariableSelection;
  initial?: HistoricalSeries;
  onSaved?: (s: HistoricalSeries) => void;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyRow(): HistoricalPoint {
  return { date: todayIso(), value: 0 };
}

function parsePaste(text: string): HistoricalPoint[] {
  // Aceita: "YYYY-MM-DD, valor[, segmento]" por linha; vírgula, tab ou ponto-e-vírgula.
  const out: HistoricalPoint[] = [];
  for (const line of text.split(/\r?\n/)) {
    const cols = line
      .trim()
      .split(/[\t,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (cols.length < 2) continue;
    let date = cols[0];
    // tolera formato DD/MM/YYYY
    const ddmm = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (ddmm) date = `${ddmm[3]}-${ddmm[2]}-${ddmm[1]}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const value = Number(cols[1].replace(",", "."));
    if (!Number.isFinite(value)) continue;
    const segment = cols[2] || undefined;
    out.push({ date, value, segment });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

export function HistoricalSeriesEditor({ objectiveId, variable, initial, onSaved }: Props) {
  const [points, setPoints] = useState<HistoricalPoint[]>(initial?.points || []);
  const [paste, setPaste] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setPoints(initial?.points || []);
  }, [initial]);

  function update(idx: number, patch: Partial<HistoricalPoint>) {
    setPoints((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }
  function add() {
    setPoints((prev) => [...prev, emptyRow()]);
  }
  function remove(idx: number) {
    setPoints((prev) => prev.filter((_, i) => i !== idx));
  }
  function ingestPaste() {
    const parsed = parsePaste(paste);
    if (parsed.length === 0) {
      setError("Não foi possível interpretar a colagem (esperado: YYYY-MM-DD,valor por linha).");
      return;
    }
    setPoints((prev) => {
      const merged = [...prev, ...parsed];
      merged.sort((a, b) => a.date.localeCompare(b.date));
      return merged;
    });
    setPaste("");
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const cleaned = points.filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.date) && Number.isFinite(p.value));
      const res = await fetch(`/api/objectives/${objectiveId}/series/${variableId(variable)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unit: variableUnit(variable), points: cleaned }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || `HTTP ${res.status}`);
      setSavedAt(new Date().toLocaleTimeString("pt-BR"));
      onSaved?.({ variableId: variableId(variable), unit: variableUnit(variable), points: cleaned, uploadedAt: new Date().toISOString() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro");
    } finally {
      setSaving(false);
    }
  }

  const enough = points.length >= MIN_POINTS_REQUIRED;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-sm font-medium">{variableLabel(variable)}</div>
          <div className="muted text-xs">
            unidade {variableUnit(variable) || "—"} ·{" "}
            <span className={enough ? "text-emerald-600" : "text-amber-600"}>
              {points.length}/{MIN_POINTS_REQUIRED}+ pontos
            </span>{" "}
            · {variable.required ? "obrigatória" : "opcional"}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        {points.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="date"
              value={p.date}
              onChange={(e) => update(i, { date: e.target.value })}
              className="surface-muted w-[140px] bg-transparent px-2 py-1 text-sm tabular"
            />
            <input
              type="text"
              inputMode="decimal"
              value={p.value}
              onChange={(e) => {
                const v = Number(e.target.value.replace(",", "."));
                update(i, { value: Number.isFinite(v) ? v : 0 });
              }}
              className="surface-muted w-[120px] bg-transparent px-2 py-1 text-sm tabular"
            />
            <input
              type="text"
              placeholder="segmento (opcional, ex.: ML)"
              value={p.segment || ""}
              onChange={(e) => update(i, { segment: e.target.value || undefined })}
              className="surface-muted w-[180px] bg-transparent px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="muted hover:text-rose-600"
              title="remover"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2.5 py-1 text-xs hover:bg-[var(--surface-2)]"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar linha
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)] px-2.5 py-1 text-xs font-medium text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Salvar série
        </button>
        {savedAt && <span className="muted text-xs">Salvo {savedAt}</span>}
      </div>

      <details className="muted text-xs">
        <summary className="cursor-pointer">Colar CSV (YYYY-MM-DD,valor[,segmento])</summary>
        <div className="mt-2 flex gap-2">
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={3}
            placeholder={`2025-12-01,6.1,ML\n2026-01-01,5.8,ML\n2026-02-01,5.5,ML`}
            className="surface-muted w-full bg-transparent px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={ingestPaste}
            className="inline-flex items-center gap-1 self-start rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--surface-2)]"
          >
            <Upload className="h-3.5 w-3.5" /> Importar
          </button>
        </div>
      </details>

      {error && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-600">
          {error}
        </div>
      )}
    </div>
  );
}
