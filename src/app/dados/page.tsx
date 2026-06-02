"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Database } from "lucide-react";
import { Objective, variableId, variableLabel } from "@/lib/objective-types";

type Row = {
  objectiveId: string;
  objectiveTitle: string;
  variableId: string;
  variableLabel: string;
  points: number;
  uploadedAt: string;
};

export default function DadosPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/objectives")
      .then((r) => r.json())
      .then(({ objectives }: { objectives: Objective[] }) => {
        const out: Row[] = [];
        for (const o of objectives) {
          for (const v of o.variables) {
            const s = o.series[variableId(v)];
            if (!s) continue;
            out.push({
              objectiveId: o.id,
              objectiveTitle: o.title,
              variableId: variableId(v),
              variableLabel: variableLabel(v),
              points: s.points.length,
              uploadedAt: s.uploadedAt,
            });
          }
        }
        out.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
        setRows(out);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="text-xs font-medium uppercase tracking-wider muted">Inventário</div>
      <h1 className="h-display mt-1 text-2xl">Dados históricos</h1>
      <p className="muted mt-2 max-w-2xl text-sm leading-relaxed">
        Todas as séries que o seller forneceu, agrupadas por objetivo.
      </p>

      {loading && <div className="muted mt-6 text-sm">Carregando…</div>}

      {!loading && rows.length === 0 && (
        <div className="surface mt-6 flex items-center gap-3 px-5 py-6 text-sm">
          <Database className="h-4 w-4 muted" />
          <p className="muted">Nenhuma série enviada ainda. Crie um objetivo para começar.</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="surface mt-6 divide-y divide-[var(--border)]">
          {rows.map((r, i) => (
            <Link
              key={i}
              href={`/objetivos/${r.objectiveId}`}
              className="flex items-center justify-between px-5 py-3 transition hover:bg-[var(--surface-2)]"
            >
              <div>
                <div className="text-sm font-medium">{r.variableLabel}</div>
                <div className="muted text-xs">
                  Objetivo: {r.objectiveTitle} · {r.points} pontos
                </div>
              </div>
              <div className="muted text-xs">
                {new Date(r.uploadedAt).toLocaleString("pt-BR")}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
