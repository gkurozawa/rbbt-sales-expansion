import "server-only";
import { callClaude } from "./claude-cli";
import { safeParseJSON, salvageObjects } from "./json-parse";
import { loadSkillBody } from "./skill-loader";
import { CompanySize, DiscoveredCompany, SIZE_META } from "./discover-types";
import type { Verdict } from "./scoring";
import { normalizeTraffic } from "./analyze";

export type { CompanySize, DiscoveredCompany } from "./discover-types";
export { SIZE_META } from "./discover-types";

const CHAT_RESEARCH_METHODOLOGY = loadSkillBody("pesquisar-atendimento-chat");

const SCHEMA_HINT = `{
  "companies": [
    {
      "company": "Nome da empresa",
      "briefRationale": "1-2 frases curtas explicando por que essa empresa é uma boa candidata a usar o RBBT Sales",
      "estimatedScore": 0-100,
      "estimatedVerdict": "vender | qualificar | passar",
      "estimatedRevenue": "estimativa pública aproximada do faturamento anual total",
      "monthlyTraffic": {
        "value": "tráfego mensal aproximado do site, formato humano (ex.: '~2 mi visitas/mês', '~80k visitas/mês'). Omita o objeto inteiro se não houver dado confiável.",
        "source": "SimilarWeb, NeoTrust, relatório anual, reportagem etc.",
        "confidence": "low | medium | high"
      },
      "category": "setor/categoria principal",
      "size": "small | medium | large",
      "sources": ["tipos de fonte usados"]
    }
  ]
}`;

