import { NextRequest, NextResponse } from "next/server";
import { analyzeWhatsAppResponse } from "@/lib/whatsapp";
import { ResponseSpeed, WhatsAppTestInput, WHATSAPP_TEST_QUESTION } from "@/lib/whatsapp-types";

export const runtime = "nodejs";
export const maxDuration = 120;

const VALID_SPEEDS: ResponseSpeed[] = ["instant", "minutes", "tens", "hours", "no-response"];

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

  const input: WhatsAppTestInput = {
    company,
    question: typeof body.question === "string" && body.question.trim() ? body.question : WHATSAPP_TEST_QUESTION,
    autoReplyReceived: Boolean(body.autoReplyReceived),
    responseText: typeof body.responseText === "string" ? body.responseText : undefined,
    speed,
    notes: typeof body.notes === "string" ? body.notes : undefined,
  };

  try {
    const analysis = await analyzeWhatsAppResponse(input);
    return NextResponse.json(analysis);
  } catch (err) {
    const message = err instanceof Error ? err.message : "erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
