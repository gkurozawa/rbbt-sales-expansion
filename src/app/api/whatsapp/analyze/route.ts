import { NextRequest, NextResponse } from "next/server";
import { analyzeChannelResponse } from "@/lib/whatsapp";
import { ResponseSpeed, TestChannel, WhatsAppTestInput, WHATSAPP_TEST_QUESTION } from "@/lib/whatsapp-types";

export const runtime = "nodejs";
export const maxDuration = 120;

const VALID_SPEEDS: ResponseSpeed[] = ["instant", "minutes", "tens", "hours", "no-response"];
const VALID_CHANNELS: TestChannel[] = ["whatsapp", "chat"];

export async function POST(req: NextRequest) {
  let body: Partial<WhatsAppTestInput> & { company?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const company = typeof body.company === "string" ? body.company.trim() : "";
  if (!company) {
    return NextResponse.json({ error: "company é obrigatório" }, { status: 400 });
  }
  const speed = body.speed as ResponseSpeed;
  if (!VALID_SPEEDS.includes(speed)) {
    return NextResponse.json({ error: `speed deve ser um de: ${VALID_SPEEDS.join(", ")}` }, { status: 400 });
  }
  const channel = body.channel as TestChannel;
  if (!VALID_CHANNELS.includes(channel)) {
    return NextResponse.json({ error: `channel deve ser um de: ${VALID_CHANNELS.join(", ")}` }, { status: 400 });
  }

  const input: WhatsAppTestInput = {
    company,
    channel,
    channelDetail: typeof body.channelDetail === "string" ? body.channelDetail : undefined,
    question: typeof body.question === "string" && body.question.trim() ? body.question : WHATSAPP_TEST_QUESTION,
    autoReplyReceived: Boolean(body.autoReplyReceived),
    responseText: typeof body.responseText === "string" ? body.responseText : undefined,
    speed,
    notes: typeof body.notes === "string" ? body.notes : undefined,
  };

  try {
    const analysis = await analyzeChannelResponse(input);
    return NextResponse.json(analysis);
  } catch (err) {
    const message = err instanceof Error ? err.message : "erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
