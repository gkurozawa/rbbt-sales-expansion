import { jsonrepair } from "jsonrepair";
import { callClaude } from "./claude-cli";
import {
  CRITERIA,
  CompanyAnalysis,
  CriterionKey,
  CriterionScore,
  computeTotal,
} from "./scoring";

const CRITERIA_BLOCK = CRITERIA.map(
  (c) => `- ${c.key} ("${c.label}", peso ${c.weight}): ${c.description} ${c.scoreMeaning}`
).join("\n");

const SCHEMA_HINT = `{
  "company": "string",
  "overview": "1-2 frases descrevendo o que a empresa faz e onde opera",
  "criteria": [
    { "key": "${CRITERIA[0].key}", "score": 0-10, "confidence": "low|medium|high", "evidence": ["fato público 1", "fato público 2"] }
    // ... uma entrada por critério, na mesma ordem
  ],
  "overallConfidence": "low|medium|high",
  "opportunity": "2-3 frases — por que (ou não) essa empresa é alvo do RBBT Sales",
  "redFlags": ["razões para não priorizar, se houver"],
  "sources": ["canais públicos que você consultou em seu conhecimento, ex.: 'site oficial', 'Reclame Aqui', 'Instagram', 'TikTok'"]
}`;

function buildPrompt(input: { company: string; url?: string; notes?: string }): string {
  return `Você é analista do RBBT Sales — uma plataforma de venda conversacional via WhatsApp que ajuda clientes a navegarem pelo catálogo de empresas de varejo.

OBJETIVO: avaliar se a empresa abaixo é uma boa candidata para usar o RBBT Sales. Uma empresa é melhor candidata quando:
- Tem lojas físicas E ecommerce (ou só ecommerce), com pouca integração entre eles
- Tem canais digitais pouco maduros
- Tem clientes insatisfeitos (NPS baixo, muitas reclamações públicas)
- Tem portfólio amplo de produtos e categorias
- Tem muitas lojas físicas
- Tem capacidade limitada de atender consumidores (atendimento saturado, lento, ruim)

EMPRESA A AVALIAR:
- Nome: ${input.company}
${input.url ? `- URL: ${input.url}` : ""}
${input.notes ? `- Notas adicionais: ${input.notes}` : ""}

CRITÉRIOS (cada um 0 a 10, onde 10 = mais atrativo como alvo do RBBT Sales):
${CRITERIA_BLOCK}

INSTRUÇÕES:
1. Use seu conhecimento sobre a empresa e fontes públicas brasileiras que você conhece (Reclame Aqui, redes sociais, mídia, site oficial).
2. Para cada critério, dê um score 0-10, uma confidence (low/medium/high) e 1-3 evidências objetivas e verificáveis.
3. Se você não tem informação suficiente sobre algum critério, use confidence "low" e um score conservador.
4. Liste redFlags se a empresa NÃO for boa candidata (ex.: já é totalmente omnicanal, ou opera só B2B).
5. Sources: liste os tipos de fonte que você usou (ex.: "site oficial", "Reclame Aqui", "Instagram", "reportagens").

Responda APENAS com um JSON válido seguindo este schema (sem prosa antes ou depois, sem markdown, sem \`\`\`):
${SCHEMA_HINT}`;
}

function safeParse(raw: string): unknown {
  // Remove fences caso o modelo decida usar ```json
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return JSON.parse(jsonrepair(cleaned));
  }
}

type RawAnalysis = {
  company?: string;
  overview?: string;
  criteria?: Array<{ key?: string; score?: number; confidence?: string; evidence?: string[] }>;
  overallConfidence?: string;
  opportunity?: string;
  redFlags?: string[];
  sources?: string[];
};

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function normalizeConfidence(c: unknown): "low" | "medium" | "high" {
  const v = String(c || "").toLowerCase();
  if (v === "high" || v === "medium" || v === "low") return v;
  return "low";
}

function normalize(raw: RawAnalysis, fallbackCompany: string): CompanyAnalysis {
  const knownKeys = new Set<string>(CRITERIA.map((c) => c.key));
  const byKey = new Map<CriterionKey, CriterionScore>();
  for (const item of raw.criteria ?? []) {
    if (!item.key || !knownKeys.has(item.key)) continue;
    byKey.set(item.key as CriterionKey, {
      key: item.key as CriterionKey,
      score: clamp(Number(item.score ?? 0), 0, 10),
      confidence: normalizeConfidence(item.confidence),
      evidence: Array.isArray(item.evidence) ? item.evidence.slice(0, 3).map(String) : [],
    });
  }
  // Garante uma entrada por critério na ordem oficial
  const criteria: CriterionScore[] = CRITERIA.map(
    (def) =>
      byKey.get(def.key) ?? {
        key: def.key,
        score: 0,
        confidence: "low",
        evidence: ["Sem informação suficiente."],
      }
  );

  return {
    company: raw.company || fallbackCompany,
    overview: raw.overview || "",
    criteria,
    totalScore: computeTotal(criteria),
    overallConfidence: normalizeConfidence(raw.overallConfidence),
    opportunity: raw.opportunity || "",
    redFlags: Array.isArray(raw.redFlags) ? raw.redFlags.map(String) : [],
    sources: Array.isArray(raw.sources) ? raw.sources.map(String) : [],
  };
}

export async function analyzeCompany(input: {
  company: string;
  url?: string;
  notes?: string;
}): Promise<CompanyAnalysis> {
  const prompt = buildPrompt(input);
  const raw = await callClaude(prompt, 180_000);
  const parsed = safeParse(raw) as RawAnalysis;
  return normalize(parsed, input.company);
}
