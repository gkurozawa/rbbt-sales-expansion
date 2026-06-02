import { NextRequest, NextResponse } from "next/server";
import { getObjective, setSeries } from "@/lib/objectives";
import { HistoricalPoint, HistoricalSeries, variableId } from "@/lib/objective-types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; vid: string }> };

function parsePoints(raw: unknown): HistoricalPoint[] {
  if (!Array.isArray(raw)) return [];
  const out: HistoricalPoint[] = [];
  for (const p of raw) {
    if (!p || typeof p !== "object") continue;
    const obj = p as Record<string, unknown>;
    const date = typeof obj.date === "string" ? obj.date.slice(0, 10) : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const value = Number(obj.value);
    if (!Number.isFinite(value)) continue;
    const segment = typeof obj.segment === "string" && obj.segment.trim() ? obj.segment.trim() : undefined;
    out.push({ date, value, segment });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id, vid } = await params;
  const o = getObjective(id);
  if (!o) return NextResponse.json({ error: "objective not found" }, { status: 404 });
  // valida que vid é uma variável conhecida no objetivo
  const known = o.variables.map(variableId);
  if (!known.includes(vid)) {
    return NextResponse.json({ error: "variável não está no objetivo" }, { status: 400 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const points = parsePoints(body.points);
  const series: HistoricalSeries = {
    variableId: vid,
    unit: typeof body.unit === "string" ? body.unit : undefined,
    points,
    uploadedAt: new Date().toISOString(),
  };
  const updated = setSeries(id, vid, series);
  if (!updated) return NextResponse.json({ error: "objective not found" }, { status: 404 });
  return NextResponse.json(updated);
}
