// Tipos compartilhados (client-safe).

export const WHATSAPP_TEST_QUESTION = "Não sei o que comprar. Pode me ajudar?";

export type WhatsAppVerification = {
  found: boolean;
  number?: string;          // dígitos no formato E.164 sem '+': 5511999999999
  display?: string;          // formatado: "+55 11 99999-9999"
  websiteUrl?: string;       // URL que foi varrida
  source?: string;           // origem do número: "site oficial", "wa.me", etc.
  notes?: string;            // explicação adicional (especialmente quando não encontrado)
};

export type ResponseSpeed =
  | "instant"     // < 1 min
  | "minutes"     // 1-10 min
  | "tens"        // 10 min – 1h
  | "hours"       // > 1h
  | "no-response"; // sem resposta

export const SPEED_LABEL: Record<ResponseSpeed, string> = {
  instant: "Instantâneo (< 1 min)",
  minutes: "Rápido (1–10 min)",
  tens: "Lento (10 min – 1h)",
  hours: "Muito lento (> 1h)",
  "no-response": "Sem resposta",
};

export type WhatsAppTestInput = {
  company: string;
  question: string;
  autoReplyReceived: boolean;
  responseText?: string;       // texto recebido (auto-reply + humano, concatenado se houver)
  speed: ResponseSpeed;
  notes?: string;              // observações extras do testador
};

export type WhatsAppClassification =
  | "sem-resposta"
  | "auto-reply-generica"
  | "bot-raso"
  | "bot-conversacional"
  | "humano-script"
  | "humano-customizado";

export const CLASSIFICATION_LABEL: Record<WhatsAppClassification, string> = {
  "sem-resposta": "Sem resposta",
  "auto-reply-generica": "Auto-reply genérica",
  "bot-raso": "Bot raso (FAQ/menu)",
  "bot-conversacional": "Bot conversacional",
  "humano-script": "Humano com script",
  "humano-customizado": "Humano customizado",
};

export type WhatsAppAnalysis = {
  classification: WhatsAppClassification;
  qualityScore: number;       // 0-10
  speed: ResponseSpeed;
  observations: string[];     // 2-4 bullets
  rbbtPitch: string;          // 2-3 frases
};
