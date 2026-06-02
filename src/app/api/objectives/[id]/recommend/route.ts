import { NextRequest, NextResponse } from "next/server";
import { getObjective, patchObjective } from "@/lib/objectives";
import { generateRecommendations } from "@/lib/objective-recommend";

export const runtime = "nodejs";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const o = getObjective(id);
  if (!o) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (o.validation?.overall === "fail") {
    return NextResponse.json(
      { error: "validação falhou — corrija os erros antes de gerar recomendações" },
      { status: 400 }
    );
  }
  try {
    const recs = await generateRecommendations(o);
    patchObjective(id, { recommendations: recs, status: "ready" });
    return NextResponse.json(recs);
  } catch (err) {
    const message = err instanceof Error ? err.message : "erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
