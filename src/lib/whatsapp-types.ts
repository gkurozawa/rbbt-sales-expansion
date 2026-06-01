// Tipos compartilhados (client-safe) para detecção e teste de canais de atendimento.

export const WHATSAPP_TEST_QUESTION = "Não sei o que comprar. Pode me ajudar?";

export type WhatsAppFound = {
  number: string;          // dígitos E.164 sem '+': 5511999999999
  display: string;          // pretty: "+55 11 99999-9999"
  source: string;           // origem (ex.: link wa.me no HTML)
};

export type ChatFound = {
  provider: string;        // nome do widget (JivoChat, Zendesk Chat, etc.) ou "Chat (provedor não identificado)"
  source: string;           // origem (script/pattern detectado)
};

export type ChannelVerification = {
  whatsapp?: WhatsAppFound;
  chat?: ChatFound;
  websiteUrl?: string;
  notes?: string;           // diagnóstico extra
};

export type TestChannel = "whatsapp" | "chat";

export const CHANNEL_LABEL: Record<TestChannel, string> = {
  whatsapp: "WhatsApp",
  chat: "chat",
};

export type ResponseSpeed =
  | "instant"
  | "minutes"
  | "tens"
  | "hours"
  | "no-response";

export const SPEED_LABEL: Record<ResponseSpeed, string> = {
  instant: "Instantâneo (< 1 min)",
  minutes: "Rápido (1–10 min)",
  tens: "Lento (10 min – 1h)",
  hours: "Muito lento (> 1h)",
  "no-response": "Sem resposta",
};

export type WhatsAppTestInput = {
  company: string;
  channel: TestChannel;
  channelDetail?: string;      // ex.: "+55 51 3921-4004" ou "JivoChat"
  question: string;
  autoReplyReceived: boolean;
  responseText?: string;
  speed: ResponseSpeed;
  notes?: string;
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
  channel: TestChannel;
  classification: WhatsAppClassification;
  qualityScore: number;
  speed: ResponseSpeed;
  observations: string[];
  rbbtPitch: string;
};
