import "server-only";
import { jsonrepair } from "jsonrepair";
import { callClaude } from "./claude-cli";
import { CompanySize, DiscoveredCompany, SIZE_META } from "./discover-types";

export type { CompanySize, DiscoveredCompany } from "./discover-types";
export { SIZE_META } from "./discover-types";

const SCHEMA_HINT = `{
  "companies": [
    {
      "company": "Nome da empresa",
      "briefRationale": "1-2 frases curtas explicando por que essa empresa é uma boa candidata a usar o RBBT Sales, segundo os critérios (canais imaturos, baixa integração, NPS ruim, amplitude de produtos, número de lojas, atendimento saturado)",
      "estimatedRevenue": "estimativa pública aproximada do faturamento anual total, se você souber (ex.: '~R$30 mi/ano (estimativa pública)')",
      "category": "setor/categoria principal (ex.: 'moda feminina', 'eletrônicos', 'alimentos')",
      "sources": ["tipos de fonte usados (ex.: 'site oficial', 'Reclame Aqui', 'reportagens setoriais')"]
    }
  ]
}`;

function buildPrompt(size: CompanySize, count: number): string {
  const sizeDesc = SIZE_META[size];
  return `Você é analista do RBBT Sales — uma plataforma de venda conversacional via WhatsApp para empresas de varejo brasileiras.

OBJETIVO: gerar uma lista de ${count} empresas brasileiras candidatas a usar o RBBT Sales, com porte ${sizeDesc.label.toUpperCase()} (${sizeDesc.description}).

REGRAS DE PORTE:
- Considere a empresa TOTAL (matriz + todas as filiais e operações), não unidades fragmentadas.
- Pequenas: até R$ 1 milhão/ano
- Médias: R$ 1 milhão a R$ 50 milhões/ano
- Grandes: acima de R$ 50 milhões/ano
- Se houver incerteza sobre o porte, prefira empresas claramente dentro da faixa solicitada.

PERFIL IDEAL (boa candidata):
- Tem lojas físicas E ecommerce (ou só ecommerce), com pouca integração
- Canais digitais pouco maduros
- Sinais públicos de insatisfação de clientes (Reclame Aqui, redes sociais)
- Portfólio amplo de produtos e categorias
- Atendimento saturado / chatbot ruim / tempo de resposta longo
- Quanto menor o NPS aparente e maior a complexidade operacional, melhor

INSTRUÇÕES:
1. Retorne EXATAMENTE ${count} empresas brasileiras reais distintas que se encaixam.
2. Diversifique setores (não traga ${count} empresas todas de moda, por exemplo) — varejo de moda, casa, eletrônicos, beleza, alimentos, farmácia, autopeças, móveis, esporte, infantil, pet etc.
3. Cada empresa deve ter um briefRationale curto (1-2 frases) específico — diga por que ESSA empresa é candidata, citando o critério mais forte (ex.: "Mais de 100 lojas físicas com ecommerce limitado e Reclame Aqui em faixa 'Ruim'").
4. Evite empresas claramente fora do perfil (puramente B2B, ou totalmente omnicanal maduro como Magalu/Mercado Livre).
5. Se você não souber empresas suficientes no porte exato com alta confiança, prefira menos certezas explícitas no briefRationale do que inventar dados.

Responda APENAS com JSON válido neste schema (sem markdown, sem prosa antes ou depois):
${SCHEMA_HINT}`;
}

function safeParse(raw: string): unknown {
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

export async function discoverCompanies(input: {
  size: CompanySize;
  count: number;
}): Promise<DiscoveredCompany[]> {
  const prompt = buildPrompt(input.size, input.count);
  // Listas maiores precisam de mais tempo
  const timeout = input.count >= 50 ? 300_000 : input.count >= 20 ? 240_000 : 180_000;
  const raw = await callClaude(prompt, timeout);
  const parsed = safeParse(raw) as { companies?: DiscoveredCompany[] };
  const list = Array.isArray(parsed.companies) ? parsed.companies : [];
  return list
    .filter((c) => c && typeof c.company === "string" && c.company.trim().length > 0)
    .slice(0, input.count)
    .map((c) => ({
      company: String(c.company).trim(),
      briefRationale: String(c.briefRationale ?? "").trim(),
      estimatedRevenue: c.estimatedRevenue ? String(c.estimatedRevenue).trim() : undefined,
      category: c.category ? String(c.category).trim() : undefined,
      sources: Array.isArray(c.sources) ? c.sources.map(String) : undefined,
    }));
}
