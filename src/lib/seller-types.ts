// Tipos compartilhados do AI Business Operator pra sellers (client-safe).

export type SellerVertical = "moda" | "suplementos" | "beleza" | "eletronicos" | "casa" | "outros";

export const VERTICAL_LABEL: Record<SellerVertical, string> = {
  moda: "Moda",
  suplementos: "Suplementos / nutrição",
  beleza: "Beleza / skincare",
  eletronicos: "Eletrônicos / acessórios",
  casa: "Casa / móveis",
  outros: "Outros",
};

export type Channel =
  | "mercado-livre"
  | "amazon"
  | "shopee"
  | "magalu"
  | "americanas"
  | "loja-propria"
  | "ifood"
  | "outros";

export const CHANNEL_LABEL: Record<Channel, string> = {
  "mercado-livre": "Mercado Livre",
  amazon: "Amazon",
  shopee: "Shopee",
  magalu: "Magalu",
  americanas: "Americanas / Submarino",
  "loja-propria": "Loja própria (DTC)",
  ifood: "iFood",
  outros: "Outros",
};

export type DimensionKey =
  | "receita"
  | "margem"
  | "ads"
  | "preco"
  | "estoque"
  | "catalogo"
  | "operacao"
  | "atendimento";

export const DIMENSION_META: Record<DimensionKey, { label: string; tagline: string; description: string }> = {
  receita: {
    label: "Receita e crescimento",
    tagline: "Onde está crescendo (e onde está estagnado)",
    description: "Oportunidade por canal, categoria, SKU, região, sazonalidade e recorrência.",
  },
  margem: {
    label: "Margem e rentabilidade",
    tagline: "Margem líquida real, não ROAS bonito",
    description: "Comissão, frete, imposto, ads, devolução, custo financeiro, embalagem, capital empregado por produto.",
  },
  ads: {
    label: "Ads e mídia",
    tagline: "Quanto investir, onde, quando pausar",
    description: "Performance de mídia avaliada por lucro líquido, não por ROAS ou GMV.",
  },
  preco: {
    label: "Preço e elasticidade",
    tagline: "Quanto cobrar em cada canal",
    description: "Simulação de preço por canal, concorrência, demanda, estoque e margem mínima.",
  },
  estoque: {
    label: "Estoque e compras",
    tagline: "Anti-ruptura e capital parado",
    description: "Previsão de demanda, alocação por canal, plano de compra.",
  },
  catalogo: {
    label: "Catálogo e conversão",
    tagline: "O que está vendendo (e o que não está)",
    description: "Título, descrição, imagem, atributos, kits, bundles, categorização.",
  },
  operacao: {
    label: "Operação e logística",
    tagline: "SLA, frete, devolução",
    description: "SLA prometido vs realizado, custo logístico, fulfillment, taxa de devolução.",
  },
  atendimento: {
    label: "Atendimento e reputação",
    tagline: "Causas de reclamação e risco",
    description: "Causa de reclamação, padrão de devolução, risco reputacional, melhoria de produto.",
  },
};

export const DIMENSION_ORDER: DimensionKey[] = [
  "receita",
  "margem",
  "ads",
  "preco",
  "estoque",
  "catalogo",
  "operacao",
  "atendimento",
];

// Cada dimensão tem campos numéricos/curtos definidos abaixo + um "context" textarea livre.

export type FieldType = "number" | "currency" | "percent" | "text" | "textarea";

export type DimensionFieldDef = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  help?: string;
};

