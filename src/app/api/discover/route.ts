import { NextRequest, NextResponse } from "next/server";
import { CompanySize, discoverCompanies } from "@/lib/discover";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALLOWED_SIZES: CompanySize[] = ["small", "medium", "large"];
const ALLOWED_COUNTS = [10, 20, 50];

export async function POST(req: NextRequest) {
  let body: { size?: unknown; count?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const size = body.size as CompanySize;
  if (!ALLOWED_SIZES.includes(size)) {
    return NextResponse.json({ error: "size deve ser small | medium | large" }, { status: 400 });
  }

  const count = Number(body.count);
  if (!ALLOWED_COUNTS.includes(count)) {
    return NextResponse.json({ error: "count deve ser 10, 20 ou 50" }, { status: 400 });
  }

  try {
    const companies = await discoverCompanies({ size, count });
    return NextResponse.json({ size, count, companies });
  } catch (err) {
    const message = err instanceof Error ? err.message : "erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
