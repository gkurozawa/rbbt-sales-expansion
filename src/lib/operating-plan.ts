import "server-only";
import { randomBytes } from "crypto";
import { callClaude } from "./claude-cli";
import { safeParseJSON } from "./json-parse";
import { dimensionCoverage } from "./sellers";
import {
  CHANNEL_LABEL,
  DIMENSION_FIELDS,
  DIMENSION_META,
  DIMENSION_ORDER,
  DimensionKey,
  OperatingPlan,
  PlanAction,
  Seller,
  VERTICAL_LABEL,
} from "./seller-types";

function fmtCurrency(n: number | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function describeDimension(key: DimensionKey, seller: Seller): string {
  const meta = DIMENSION_META[key];
  const fields = DIMENSION_FIELDS[key];
  const dim = seller.dimensions?.[key];
  if (!dim || !dim.filled) {
    return `### ${meta.label}\n[DADO INSUFICIENTE — apontar como gap]\n`;
  }
  const lines: string[] = [`### ${meta.label}`];
  for (const f of fields) {
    const v = dim.data[f.key];
    if (v === undefined || v === null || v === "") continue;
    if (f.key === "context") {
      lines.push(`Contexto: ${String(v).trim()}`);
    } else {
      lines.push(`- ${f.label}: ${v}`);
    }
  }
  return lines.join("\n");
}

function buildPrompt(seller: Seller): string {
  const dimensionsBlock = DIMENSION_ORDER.map((k) => describeDimension(k, seller)).join("\n\n");

  return `Você é o AI Business Operator do RBBT para sellers profissionais brasileiros que operam em múltiplos canais (Mercado Livre, Amazon, Shopee, Magalu, loja própria etc.). Seu output é um plano operacional curto, priorizado e justificado — não um relatório.

PERFIL DO SELLER
- Nome: ${seller.name}
- Vertical: ${VERTICAL_LABEL[seller.vertical]}
- Canais ativos: ${seller.channels.map((c) => CHANNEL_LABEL[c]).join(", ")}
- Receita mensal informada: ${fmtCurrency(seller.monthlyRevenue)}
- SKUs ativos: ${seller.skuCount ?? "—"}
${seller.notes ? `- Notas: ${seller.notes}` : ""}

DADOS POR DIMENSÃO (oito frentes que o operador gerencia)
${dimensionsBlock}

OBJETIVO
Gere um plano operacional priorizado com 5 a 8 ações concretas que esse seller deveria executar AGORA pra crescer receita, proteger margem e reduzir risco. Cada ação deve:
- Vir no IMPERATIVO ("Aumente preço dos SKUs Z em 4%", "Pause campanhas X com ROAS abaixo do break-even", "Reforce estoque de Y antes da próxima sazonalidade")
- Estar atrelada a UMA dimensão das oito disponíveis
- Ter uma prioridade ("alta" / "media" / "baixa")
- Ter uma justificativa em 1-3 frases ligando o dado disponível
- Ter 1 ou 2 impactos esperados quantificados (mesmo que como faixa) com confidence (baixa/media/alta)
- Quando aplicável, sinalizar guardrail — o que pode dar errado / quando NÃO executar
- Quando possível, citar evidências específicas do dado do seller (números ou trechos do contexto)

REGRAS DE NEUTRALIDADE
- Não recomende algo só porque o canal recomendaria (ex.: "amplie ads no ML"). Recomende pelo lucro líquido.
- Se a dimensão está com "[DADO INSUFICIENTE]", aponte como gap em uma nota separada, NÃO invente.
- Não use jargão de relatório. Frases curtas.

FORMATO DA RESPOSTA
Devolva APENAS este JSON (sem markdown, sem prosa antes/depois):

{
  "headline": "1-2 frases — o que mais importa pra esse seller essa semana",
  "topActions": [
    {
      "dimension": "uma das chaves: receita | margem | ads | preco | estoque | catalogo | operacao | atendimento",
      "priority": "alta | media | baixa",
      "title": "ação no imperativo, curta",
      "rationale": "1-3 frases justificando",
      "impacts": [
        { "metric": "Margem líquida", "estimate": "+1,5 p.p. em 60 dias", "confidence": "media" }
      ],
      "evidence": ["referência objetiva ao dado do seller — número ou trecho"],
      "guardrail": "opcional — o que pode dar errado ou quando NÃO executar"
    }
  ],
  "notes": "opcional — gaps de dado, hipóteses assumidas, próxima discovery sugerida"
}
`;
}

const PRIORITY_ORDER = { alta: 0, media: 1, baixa: 2 } as const;

type RawAction = {
  dimension?: string;
  priority?: string;
  title?: string;
  rationale?: string;
  impacts?: Array<{ metric?: string; estimate?: string; confidence?: string }>;
  evidence?: string[];
  guardrail?: string;
};

function normalizeAction(raw: RawAction): PlanAction | null {
  const dimension = raw.dimension as DimensionKey;
  if (!DIMENSION_ORDER.includes(dimension)) return null;
  const priority = (["alta", "media", "baixa"] as const).includes(
    raw.priority as "alta" | "media" | "baixa"
  )
    ? (raw.priority as "alta" | "media" | "baixa")
    : "media";
  const title = (raw.title || "").trim();
  if (!title) return null;
  return {
    id: randomBytes(3).toString("hex"),
    dimension,
    priority,
    title,
    rationale: (raw.rationale || "").trim(),
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
    evidence: Array.isArray(raw.evidence) ? raw.evidence.map(String) : undefined,
    guardrail: typeof raw.guardrail === "string" && raw.guardrail.trim() ? raw.guardrail.trim() : undefined,
  };
}

export async function generateOperatingPlan(seller: Seller): Promise<OperatingPlan> {
  const prompt = buildPrompt(seller);
  const raw = await callClaude(prompt, 240_000);
  const parsed = safeParseJSON(raw) as {
    headline?: string;
    topActions?: RawAction[];
    notes?: string;
  };

  const actions: PlanAction[] = (parsed.topActions || [])
    .map(normalizeAction)
    .filter((a): a is PlanAction => a !== null)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  return {
    sellerId: seller.id,
    generatedAt: new Date().toISOString(),
    headline: (parsed.headline || "").trim(),
    topActions: actions,
    coverage: dimensionCoverage(seller),
    notes: parsed.notes?.trim() || undefined,
  };
}
