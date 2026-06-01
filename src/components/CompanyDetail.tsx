import { CompanyAnalysis, VERDICT_META } from "@/lib/scoring";
import { ScoreBadge } from "./ScoreBadge";
import { CriteriaTable } from "./CriteriaTable";
import { TrafficPill } from "./TrafficPill";

const CONF_LABEL: Record<string, string> = {
  low: "baixa",
  medium: "média",
  high: "alta",
};

export function CompanyDetail({ analysis }: { analysis: CompanyAnalysis }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">{analysis.company}</h3>
          <p className="mt-1 max-w-2xl text-sm opacity-80">{analysis.overview}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="opacity-60">Confiança geral: {CONF_LABEL[analysis.overallConfidence]}</span>
            <TrafficPill traffic={analysis.monthlyTraffic} />
          </div>
        </div>
        <ScoreBadge value={analysis.totalScore} />
      </div>

      <div className={`rounded-2xl p-5 text-white shadow-sm ${VERDICT_META[analysis.verdict].bg}`}>
        <div className="text-xs font-semibold uppercase tracking-widest opacity-90">Veredito</div>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="text-2xl font-bold">{VERDICT_META[analysis.verdict].label}</span>
          <span className="text-sm opacity-90">{VERDICT_META[analysis.verdict].description}</span>
        </div>
        {analysis.verdictHeadline && (
          <p className="mt-2 text-sm leading-relaxed">{analysis.verdictHeadline}</p>
        )}
      </div>

      {analysis.opportunity && (
        <div className="rounded-2xl bg-indigo-50 p-4 text-sm leading-relaxed dark:bg-indigo-950/30">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">Oportunidade</div>
          <p>{analysis.opportunity}</p>
        </div>
      )}

      {analysis.redFlags.length > 0 && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-70">Red flags</div>
          <ul className="list-disc space-y-1 pl-5">
            {analysis.redFlags.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}

      <div>
        <h4 className="mb-3 text-base font-semibold">Detalhamento por critério</h4>
        <CriteriaTable analysis={analysis} />
      </div>

      {analysis.sources.length > 0 && (
        <div className="text-xs opacity-60">
          <span className="font-semibold">Fontes consultadas pelo modelo:</span>{" "}
          {analysis.sources.join(", ")}
        </div>
      )}
    </div>
  );
}
