import { NextRequest, NextResponse } from "next/server";
import { verifyWhatsApp } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: { company?: unknown; url?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const company = typeof body.company === "string" ? body.company.trim() : "";
  if (!company) {
    return NextResponse.json({ error: "company é obrigatório" }, { status: 400 });
  }
  const url = typeof body.url === "string" ? body.url.trim() : undefined;
  try {
    const result = await verifyWhatsApp({ company, url: url || undefined });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
