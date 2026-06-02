// Domínio do AI Business Operator orientado a objetivos (client-safe).

import {
  DIMENSION_FIELDS,
  DIMENSION_META,
  DimensionKey,
} from "./seller-types";

export type ObjectiveCategory =
  | "margin"
  | "capital"
  | "growth"
  | "ads-efficiency"
  | "service"
  | "stockout"
  | "custom";

export const CATEGORY_LABEL: Record<ObjectiveCategory, string> = {
  margin: "Margem",
  capital: "Capital",
  growth: "Crescimento",
  "ads-efficiency": "Eficiência de ads",
  service: "Atendimento",
  stockout: "Anti-ruptura",
  custom: "Custom",
};

export type ObjectiveStatus = "draft" | "data" | "validation" | "ready" | "archived";

export const STATUS_LABEL: Record<ObjectiveStatus, string> = {
  draft: "Rascunho",
  data: "Aguardando dados",
  validation: "Em validação",
  ready: "Pronto",
  archived: "Arquivado",
};

export type Direction = "up" | "down";

// Variável = par (dimensão + key do campo definido em DIMENSION_FIELDS) sob a qual o seller envia histórico.
export type VariableSelection = {
  dimension: DimensionKey;
  fieldKey: string;             // chave dentro de DIMENSION_FIELDS[dimension]
  required: boolean;
};

export type HistoricalPoint = {
  date: string;                  // ISO date (YYYY-MM-DD)
  value: number;
  segment?: string;              // ex.: canal (ML, Amazon, DTC) — opcional
};

export type HistoricalSeries = {
  variableId: string;            // `${dimension}.${fieldKey}`
  unit?: string;                  // "R$", "%", "p.p.", "unid"
  points: HistoricalPoint[];
  uploadedAt: string;
};

export type CheckType = "completeness" | "range" | "outlier" | "trend" | "consistency";
export type CheckStatus = "pass" | "warn" | "fail";

export type ValidationCheck = {
  variableId: string;
  type: CheckType;
  status: CheckStatus;
  message: string;
  suggestion?: string;
};

export type ValidationReport = {
  overall: CheckStatus;
  checks: ValidationCheck[];
  generatedAt: string;
};

export type RecommendationPriority = "alta" | "media" | "baixa";

export const PRIORITY_META: Record<
  RecommendationPriority,
  { label: string; bg: string; ring: string; dot: string }
> = {
  alta: { label: "Alta", bg: "bg-rose-50 dark:bg-rose-950/30", ring: "ring-rose-500/20", dot: "bg-rose-500" },
  media: { label: "Média", bg: "bg-amber-50 dark:bg-amber-950/20", ring: "ring-amber-500/20", dot: "bg-amber-500" },
  baixa: { label: "Baixa", bg: "bg-slate-50 dark:bg-slate-900/30", ring: "ring-slate-400/20", dot: "bg-slate-400" },
};

export type RecommendationImpact = {
  metric: string;          // ex.: "Margem líquida"
  estimate: string;        // ex.: "+1,5 p.p. em 60 dias"
  confidence: "baixa" | "media" | "alta";
};

export type Recommendation = {
  id: string;
  variableId: string;       // variável que mais sustenta a ação
  priority: RecommendationPriority;
  title: string;
  rationale: string;
  evidence: string[];       // pontos do histórico que sustentam
  impacts: RecommendationImpact[];
  guardrail?: string;
};

export type RecommendationSet = {
  objectiveId: string;
  generatedAt: string;
  headline: string;
  recommendations: Recommendation[];
  notes?: string;           // observações, gaps adicionais
};

export type Objective = {
  id: string;
  title: string;
  description?: string;
  category: ObjectiveCategory;
  templateId?: string;
  metricLabel: string;      // "Margem líquida"
  metricUnit: string;        // "%", "p.p.", "R$"
  baseline?: number;
  target: number;
  direction: Direction;
  horizonDays: number;
  status: ObjectiveStatus;
  variables: VariableSelection[];
  series: Record<string, HistoricalSeries>;   // chave = `${dimension}.${fieldKey}`
  validation?: ValidationReport;
  recommendations?: RecommendationSet;
  createdAt: string;
  updatedAt: string;
};

export const MIN_POINTS_REQUIRED = 6;  // mínimo de pontos pra validar uma série

// ---------------- Templates ----------------

export type ObjectiveTemplate = {
  id: string;
  category: ObjectiveCategory;
  title: string;
  shortDescription: string;
  rationale: string;
  metricLabel: string;
  metricUnit: string;
  direction: Direction;
  defaultHorizonDays: number;
  variables: VariableSelection[];
};

const v = (dimension: DimensionKey, fieldKey: string, required = true): VariableSelection => ({
  dimension,
  fieldKey,
  required,
});

