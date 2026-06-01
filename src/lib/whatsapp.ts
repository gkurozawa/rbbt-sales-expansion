import "server-only";
import { jsonrepair } from "jsonrepair";
import { callClaude } from "./claude-cli";
import {
  CHANNEL_LABEL,
  CLASSIFICATION_LABEL,
  ChannelVerification,
  ChatFound,
  ResponseSpeed,
  TestChannel,
  WhatsAppAnalysis,
  WhatsAppClassification,
  WhatsAppFound,
  WhatsAppTestInput,
} from "./whatsapp-types";

export type {
  ChannelVerification,
  ChatFound,
  ResponseSpeed,
  TestChannel,
  WhatsAppAnalysis,
  WhatsAppClassification,
  WhatsAppFound,
  WhatsAppTestInput,
} from "./whatsapp-types";

// --- Padrões WhatsApp ---
const WHATSAPP_LINK_PATTERNS: RegExp[] = [
  /wa\.me\/(\+?\d{10,13})/gi,
  /api\.whatsapp\.com\/send\?[^"'<>\s]*phone=(\+?\d{10,13})/gi,
  /whatsapp:\/\/send\?[^"'<>\s]*phone=(\+?\d{10,13})/gi,
];

// --- Provedores de chat conhecidos ---
const CHAT_PROVIDERS: { name: string; pattern: RegExp }[] = [
  { name: "JivoChat", pattern: /code\.jivosite\.com|jivosite\.com|jivo_init/i },
  { name: "Zendesk Chat", pattern: /v2\.zopim\.com|static\.zdassets\.com\/ekr|\bzdchat\b/i },
  { name: "Intercom", pattern: /widget\.intercom\.io|intercom-frame|intercomsettings/i },
  { name: "Crisp", pattern: /client\.crisp\.chat/i },
  { name: "Tawk.to", pattern: /embed\.tawk\.to|tawk-min\.js/i },
  { name: "Take Blip", pattern: /chat\.blip\.ai|builder\.blip\.ai/i },
  { name: "HubSpot Chat", pattern: /js\.usemessages\.com|js\.hubspot\.com\/messages/i },
  { name: "NeoAssist", pattern: /neoassist/i },
  { name: "Octadesk", pattern: /octadesk\.com|octa-chat/i },
  { name: "Hi Platform / DirectTalk", pattern: /directtalk|hiplatform/i },
  { name: "LiveChat", pattern: /cdn\.livechatinc\.com/i },
  { name: "Salesforce Live Agent", pattern: /liveagent\.salesforceliveagent|liveagent\.salesforce/i },
  { name: "Olark", pattern: /static\.olark\.com/i },
  { name: "RD Station Conversas", pattern: /rdstationconversas|rdconversas/i },
  { name: "Drift", pattern: /js\.driftt\.com|drift\.com\/conversation/i },
  { name: "Smartsupp", pattern: /smartsuppchat|smartsupp\.com/i },
  { name: "Freshchat", pattern: /wchat\.freshchat\.com/i },
  { name: "Chaport", pattern: /app\.chaport\.com/i },
];

// --- Helpers ---

async function discoverWebsite(company: string): Promise<string | null> {
  const prompt = `Qual é a URL completa do site oficial principal da empresa brasileira "${company}"? Responda APENAS com a URL (https://...). Se não souber com certeza, responda exatamente DESCONHECIDO.`;
  try {
    const reply = (await callClaude(prompt, 30_000)).trim();
    if (/^DESCONHECIDO/i.test(reply)) return null;
    const m = reply.match(/https?:\/\/[^\s)"'<>]+/i);
    if (!m) return null;
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

function extractWhatsApp(html: string): WhatsAppFound | null {
  for (const pattern of WHATSAPP_LINK_PATTERNS) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(html)) !== null) {
      const num = normalizeNumber(m[1]);
      if (num) {
        return {
          number: num,
          display: formatPretty(num),
          source: "link wa.me/api.whatsapp.com encontrado no HTML",
        };
      }
    }
  }
  return null;
}

function extractChat(html: string): ChatFound | null {
  for (const provider of CHAT_PROVIDERS) {
    if (provider.pattern.test(html)) {
      return {
        provider: provider.name,
        source: `script/embed do ${provider.name} encontrado no HTML`,
      };
    }
  }
  return null;
}

export async function verifyChannels(input: {
  company: string;
  url?: string;
}): Promise<ChannelVerification> {
  let websiteUrl = input.url?.trim() || undefined;
  if (!websiteUrl) {
    const discovered = await discoverWebsite(input.company);
    if (discovered) websiteUrl = discovered;
  }
  if (!websiteUrl) {
    return {
      notes:
        "URL oficial da empresa não foi localizada. Forneça a URL para que a verificação seja feita diretamente no site.",
    };
  }

  const html = await fetchHTML(websiteUrl);
  if (!html) {
    return {
      websiteUrl,
      notes: `Não foi possível carregar ${websiteUrl} (timeout, bloqueio de bot, ou erro de rede). Verifique o link manualmente.`,
    };
  }

  const whatsapp = extractWhatsApp(html) ?? undefined;
  const chat = extractChat(html) ?? undefined;

  if (!whatsapp && !chat) {
    return {
      websiteUrl,
      notes:
        "Site carregou mas nenhum link de WhatsApp nem widget de chat conhecido foi detectado no HTML inicial. Pode estar atrás de JavaScript dinâmico ou só em páginas internas (Fale conosco / Central de ajuda).",
    };
  }

  return { whatsapp, chat, websiteUrl };
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

export async function analyzeChannelResponse(input: WhatsAppTestInput): Promise<WhatsAppAnalysis> {
  const channelName = CHANNEL_LABEL[input.channel];
  const channelDetail = input.channelDetail ? ` (${input.channelDetail})` : "";

  const prompt = `Você é analista do RBBT Sales. Um SDR mandou uma mensagem-teste pelo ${channelName}${channelDetail} da empresa abaixo e está reportando o resultado. Avalie a maturidade do atendimento e gere insumos pra pitch.

Empresa: ${input.company}
Canal testado: ${channelName}${channelDetail}
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
  "rbbtPitch": "2 a 3 frases conectando esse achado à proposta do RBBT Sales — onde o WhatsApp conversacional resolveria a fraqueza observada no canal ${channelName} desta empresa"
}

Critérios de classificação:
- "sem-resposta": nada recebido OU só uma confirmação automática sem conteúdo
- "auto-reply-generica": auto-reply tipo 'Recebemos sua mensagem, retornaremos em breve' sem mais nada
- "bot-raso": menu numérico ou FAQ que não entende a pergunta livre
- "bot-conversacional": tenta entender a pergunta e responde, mas com limitações
- "humano-script": humano respondendo com mensagens-padrão, sem personalização
- "humano-customizado": humano respondendo de forma personalizada à pergunta`;

  const raw = await callClaude(prompt, 90_000);
  const parsed = safeParse(raw) as Record<string, unknown>;
  return {
    channel: input.channel,
    classification: normalizeClassification(parsed.classification),
    qualityScore: Math.round(clamp(Number(parsed.qualityScore ?? 0), 0, 10)),
    speed: normalizeSpeed(parsed.speed, input.speed),
    observations: Array.isArray(parsed.observations)
      ? (parsed.observations as unknown[]).map(String).slice(0, 4)
      : [],
    rbbtPitch: typeof parsed.rbbtPitch === "string" ? parsed.rbbtPitch : "",
  };
}