export const DIMENSION_FIELDS: Record<DimensionKey, DimensionFieldDef[]> = {
  receita: [
    { key: "monthlyRevenueTotal", label: "Receita bruta mensal total", type: "currency", placeholder: "ex.: 8500000" },
    { key: "monthlyOrders", label: "Pedidos por mês", type: "number", placeholder: "ex.: 35000" },
    { key: "topChannelShare", label: "Share do principal canal (%)", type: "percent", placeholder: "ex.: 45" },
    { key: "ytdGrowthPct", label: "Crescimento YoY (%)", type: "percent", placeholder: "ex.: 22" },
    {
      key: "context",
      label: "Detalhes — receita por canal, top categorias, top SKUs, sazonalidade",
      type: "textarea",
      placeholder:
        "ex.: ML R$3,8mi/mês, Amazon R$2,1mi, loja própria R$1,9mi, Shopee R$700k. Top categoria: roupa fitness (38%). SKU campeão: legging X (R$420k/mês). Pico forte em mai-jul e nov-dez.",
    },
  ],
  margem: [
    { key: "avgGrossMarginPct", label: "Margem bruta média (%)", type: "percent", placeholder: "ex.: 55" },
    { key: "avgCommissionPct", label: "Comissão média marketplace (%)", type: "percent", placeholder: "ex.: 16" },
    { key: "avgFreightCost", label: "Frete médio por pedido (R$)", type: "currency", placeholder: "ex.: 22" },
    { key: "returnRatePct", label: "Taxa de devolução (%)", type: "percent", placeholder: "ex.: 8" },
    { key: "estimatedNetMarginPct", label: "Margem líquida estimada (%)", type: "percent", placeholder: "ex.: 7" },
    {
      key: "context",
      label: "Detalhes — top SKUs por margem real, SKUs com suspeita de margem negativa, custos especiais",
      type: "textarea",
      placeholder:
        "ex.: Top margem real: kit yoga premium 24%, regata X 21%. Suspeitos de margem negativa: blusa Y após ads + devolução, e SKU promocional Z. Imposto efetivo 9%, capital de giro custa 1,2%/mês.",
    },
  ],
  ads: [
    { key: "monthlyAdSpend", label: "Investimento mensal total em ads (R$)", type: "currency", placeholder: "ex.: 420000" },
    { key: "averageRoas", label: "ROAS médio reportado", type: "number", placeholder: "ex.: 4.2" },
    { key: "marketplaceAdShare", label: "% do ads em marketplace ads", type: "percent", placeholder: "ex.: 65" },
    { key: "breakEvenRoas", label: "ROAS de break-even estimado", type: "number", placeholder: "ex.: 3.5" },
    {
      key: "context",
      label: "Detalhes — campanhas top em gasto, suspeitas de queima de caixa, política atual de pausar",
      type: "textarea",
      placeholder:
        "ex.: ML Ads consome 60% do orçamento, ROAS 5x mas margem líquida desconhecida. Meta Ads R$80k/mês com ROAS 3,8x — perto do break-even. Não temos regra clara de pausar, decisão semanal manual.",
    },
  ],
  preco: [
    { key: "skuCount", label: "Total de SKUs ativos", type: "number", placeholder: "ex.: 4200" },
    { key: "channelsWithPriceDiff", label: "Canais com preço diferente", type: "number", placeholder: "ex.: 3" },
    { key: "minAcceptableMarginPct", label: "Margem líquida mínima aceitável (%)", type: "percent", placeholder: "ex.: 8" },
    {
      key: "context",
      label: "Detalhes — política de preço por canal, concorrentes diretos, casos onde preço dói",
      type: "textarea",
      placeholder:
        "ex.: Preço público igual em ML/Amazon/loja. Shopee 5% abaixo. Concorrente Y guerreia preço em ads. Estoque parado puxado pra promoção sem critério. Mínimo de margem líquida pretendida: 8%.",
    },
  ],
  estoque: [
    { key: "stockValueBRL", label: "Valor do estoque atual (R$)", type: "currency", placeholder: "ex.: 12000000" },
    { key: "avgCoverageDays", label: "Cobertura média (dias)", type: "number", placeholder: "ex.: 65" },
    { key: "stockoutSkuCount", label: "Nº de SKUs em ruptura agora", type: "number", placeholder: "ex.: 38" },
    { key: "slowMoving90dShare", label: "% de SKUs parados >90 dias", type: "percent", placeholder: "ex.: 18" },
    {
      key: "context",
      label: "Detalhes — top SKUs em ruptura, top SKUs parados, política de compra atual, leadtime do fornecedor",
      type: "textarea",
      placeholder:
        "ex.: Em ruptura agora: 12 SKUs do top 50 de receita. Parados: linha de inverno 23 (R$ 1,1mi). Compras decididas no olho a cada 15 dias. Leadtime médio fornecedor 45 dias.",
    },
  ],
  catalogo: [
    { key: "activeListings", label: "Anúncios ativos (todos canais)", type: "number", placeholder: "ex.: 11000" },
    { key: "avgConversionPct", label: "Conversão média (%)", type: "percent", placeholder: "ex.: 2.4" },
    { key: "bundlesShare", label: "% das vendas em kits/bundles", type: "percent", placeholder: "ex.: 12" },
    {
      key: "context",
      label: "Detalhes — anúncios com conversão baixa, kits que vendem bem, oportunidades de bundle, atributos faltando",
      type: "textarea",
      placeholder:
        "ex.: 300 anúncios com conversão <0,5%, suspeita de título ruim. Kit yoga top vende 3x mais que SKUs separados. Atributos de cor/manga incompletos em 40% do catálogo de moda.",
    },
  ],
  operacao: [
    { key: "onTimeDeliveryPct", label: "% de entregas no prazo", type: "percent", placeholder: "ex.: 91" },
    { key: "avgFulfillmentCost", label: "Custo de fulfillment por pedido (R$)", type: "currency", placeholder: "ex.: 8.5" },
    { key: "fullShareDays", label: "% do volume em Full (ML)/FBA (Amazon)", type: "percent", placeholder: "ex.: 35" },
    { key: "avgReturnRatePct", label: "Devolução média (%)", type: "percent", placeholder: "ex.: 7" },
    {
      key: "context",
      label: "Detalhes — canais com pior SLA, causas de atraso, gargalos de embalagem, regiões problemáticas",
      type: "textarea",
      placeholder:
        "ex.: Pior SLA na Shopee (78% no prazo). Atraso concentrado em N/NE por causa do hub SP. Embalagem manual segura nos lançamentos.",
    },
  ],
  atendimento: [
    { key: "monthlyTickets", label: "Tickets/reclamações por mês", type: "number", placeholder: "ex.: 1800" },
    { key: "reclameAquiScore", label: "Nota Reclame Aqui (0-10)", type: "number", placeholder: "ex.: 7.2" },
    { key: "avgFirstResponseMinutes", label: "Tempo médio de 1ª resposta (min)", type: "number", placeholder: "ex.: 35" },
    { key: "npsScore", label: "NPS (se medido)", type: "number", placeholder: "ex.: 42" },
    {
      key: "context",
      label: "Detalhes — top 5 motivos de reclamação, padrões de devolução, riscos de reputação, melhorias de produto detectadas",
      type: "textarea",
      placeholder:
        "ex.: Top motivos: 1) atraso (38%), 2) produto diferente da foto (22%), 3) defeito (18%). Linha de moletom devolução 14% — alegação 'tamanho menor'. Padrão de feedback de produto: pedido de bolsos.",
    },
  ],
};