export const OBJECTIVE_TEMPLATES: ObjectiveTemplate[] = [
  {
    id: "margin-up",
    category: "margin",
    title: "Aumentar margem líquida",
    shortDescription: "Sair da margem atual e chegar à meta no horizonte definido — preservando receita.",
    rationale:
      "A IA olha onde a margem está sangrando (canais, SKUs, ads) e prioriza onde mexer primeiro pra mover o ponteiro com menor risco de receita.",
    metricLabel: "Margem líquida",
    metricUnit: "p.p.",
    direction: "up",
    defaultHorizonDays: 90,
    variables: [
      v("margem", "estimatedNetMarginPct"),
      v("margem", "avgCommissionPct"),
      v("ads", "monthlyAdSpend"),
      v("ads", "averageRoas"),
      v("ads", "breakEvenRoas"),
      v("preco", "minAcceptableMarginPct", false),
    ],
  },
  {
    id: "capital-release",
    category: "capital",
    title: "Liberar capital em estoque",
    shortDescription: "Reduzir o volume de capital parado em SKUs de baixo giro.",
    rationale:
      "A IA aponta quais SKUs travam caixa, qual fração reverter via queima/devolução ao fornecedor, e como recalibrar o plano de compra.",
    metricLabel: "Valor de estoque parado >90d",
    metricUnit: "R$",
    direction: "down",
    defaultHorizonDays: 60,
    variables: [
      v("estoque", "stockValueBRL"),
      v("estoque", "slowMoving90dShare"),
      v("estoque", "avgCoverageDays"),
      v("receita", "monthlyRevenueTotal", false),
    ],
  },
  {
    id: "growth-with-margin",
    category: "growth",
    title: "Crescer receita mantendo margem",
    shortDescription: "Crescer X% sem deteriorar a margem líquida atual.",
    rationale:
      "A IA cruza canal x margem x mídia pra mostrar onde o crescimento é rentável e onde é compra de receita cara.",
    metricLabel: "Receita mensal",
    metricUnit: "R$",
    direction: "up",
    defaultHorizonDays: 120,
    variables: [
      v("receita", "monthlyRevenueTotal"),
      v("ads", "monthlyAdSpend"),
      v("ads", "averageRoas"),
      v("margem", "estimatedNetMarginPct"),
      v("catalogo", "avgConversionPct", false),
    ],
  },
  {
    id: "ads-efficiency",
    category: "ads-efficiency",
    title: "Eliminar ads com lucro negativo",
    shortDescription: "Identificar e pausar campanhas que estão queimando margem.",
    rationale:
      "ROAS bonito esconde lucro líquido negativo. A IA recalcula o break-even por canal e marca onde o spend deveria ser pausado ou recalibrado.",
    metricLabel: "ROAS médio efetivo",
    metricUnit: "x",
    direction: "up",
    defaultHorizonDays: 45,
    variables: [
      v("ads", "monthlyAdSpend"),
      v("ads", "averageRoas"),
      v("ads", "breakEvenRoas"),
      v("margem", "estimatedNetMarginPct"),
      v("margem", "avgCommissionPct", false),
    ],
  },
  {
    id: "returns-down",
    category: "service",
    title: "Reduzir taxa de devolução",
    shortDescription: "Diminuir devoluções que corroem margem, reputação e CX.",
    rationale:
      "A IA correlaciona reclamações com SKUs e fichas técnicas e prioriza correções com maior efeito em devolução evitada.",
    metricLabel: "Taxa de devolução",
    metricUnit: "%",
    direction: "down",
    defaultHorizonDays: 90,
    variables: [
      v("operacao", "avgReturnRatePct"),
      v("atendimento", "monthlyTickets"),
      v("catalogo", "avgConversionPct", false),
      v("atendimento", "reclameAquiScore", false),
    ],
  },
  {
    id: "stockout-down",
    category: "stockout",
    title: "Reduzir ruptura nos top SKUs",
    shortDescription: "Garantir que os SKUs que vendem não fiquem em zero estoque.",
    rationale:
      "A IA usa cobertura, leadtime e curva de venda pra priorizar reposição e proteger receita dos SKUs A.",
    metricLabel: "Nº SKUs top em ruptura",
    metricUnit: "unid",
    direction: "down",
    defaultHorizonDays: 60,
    variables: [
      v("estoque", "stockoutSkuCount"),
      v("estoque", "avgCoverageDays"),
      v("receita", "monthlyRevenueTotal", false),
      v("operacao", "onTimeDeliveryPct", false),
    ],
  },
];

// ---------------- Helpers ----------------

export function variableId(v: VariableSelection): string {
  return `${v.dimension}.${v.fieldKey}`;
}

export function variableLabel(v: VariableSelection): string {
  const field = DIMENSION_FIELDS[v.dimension].find((f) => f.key === v.fieldKey);
  return field?.label || v.fieldKey;
}

export function variableUnit(v: VariableSelection): string {
  const field = DIMENSION_FIELDS[v.dimension].find((f) => f.key === v.fieldKey);
  if (!field) return "";
  switch (field.type) {
    case "currency": return "R$";
    case "percent": return "%";
    case "number": return "";
    default: return "";
  }
}

export function dimensionLabel(d: DimensionKey): string {
  return DIMENSION_META[d].label;
}

export function findTemplate(id: string | undefined): ObjectiveTemplate | undefined {
  if (!id) return undefined;
  return OBJECTIVE_TEMPLATES.find((t) => t.id === id);
}
