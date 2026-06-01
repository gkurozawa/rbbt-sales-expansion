import "server-only";
import { jsonrepair } from "jsonrepair";
import { callClaude } from "./claude-cli";
import {
  CLASSIFICATION_LABEL,
  ResponseSpeed,
  WhatsAppAnalysis,
  WhatsAppClassification,
  WhatsAppTestInput,
  WhatsAppVerification,
} from "./whatsapp-types";

export type {
  ResponseSpeed,
  WhatsAppAnalysis,
  WhatsAppClassification,
  WhatsAppTestInput,
  WhatsAppVerification,
} from "./whatsapp-types";

// Padrões comuns que sites brasileiros usam para WhatsApp.
// Captura o número como grupo 1, com ou sem '+' e com 10-13 dígitos.
const WHATSAPP_LINK_PATTERNS: RegExp[] = [
  /wa\.me\/(\+?\d{10,13})/gi,
  /api\.whatsapp\.com\/send\?[^"'<>\s]*phone=(\+?\d{10,13})/gi,
  /whatsapp:\/\/send\?[^"'<>\s]*phone=(\+?\d{10,13})/gi,
];

// Heurística pra encontrar o site oficial via Claude quando o usuário não informou.
async function discoverWebsite(company: string): Promise<string | null> {
  const prompt = `Qual é a URL completa do site oficial principal da empresa brasileira "${company}"? Responda APENAS com a URL (https://...). Se não souber com certeza, responda exatamente DESCONHECIDO.`;
  try {
    const reply = (await callClaude(prompt, 30_000)).trim();
    if (/^DESCONHECIDO/i.test(reply)) return null;
    const m = reply.match(/https?:\/\/[^\s)"'<>]+/i);
    if (!m) return null;
    // Limpa pontuação final
    return m[0].replace(/[.,;:!?)]+$/, "");
  } catch {
    return null;
  }
}

async function fetchHTML(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(15_000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function normalizeNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return null;
  if (digits.startsWith("55")) return digits;
  // Assume Brasil — prefixo 55
  if (digits.length === 10 || digits.length === 11) return "55" + digits;
  return digits;
}

function formatPretty(digits: string): string {
  if (digits.startsWith("55") && digits.length === 13) {
    return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.startsWith("55") && digits.length === 12) {
    return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  return "+" + digits;
}

function extractWhatsApp(html: string): string | null {
  for (const pattern of WHATSAPP_LINK_PATTERNS) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(html)) !== null) {
      const num = normalizeNumber(m[1]);
      if (num) return num;
    }
  }
  return null;
}

export async function verifyWhatsApp(input: {
  company: string;
  url?: string;
}): Promise<WhatsAppVerification> {
  let websiteUrl = input.url?.trim() || undefined;
  if (!websiteUrl) {
    const discovered = await discoverWebsite(input.company);
    if (discovered) websiteUrl = discovered;
  }
  if (!websiteUrl) {
    return {
      found: false,
      notes:
        "URL oficial da empresa não foi localizada. Forneça a URL para que a verificação seja feita diretamente no site.",
    };
  }

  const html = await fetchHTML(websiteUrl);
  if (!html) {
    return {
      found: false,
      websiteUrl,
      notes: `Não foi possível carregar ${websiteUrl} (timeout, bloqueio de bot, ou erro de rede). Verifique o link manualmente.`,
    };
  }

  const number = extractWhatsApp(html);
  if (number) {
    return {
      found: true,
      number,
      display: formatPretty(number),
      websiteUrl,
      source: "site oficial — link wa.me/api.whatsapp.com encontrado no HTML",
    };
  }

  return {
    found: false,
    websiteUrl,
    notes:
      "Site carregou mas nenhum link de WhatsApp (wa.me, api.whatsapp.com, whatsapp://) foi detectado no HTML inicial. Pode estar atrás de JavaScript dinâmico, no menu mobile, ou só na área 'Fale conosco'. Vale conferir manualmente.",
  };
}

// --- Análise da resposta ---

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

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function normalizeClassification(c: unknown): WhatsAppClassification {
  const v = String(c || "").toLowerCase();
  const keys = Object.keys(CLASSIFICATION_LABEL) as WhatsAppClassification[];
  for (const k of keys) if (k === v) return k;
  return "auto-reply-generica";
}

function normalizeSpeed(s: unknown, fallback: ResponseSpeed): ResponseSpeed {
  const v = String(s || "").toLowerCase();
  if (v === "instant" || v === "minutes" || v === "tens" || v === "hours" || v === "no-response") {
    return v;
  }
  return fallback;
}

export async function analyzeWhatsAppResponse(input: WhatsAppTestInput): Promise<WhatsAppAnalysis> {
  const prompt = `Você é analista do RBBT Sales. Um SDR mandou uma mensagem-teste pro WhatsApp da empresa abaixo e está reportando o resultado. Avalie a maturidade do atendimento e gere insumos pra pitch.

Empresa: ${input.company}
Pergunta enviada: "${input.question}"
Auto-reply imediata recebida? ${input.autoReplyReceived ? "Sim" : "Não"}
Velocidade da resposta: ${input.speed}
Texto recebido (pode incluir auto-reply + resposta humana, ou estar vazio):
"""
${input.responseText?.trim() || "(nada recebido)"}
"""
${input.notes ? `Observações do testador: ${input.notes}` : ""}

Devolva APENAS este JSON (sem markdown, sem prosa antes/depois):
{
  "classification": "sem-resposta | auto-reply-generica | bot-raso | bot-conversacional | humano-script | humano-customizado",
  "qualityScore": 0-10,
  "speed": "instant | minutes | tens | hours | no-response",
  "observations": ["2 a 4 bullets curtos sobre o que a resposta revela: maturidade do bot, capacidade de entender pergunta aberta, integração com catálogo, qualidade humana, tom etc."],
  "rbbtPitch": "2 a 3 frases conectando esse achado à proposta do RBBT Sales — onde o WhatsApp conversacional resolveria a fraqueza observada"
}

Critérios:
- "sem-resposta": nada recebido OU só uma confirmação automática sem conteúdo
- "auto-reply-generica": auto-reply tipo 'Recebemos sua mensagem, retornaremos em breve' sem mais nada
- "bot-raso": menu numérico ou FAQ que não entende a pergunta livre
- "bot-conversacional": tenta entender a pergunta e responde, mas com limitações
- "humano-script": humano respondendo com mensagens-padrão, sem personalização
- "humano-customizado": humano respondendo de forma personalizada à pergunta`;

  const raw = await callClaude(prompt, 90_000);
  const parsed = safeParse(raw) as Record<string, unknown>;
  return {
    classification: normalizeClassification(parsed.classification),
    qualityScore: Math.round(clamp(Number(parsed.qualityScore ?? 0), 0, 10)),
    speed: normalizeSpeed(parsed.speed, input.speed),
    observations: Array.isArray(parsed.observations)
      ? (parsed.observations as unknown[]).map(String).slice(0, 4)
      : [],
    rbbtPitch: typeof parsed.rbbtPitch === "string" ? parsed.rbbtPitch : "",
  };
}
