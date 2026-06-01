import { NextRequest, NextResponse } from "next/server";
import { analyzeCompany } from "@/lib/analyze";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let body: { company?: unknown; url?: unknown; notes?: unknown };
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
  const notes = typeof body.notes === "string" ? body.notes.trim() : undefined;

  try {
    const analysis = await analyzeCompany({ company, url, notes });
    return NextResponse.json(analysis);
  } catch (err) {
    const message = err instanceof Error ? err.message : "erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
