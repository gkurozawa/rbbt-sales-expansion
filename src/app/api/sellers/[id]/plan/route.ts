import { NextRequest, NextResponse } from "next/server";
import { getSeller } from "@/lib/sellers";
import { generateOperatingPlan } from "@/lib/operating-plan";

export const runtime = "nodejs";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const seller = getSeller(id);
  if (!seller) return NextResponse.json({ error: "seller não encontrado" }, { status: 404 });
  try {
    const plan = await generateOperatingPlan(seller);
    return NextResponse.json(plan);
  } catch (err) {
    const message = err instanceof Error ? err.message : "erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
