import { jsonrepair } from "jsonrepair";
import { callClaude } from "./claude-cli";
import { loadSkillBody } from "./skill-loader";
import {
  CRITERIA,
  CompanyAnalysis,
  CriterionKey,
  CriterionScore,
  TrafficEstimate,
  Verdict,
  computeTotal,
} from "./scoring";

const CRITERIA_BLOCK = CRITERIA.map(
  (c) => `- ${c.key} ("${c.label}", peso ${c.weight}): ${c.description} ${c.scoreMeaning}`
).join("\n");

const CHAT_RESEARCH_METHODOLOGY = loadSkillBody("pesquisar-atendimento-chat");

const SCHEMA_HINT = `{
  "company": "string",
  "overview": "1-2 frases descrevendo o que a empresa faz e onde opera",
  "verdict": "vender | qualificar | passar",
  "verdictHeadline": "1 frase direta respondendo: vale a pena vender RBBT Sales para essa empresa? Por quê?",
  "monthlyTraffic": {
    "value": "tráfego mensal aproximado do site principal, em formato humano (ex.: '~2,5 mi visitas/mês', '~80k visitas/mês'). Se não souber, omita o campo monthlyTraffic inteiro.",
    "source": "fonte principal: 'SimilarWeb', 'estudo setorial NeoTrust/Compre&Confie', 'relatório anual da empresa', 'reportagem', etc.",
    "confidence": "low | medium | high — quão confiável é essa estimativa"
  },
  "criteria": [
    { "key": "${CRITERIA[0].key}", "score": 0-10, "confidence": "low|medium|high", "evidence": ["fato público 1", "fato público 2"] }
    // ... uma entrada por critério, na mesma ordem
  ],
  "overallConfidence": "low|medium|high",
  "opportunity": "2-3 frases — por que (ou não) essa empresa é alvo do RBBT Sales",
  "redFlags": ["razões para não priorizar, se houver"],
  "sources": ["canais públicos que você consultou em seu conhecimento, ex.: 'site oficial', 'Reclame Aqui', 'Instagram', 'TikTok', 'SimilarWeb'"]
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
6. Verdict: dê um veredito comercial direto:
   - "vender" → vale a pena priorizar essa empresa agora; o encaixe com RBBT Sales é claro
   - "qualificar" → há sinais positivos mas também lacunas; precisa de mais discovery antes de investir tempo comercial
   - "passar" → não é fit no momento (já omnicanal, B2B puro, atendimento já maduro, ou contradiz a tese)
7. VerdictHeadline: uma única frase que responde "é ou não é bom fit pra vender RBBT Sales?" com a razão principal.
8. MonthlyTraffic: estime o tráfego mensal do site principal da empresa usando as referências MAIS CONFIÁVEIS que você conhecer (SimilarWeb, NeoTrust/Compre&Confie, relatórios anuais, mídia setorial). Indique a fonte e a confidence (low|medium|high). Se a empresa for puramente offline ou não houver dados confiáveis, omita o campo monthlyTraffic. NÃO invente números — prefira omitir a chutar.
${
  CHAT_RESEARCH_METHODOLOGY
    ? `\nMETODOLOGIA APROFUNDADA — atendimento por chat (aplicar especialmente aos critérios "customer_dissatisfaction", "service_capacity_gap", "channel_immaturity" e "integration_gap"):\n\n${CHAT_RESEARCH_METHODOLOGY}\n\nIMPORTANTE: incorpore esses sinais às evidências de cada critério acima. Não devolva a estrutura Markdown da metodologia — devolva apenas o JSON final do schema abaixo.\n`
    : ""
}
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
  verdict?: string;
  verdictHeadline?: string;
  monthlyTraffic?: { value?: unknown; source?: unknown; confidence?: unknown };
  criteria?: Array<{ key?: string; score?: number; confidence?: string; evidence?: string[] }>;
  overallConfidence?: string;
  opportunity?: string;
  redFlags?: string[];
  sources?: string[];
};

export function normalizeTraffic(raw: unknown): TrafficEstimate | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as { value?: unknown; source?: unknown; confidence?: unknown };
  const value = typeof obj.value === "string" ? obj.value.trim() : "";
  if (!value) return undefined;
  const conf = String(obj.confidence || "").toLowerCase();
  const confidence: TrafficEstimate["confidence"] =
    conf === "low" || conf === "medium" || conf === "high" ? conf : undefined;
  const source = typeof obj.source === "string" ? obj.source.trim() : undefined;
  return { value, source: source || undefined, confidence };
}

function normalizeVerdict(v: unknown, totalScore: number): Verdict {
  const s = String(v || "").toLowerCase();
  if (s === "vender" || s === "qualificar" || s === "passar") return s;
  // fallback derivado do score se o LLM não retornar
  if (totalScore >= 65) return "vender";
  if (totalScore >= 40) return "qualificar";
  return "passar";
}

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

  const totalScore = computeTotal(criteria);
  return {
    company: raw.company || fallbackCompany,
    overview: raw.overview || "",
    verdict: normalizeVerdict(raw.verdict, totalScore),
    verdictHeadline: raw.verdictHeadline || "",
    monthlyTraffic: normalizeTraffic(raw.monthlyTraffic),
    criteria,
    totalScore,
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
