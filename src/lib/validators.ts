import "server-only";
import {
  CheckStatus,
  HistoricalSeries,
  MIN_POINTS_REQUIRED,
  Objective,
  ValidationCheck,
  ValidationReport,
  variableId,
  variableLabel,
} from "./objective-types";
import { DIMENSION_FIELDS } from "./seller-types";

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const sq = xs.map((x) => (x - m) ** 2);
  return Math.sqrt(mean(sq));
}

// faixa razoável por tipo de campo
function rangeFor(fieldType: "currency" | "percent" | "number" | "text" | "textarea"): { min: number; max: number } | null {
  if (fieldType === "percent") return { min: 0, max: 100 };
  if (fieldType === "currency" || fieldType === "number") return { min: 0, max: Number.MAX_SAFE_INTEGER };
  return null;
}

export function validateObjective(o: Objective): ValidationReport {
  const checks: ValidationCheck[] = [];
  let worst: CheckStatus = "pass";

  function bump(s: CheckStatus) {
    if (s === "fail") worst = "fail";
    else if (s === "warn" && worst !== "fail") worst = "warn";
  }

  for (const v of o.variables) {
    const vid = variableId(v);
    const series: HistoricalSeries | undefined = o.series[vid];
    const fieldDef = DIMENSION_FIELDS[v.dimension].find((f) => f.key === v.fieldKey);
    const label = variableLabel(v);

    // 1) Completeness
    if (!series || series.points.length === 0) {
      const status: CheckStatus = v.required ? "fail" : "warn";
      bump(status);
      checks.push({
        variableId: vid,
        type: "completeness",
        status,
        message: v.required
          ? `${label}: nenhum dado histórico fornecido (obrigatório).`
          : `${label}: nenhum dado fornecido (opcional, mas reforça a recomendação).`,
        suggestion: `Forneça pelo menos ${MIN_POINTS_REQUIRED} pontos históricos (semanais ou mensais).`,
      });
      continue;
    }

    if (series.points.length < MIN_POINTS_REQUIRED) {
      const status: CheckStatus = v.required ? "fail" : "warn";
      bump(status);
      checks.push({
        variableId: vid,
        type: "completeness",
        status,
        message: `${label}: apenas ${series.points.length} ponto(s) — esperado >= ${MIN_POINTS_REQUIRED}.`,
        suggestion: `Adicione mais pontos pra capturar variação real (idealmente cobrindo ${o.horizonDays} dias ou mais).`,
      });
    } else {
      checks.push({
        variableId: vid,
        type: "completeness",
        status: "pass",
        message: `${label}: ${series.points.length} pontos OK.`,
      });
    }

    const values = series.points.map((p) => p.value).filter((n) => Number.isFinite(n));
    if (values.length === 0) {
      bump("fail");
      checks.push({
        variableId: vid,
        type: "range",
        status: "fail",
        message: `${label}: nenhum valor numérico utilizável.`,
      });
      continue;
    }

    // 2) Range — valores fora da faixa esperada (% só entre 0 e 100, etc.)
    if (fieldDef) {
      const range = rangeFor(fieldDef.type);
      if (range) {
        const outOfRange = values.filter((x) => x < range.min || x > range.max);
        if (outOfRange.length > 0) {
          bump("warn");
          checks.push({
            variableId: vid,
            type: "range",
            status: "warn",
            message: `${label}: ${outOfRange.length} valor(es) fora da faixa esperada (${range.min}–${range.max}).`,
            suggestion: "Confira se a unidade está correta (ex.: 0,08 vs 8 para 8%).",
          });
        }
      }
    }

    // 3) Outliers — |x - μ| > 3σ
    if (values.length >= 4) {
      const m = mean(values);
      const sd = stdev(values);
      if (sd > 0) {
        const outliers = values.filter((x) => Math.abs(x - m) > 3 * sd);
        if (outliers.length > 0) {
          bump("warn");
          checks.push({
            variableId: vid,
            type: "outlier",
            status: "warn",
            message: `${label}: ${outliers.length} ponto(s) > 3σ. Pode ser sazonalidade real ou erro de entrada.`,
            suggestion: "Anote se houve campanha/sazonalidade nesses períodos.",
          });
        }
      }
    }

    // 4) Trend — direção observada (info, não bloqueia)
    if (values.length >= 4) {
      const first = mean(values.slice(0, Math.max(1, Math.floor(values.length / 3))));
      const last = mean(values.slice(-Math.max(1, Math.floor(values.length / 3))));
      if (first !== 0) {
        const delta = (last - first) / Math.abs(first);
        const dir = delta > 0.05 ? "↑" : delta < -0.05 ? "↓" : "→";
        checks.push({
          variableId: vid,
          type: "trend",
          status: "pass",
          message: `${label}: tendência ${dir} (${(delta * 100).toFixed(0)}% comparando início vs fim).`,
        });
      }
    }
  }

  return {
    overall: worst,
    checks,
    generatedAt: new Date().toISOString(),
  };
}
