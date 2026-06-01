// Critérios de pontuação para identificar empresas-alvo do RBBT Sales.
// Score final 0-100, onde MAIOR = melhor candidata.
//
// Cada critério é normalizado a 0-10 já na direção "maior = mais target".
// Ex.: "integration_gap" — quanto MENOS integradas as lojas/ecommerce, MAIOR a nota.

export type CriterionKey =
  | "channel_immaturity"      // canais pouco desenvolvidos (site, app, chat)
  | "integration_gap"          // lojas físicas e ecommerce sem integração
  | "customer_dissatisfaction" // NPS / reclamações / reviews ruins
  | "product_breadth"          // amplitude de produtos e categorias
  | "store_footprint"          // quantidade de lojas físicas
  | "service_capacity_gap";    // baixa capacidade de atender consumidor

export const CRITERIA: {
  key: CriterionKey;
  label: string;
  weight: number;            // soma dos pesos = 1.0
  description: string;
  scoreMeaning: string;       // o que significa nota alta
}[] = [
  {
    key: "channel_immaturity",
    label: "Imaturidade de canais digitais",
    weight: 0.18,
    description: "Quão pouco desenvolvidos são os canais digitais (site, app, chat, atendimento online).",
    scoreMeaning: "10 = canais muito rudimentares ou ausentes; 0 = canais muito maduros.",
  },
  {
    key: "integration_gap",
    label: "Falta de integração loja física × ecommerce",
    weight: 0.18,
    description: "Quão pouco integrados estão estoques, preços, fidelidade entre lojas físicas e ecommerce.",
    scoreMeaning: "10 = totalmente desconectados; 0 = omnicanal pleno.",
  },
  {
    key: "customer_dissatisfaction",
    label: "Insatisfação do cliente",
    weight: 0.20,
    description: "Sinais públicos: reclamações Reclame Aqui, reviews Google/Instagram, comentários TikTok, NPS estimado.",
    scoreMeaning: "10 = volume alto de reclamações e baixa nota; 0 = clientes satisfeitos.",
  },
  {
    key: "product_breadth",
    label: "Amplitude de produtos e categorias",
    weight: 0.15,
    description: "Quantas categorias e SKUs distintos a empresa oferece (mais amplitude = mais valor pra navegação conversacional).",
    scoreMeaning: "10 = portfólio muito amplo e diverso; 0 = monoproduto/nicho restrito.",
  },
  {
    key: "store_footprint",
    label: "Pegada de lojas físicas",
    weight: 0.13,
    description: "Quantidade de lojas físicas no Brasil.",
    scoreMeaning: "10 = centenas ou milhares de lojas; 0 = nenhuma loja física.",
  },
  {
    key: "service_capacity_gap",
    label: "Lacuna de capacidade de atendimento",
    weight: 0.16,
    description: "Sinais de que o atendimento não dá conta (tempo de resposta longo, SAC saturado, chatbots ruins, abandono).",
    scoreMeaning: "10 = atendimento claramente saturado/precário; 0 = atendimento ágil e satisfatório.",
  },
];

export type Confidence = "low" | "medium" | "high";

export type Verdict = "vender" | "qualificar" | "passar";

export const VERDICT_META: Record<Verdict, { label: string; bg: string; description: string }> = {
  vender: {
    label: "Vender",
    bg: "bg-emerald-600",
    description: "Bom fit — vale priorizar a abordagem comercial.",
  },
  qualificar: {
    label: "Qualificar",
    bg: "bg-amber-500",
    description: "Possível fit, mas há lacunas de informação ou sinais mistos. Aprofundar antes de investir tempo.",
  },
  passar: {
    label: "Passar",
    bg: "bg-rose-600",
    description: "Não é bom fit no momento — focar tempo em alvos mais qualificados.",
  },
};

export type CriterionScore = {
  key: CriterionKey;
  score: number;            // 0-10
  confidence: Confidence;
  evidence: string[];       // 1-3 observações públicas que sustentam a nota
};

export type CompanyAnalysis = {
  company: string;
  overview: string;          // 1-2 frases descrevendo a empresa
  verdict: Verdict;           // veredito comercial: vender / qualificar / passar
  verdictHeadline: string;    // 1 frase punchy resumindo o veredito
  criteria: CriterionScore[];
  totalScore: number;         // 0-100 (calculado, não vem do LLM)
  overallConfidence: Confidence;
  opportunity: string;        // 2-3 frases — por que (ou não) é alvo do RBBT Sales
  redFlags: string[];         // razões pra não priorizar (ex.: já omnicanal)
  sources: string[];          // canais consultados pelo LLM (auto-relato)
};

export function computeTotal(criteria: CriterionScore[]): number {
  const byKey = new Map(criteria.map((c) => [c.key, c.score]));
  let sum = 0;
  for (const def of CRITERIA) {
    const s = byKey.get(def.key) ?? 0;
    sum += s * def.weight;
  }
  return Math.round(sum * 10); // 0-10 → 0-100
}