export type DimensionInput = {
  filled: boolean;
  data: Record<string, string | number>;
  updatedAt?: string;
};

export type Seller = {
  id: string;
  name: string;
  vertical: SellerVertical;
  channels: Channel[];
  monthlyRevenue?: number;     // R$/mês
  skuCount?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  dimensions: Partial<Record<DimensionKey, DimensionInput>>;
};

// --- Plano operacional ---

export type ActionPriority = "alta" | "media" | "baixa";

export const PRIORITY_META: Record<ActionPriority, { label: string; bg: string }> = {
  alta: { label: "Alta", bg: "bg-rose-600" },
  media: { label: "Média", bg: "bg-amber-500" },
  baixa: { label: "Baixa", bg: "bg-slate-500" },
};

export type ActionImpact = {
  metric: string;           // ex.: "Margem líquida"
  estimate: string;         // ex.: "+1,5 p.p. em 60 dias"
  confidence: "baixa" | "media" | "alta";
};

export type PlanAction = {
  id: string;                  // hash curto pra referência
  dimension: DimensionKey;
  priority: ActionPriority;
  title: string;               // imperativo curto: "Aumente preço dos SKUs Z em 4%"
  rationale: string;           // 1-3 frases justificando
  impacts: ActionImpact[];
  evidence?: string[];          // dados do seller que sustentam
  guardrail?: string;           // o que pode dar errado / quando NÃO executar
};

export type OperatingPlan = {
  sellerId: string;
  generatedAt: string;
  headline: string;             // 1-2 frases — o que mais importa essa semana
  topActions: PlanAction[];     // priorizadas (alta primeiro)
  coverage: Partial<Record<DimensionKey, "ok" | "partial" | "missing">>; // qualidade do dado por dimensão
  notes?: string;
};
