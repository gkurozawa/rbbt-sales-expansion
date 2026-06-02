import { NextRequest, NextResponse } from "next/server";
import { createObjective, listObjectives } from "@/lib/objectives";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ objectives: listObjectives() });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "title é obrigatório" }, { status: 400 });
  const target = Number(body.target);
  if (!Number.isFinite(target)) {
    return NextResponse.json({ error: "target deve ser numérico" }, { status: 400 });
  }
  const objective = createObjective({
    title,
    description: typeof body.description === "string" ? body.description : undefined,
    templateId: typeof body.templateId === "string" ? body.templateId : undefined,
    metricLabel: typeof body.metricLabel === "string" ? body.metricLabel : undefined,
    metricUnit: typeof body.metricUnit === "string" ? body.metricUnit : undefined,
    baseline: typeof body.baseline === "number" ? body.baseline : undefined,
    target,
    direction: body.direction === "up" || body.direction === "down" ? body.direction : undefined,
    horizonDays: typeof body.horizonDays === "number" ? body.horizonDays : undefined,
  });
  return NextResponse.json(objective, { status: 201 });
}