function buildPrompt(sizes: CompanySize[], count: number): string {
  const sizeLines = sizes
    .map((s) => `- ${SIZE_META[s].label} (chave "${s}"): ${SIZE_META[s].description}`)
    .join("\n");
  const distribution =
    sizes.length === 1
      ? `Todas as ${count} empresas devem ser do porte ${SIZE_META[sizes[0]].label.toLowerCase()}.`
      : `Distribua as ${count} empresas de forma equilibrada entre os ${sizes.length} portes selecionados (aproximadamente ${Math.floor(count / sizes.length)} por porte, ajustando se necessário). No campo "size" de cada empresa, indique o porte ao qual ela pertence.`;

  return `Você é analista do RBBT Sales — uma plataforma de venda conversacional via WhatsApp para empresas de varejo brasileiras.

OBJETIVO: gerar uma lista de ${count} empresas brasileiras candidatas a usar o RBBT Sales, considerando os portes abaixo.

PORTES SELECIONADOS:
${sizeLines}

${distribution}

REGRA DE PORTE: considere a empresa TOTAL (matriz + todas as filiais e operações), não unidades fragmentadas. Se houver incerteza sobre o porte, prefira empresas claramente dentro da faixa solicitada.

PERFIL IDEAL (boa candidata):
- Tem lojas físicas E ecommerce (ou só ecommerce), com pouca integração
- Canais digitais pouco maduros
- Sinais públicos de insatisfação de clientes (Reclame Aqui, redes sociais)
- Portfólio amplo de produtos e categorias
- Atendimento saturado / chatbot ruim / tempo de resposta longo
- Quanto menor o NPS aparente e maior a complexidade operacional, melhor

INSTRUÇÕES:
1. Retorne EXATAMENTE ${count} empresas brasileiras reais e distintas que se encaixam.
2. Diversifique setores — varejo de moda, casa, eletrônicos, beleza, alimentos, farmácia, autopeças, móveis, esporte, infantil, pet etc.
3. Cada empresa deve ter um briefRationale curto (1-2 frases) específico — diga por que ESSA empresa é candidata, citando o critério mais forte.
4. Para cada empresa, atribua:
   - estimatedScore: 0-100 — sua estimativa rápida de fit como cliente do RBBT Sales (calibrada pelos critérios listados; 75+ é fit alto, 55-74 fit bom, 35-54 médio, abaixo disso baixo).
   - estimatedVerdict: "vender" (fit claro, priorizar), "qualificar" (sinais positivos mas com lacunas, precisa de discovery) ou "passar" (não é fit).
   - size: o porte ao qual a empresa pertence ("small", "medium" ou "large").
   - monthlyTraffic: estimativa do tráfego mensal do site principal usando as referências MAIS CONFIÁVEIS que você conhecer (SimilarWeb, NeoTrust/Compre&Confie, relatórios anuais, mídia setorial). Indique fonte e confidence. Se a empresa for puramente offline ou não houver dado confiável, omita o objeto monthlyTraffic — NÃO chute números.
5. Evite empresas claramente fora do perfil (puramente B2B, ou totalmente omnicanal maduro como Magalu/Mercado Livre).
6. Se você não souber empresas suficientes com alta confiança, prefira ser conservadora nos scores/vereditos do que inventar dados.
${
  CHAT_RESEARCH_METHODOLOGY
    ? `\nMETODOLOGIA APROFUNDADA — atendimento por chat (use para calibrar o estimatedScore e o briefRationale, principalmente para empresas com sinais públicos sobre canais de atendimento):\n\n${CHAT_RESEARCH_METHODOLOGY}\n\nNão devolva o Markdown da metodologia — apenas use os sinais para enriquecer briefRationale e calibrar score/verdict.\n`
    : ""
}
Responda APENAS com JSON válido neste schema (sem markdown, sem prosa antes ou depois):
${SCHEMA_HINT}`;
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function normalizeVerdict(v: unknown, score: number): Verdict {
  const s = String(v || "").toLowerCase();
  if (s === "vender" || s === "qualificar" || s === "passar") return s;
  if (score >= 65) return "vender";
  if (score >= 40) return "qualificar";
  return "passar";
}

function normalizeSize(s: unknown): CompanySize | undefined {
  const v = String(s || "").toLowerCase();
  if (v === "small" || v === "medium" || v === "large") return v;
  return undefined;
}

export async function discoverCompanies(input: {
  sizes: CompanySize[];
  count: number;
}): Promise<DiscoveredCompany[]> {
  const prompt = buildPrompt(input.sizes, input.count);
  const timeout = input.count >= 50 ? 300_000 : input.count >= 20 ? 240_000 : 180_000;
  const raw = await callClaude(prompt, timeout);

  // Estratégia em dois estágios:
  // 1) parse completo (com jsonrepair)
  // 2) se falhar (resposta cortada / array malformado), tenta salvar os objetos
  //    que estiverem inteiros — preserva o que dá pra usar.
  let list: Array<Record<string, unknown>> = [];
  try {
    const parsed = safeParseJSON(raw) as { companies?: Array<Record<string, unknown>> };
    list = Array.isArray(parsed.companies) ? parsed.companies : [];
  } catch (err) {
    const salvaged = salvageObjects(raw, "company") as Array<Record<string, unknown>>;
    if (salvaged.length === 0) {
      const msg = err instanceof Error ? err.message : "erro de parse";
      throw new Error(
        `${msg}. A resposta provavelmente foi cortada — tente com 'count' menor (10 ou 20).`
      );
    }
    list = salvaged;
  }

  return list
    .filter((c) => c && typeof c.company === "string" && (c.company as string).trim().length > 0)
    .slice(0, input.count)
    .map((c) => {
      const score = clamp(Number(c.estimatedScore ?? 0), 0, 100);
      return {
        company: String(c.company).trim(),
        briefRationale: String(c.briefRationale ?? "").trim(),
        estimatedScore: Number.isFinite(score) ? Math.round(score) : undefined,
        estimatedVerdict: normalizeVerdict(c.estimatedVerdict, score),
        estimatedRevenue: c.estimatedRevenue ? String(c.estimatedRevenue).trim() : undefined,
        monthlyTraffic: normalizeTraffic(c.monthlyTraffic),
        category: c.category ? String(c.category).trim() : undefined,
        size: normalizeSize(c.size),
        sources: Array.isArray(c.sources) ? (c.sources as unknown[]).map(String) : undefined,
      };
    });
}
