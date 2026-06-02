import { NextRequest, NextResponse } from "next/server";
import { getObjective, patchObjective } from "@/lib/objectives";
import { validateObjective } from "@/lib/validators";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const o = getObjective(id);
  if (!o) return NextResponse.json({ error: "not found" }, { status: 404 });
  const report = validateObjective(o);
  patchObjective(id, { validation: report, status: report.overall === "fail" ? "data" : "ready" });
  return NextResponse.json(report);
}
