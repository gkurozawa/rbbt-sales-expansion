import { NextRequest, NextResponse } from "next/server";
import { CompanySize, discoverCompanies } from "@/lib/discover";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALLOWED_SIZES: CompanySize[] = ["small", "medium", "large"];
const ALLOWED_COUNTS = [10, 20, 50];

export async function POST(req: NextRequest) {
  let body: { sizes?: unknown; count?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const rawSizes = Array.isArray(body.sizes) ? body.sizes : [];
  const sizes = rawSizes.filter((s): s is CompanySize =>
    typeof s === "string" && (ALLOWED_SIZES as string[]).includes(s)
  );
  if (sizes.length === 0) {
    return NextResponse.json(
      { error: "sizes deve conter ao menos um de: small, medium, large" },
      { status: 400 }
    );
  }
  const uniqueSizes = Array.from(new Set(sizes));

  const count = Number(body.count);
  if (!ALLOWED_COUNTS.includes(count)) {
    return NextResponse.json({ error: "count deve ser 10, 20 ou 50" }, { status: 400 });
  }

  try {
    const companies = await discoverCompanies({ sizes: uniqueSizes, count });
    return NextResponse.json({ sizes: uniqueSizes, count, companies });
  } catch (err) {
    const message = err instanceof Error ? err.message : "erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
