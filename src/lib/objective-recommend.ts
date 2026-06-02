import "server-only";
import { randomBytes } from "crypto";
import { callClaude } from "./claude-cli";
import { safeParseJSON } from "./json-parse";
import {
  CATEGORY_LABEL,
  Objective,
  Recommendation,
  RecommendationPriority,
  RecommendationSet,
  variableId,
  variableLabel,
} from "./objective-types";

function fmt(n: number | undefined, unit: string): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  if (unit === "R$") return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  if (unit === "%" || unit === "p.p.") return `${n}${unit === "p.p." ? " p.p." : "%"}`;
  return `${n}${unit ? ` ${unit}` : ""}`;
}

function describeSeries(o: Objective): string {
  const lines: string[] = [];
  for (const v of o.variables) {
    const vid = variableId(v);
    const s = o.series[vid];
    const label = variableLabel(v);
    if (!s || s.points.length === 0) {
      lines.push(`- ${label} [${vid}]: SEM DADO HISTÓRICO`);
      continue;
    }
    const sorted = [...s.points].sort((a, b) => a.date.localeCompare(b.date));
    const sample = sorted.map((p) => `${p.date}:${p.value}${p.segment ? `(${p.segment})` : ""}`).join(", ");
    lines.push(`- ${label} [${vid}], unidade ${s.unit || "—"}: ${sample}`);
  }
  return lines.join("\n");
}

function describeValidation(o: Objective): string {
  if (!o.validation) return "(sem validação prévia)";
  const lines = o.validation.checks.map(
    (c) => `  - [${c.status.toUpperCase()}] ${c.message}${c.suggestion ? ` (sugestão: ${c.suggestion})` : ""}`
  );
  return `Status geral: ${o.validation.overall.toUpperCase()}\n${lines.join("\n")}`;
}

function buildPrompt(o: Objective): string {
  return `Você é o AI Business Operator do RBBT para sellers profissionais que operam em múltiplos canais. O seller definiu um OBJETIVO claro e enviou DADOS HISTÓRICOS por variável. Sua resposta é um conjunto curto, priorizado e justificado de RECOMENDAÇÕES — ações concretas para mover o ponteiro do objetivo dentro do horizonte.

OBJETIVO
- Título: ${o.title}
- Categoria: ${CATEGORY_LABEL[o.category]}
- Métrica: ${o.metricLabel}
- Direção desejada: ${o.direction === "up" ? "subir" : "descer"}
- Baseline informado: ${o.baseline !== undefined ? fmt(o.baseline, o.metricUnit) : "não informado"}
- Meta: ${fmt(o.target, o.metricUnit)}
- Horizonte: ${o.horizonDays} dias
- Descrição do seller: ${o.description || "(vazio)"}

DADOS HISTÓRICOS POR VARIÁVEL (cada bullet é uma série temporal: data:valor[(segmento)])
${describeSeries(o)}

VALIDAÇÃO PRÉVIA (sinais sobre confiabilidade dos dados — use para calibrar confidence)
${describeValidation(o)}

REGRAS
- Trate cada recomendação como AÇÃO concreta, no imperativo, dentro do horizonte. Sem jargão de relatório.
- Para CADA recomendação, escolha a variável que MAIS sustenta a ação (campo variableId = "dimensão.fieldKey" exatamente como aparece nos dados acima).
- Use evidence pra citar números/observações concretas dos dados históricos (ex.: "ROAS cai de 4,2x para 3,5x nos últimos 8 períodos") — não invente.
- Quantifique 1-2 impactos esperados, com confidence (baixa/media/alta) calibrada pela qualidade dos dados (se a validação foi fail/warn, prefira confidence menor).
- Quando aplicável, defina guardrail — o que pode dar errado / quando NÃO executar.
- Headline em 1-2 frases — o vetor principal pra mover o objetivo.
- Notes — gaps, hipóteses e próxima discovery útil.

FORMATO (responda APENAS este JSON, sem markdown, sem prosa antes/depois)
{
  "headline": "1-2 frases",
  "recommendations": [
    {
      "variableId": "dimensão.fieldKey conforme dados acima",
      "priority": "alta | media | baixa",
      "title": "ação imperativa curta",
      "rationale": "1-3 frases conectando ao objetivo",
      "evidence": ["referência objetiva ao histórico"],
      "impacts": [
        { "metric": "Métrica afetada", "estimate": "ex.: +1,5 p.p. em 60 dias", "confidence": "baixa | media | alta" }
      ],
      "guardrail": "opcional — risco / contraindicação"
    }
  ],
  "notes": "opcional — gaps, próxima discovery"
}
`;
}

const PRIORITY_ORDER: Record<RecommendationPriority, number> = { alta: 0, media: 1, baixa: 2 };

type RawRec = {
  variableId?: string;
  priority?: string;
  title?: string;
  rationale?: string;
  evidence?: string[];
  impacts?: Array<{ metric?: string; estimate?: string; confidence?: string }>;
  guardrail?: string;
};

function normalize(raw: RawRec, knownVarIds: Set<string>): Recommendation | null {
  const title = (raw.title || "").trim();
  if (!title) return null;
  const vid = typeof raw.variableId === "string" && knownVarIds.has(raw.variableId) ? raw.variableId : "";
  const priority = (["alta", "media", "baixa"] as const).includes(
    raw.priority as RecommendationPriority
  )
    ? (raw.priority as RecommendationPriority)
    : "media";
  return {
    id: randomBytes(3).toString("hex"),
    variableId: vid,
    priority,
    title,
    rationale: (raw.rationale || "").trim(),
    evidence: Array.isArray(raw.evidence) ? raw.evidence.map(String) : [],
    impacts: Array.isArray(raw.impacts)
      ? raw.impacts
          .filter((i) => i && typeof i.metric === "string" && typeof i.estimate === "string")
          .map((i) => ({
            metric: String(i.metric),
            estimate: String(i.estimate),
            confidence:
              i.confidence === "alta" || i.confidence === "media" || i.confidence === "baixa"
                ? i.confidence
                : "media",
          }))
      : [],
    guardrail: typeof raw.guardrail === "string" && raw.guardrail.trim() ? raw.guardrail.trim() : undefined,
  };
}

export async function generateRecommendations(o: Objective): Promise<RecommendationSet> {
  const prompt = buildPrompt(o);
  const raw = await callClaude(prompt, 240_000);
  const parsed = safeParseJSON(raw) as {
    headline?: string;
    recommendations?: RawRec[];
    notes?: string;
  };
  const knownVarIds = new Set(o.variables.map(variableId));
  const recs = (parsed.recommendations || [])
    .map((r) => normalize(r, knownVarIds))
    .filter((r): r is Recommendation => r !== null)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  return {
    objectiveId: o.id,
    generatedAt: new Date().toISOString(),
    headline: (parsed.headline || "").trim(),
    recommendations: recs,
    notes: parsed.notes?.trim() || undefined,
  };
}
