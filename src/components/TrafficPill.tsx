import { TrendingUp } from "lucide-react";
import { TrafficEstimate } from "@/lib/scoring";

const CONF_LABEL: Record<string, string> = {
  low: "baixa",
  medium: "média",
  high: "alta",
};

export function TrafficPill({ traffic }: { traffic?: TrafficEstimate }) {
  if (!traffic) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
      <TrendingUp className="h-3 w-3 opacity-70" />
      <span className="font-medium">{traffic.value}</span>
      {(traffic.source || traffic.confidence) && (
        <span className="opacity-60">
          ·{" "}
          {traffic.source}
          {traffic.source && traffic.confidence ? ", " : ""}
          {traffic.confidence ? `confiança ${CONF_LABEL[traffic.confidence]}` : ""}
        </span>
      )}
    </span>
  );
}
