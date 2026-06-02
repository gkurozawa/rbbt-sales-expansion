import { NextRequest, NextResponse } from "next/server";
import { deleteObjective, getObjective, patchObjective } from "@/lib/objectives";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const o = getObjective(id);
  if (!o) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(o);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  if (typeof body.title === "string") patch.title = body.title;
  if (typeof body.description === "string") patch.description = body.description;
  if (typeof body.baseline === "number") patch.baseline = body.baseline;
  if (typeof body.target === "number") patch.target = body.target;
  if (typeof body.horizonDays === "number") patch.horizonDays = body.horizonDays;
  if (body.direction === "up" || body.direction === "down") patch.direction = body.direction;
  if (Array.isArray(body.variables)) patch.variables = body.variables;
  const updated = patchObjective(id, patch);
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const ok = deleteObjective(id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
