import { CRITERIA, CompanyAnalysis } from "@/lib/scoring";

const CONF_LABEL: Record<string, string> = {
  low: "baixa",
  medium: "média",
  high: "alta",
};

export function CriteriaTable({ analysis }: { analysis: CompanyAnalysis }) {
  return (
    <div className="space-y-4">
      {analysis.criteria.map((c) => {
        const def = CRITERIA.find((d) => d.key === c.key)!;
        const pct = (c.score / 10) * 100;
        return (
          <div key={c.key} className="rounded-xl border border-black/10 p-4 dark:border-white/10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">{def.label}</div>
                <div className="text-xs opacity-70">peso {def.weight} · confiança {CONF_LABEL[c.confidence]}</div>
              </div>
              <div className="text-2xl font-bold tabular-nums">{c.score.toFixed(1)}</div>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
            </div>
            {c.evidence.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm opacity-90">
                {c.evidence.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
