import { NextRequest, NextResponse } from "next/server";
import { deleteSeller, getSeller, saveSeller } from "@/lib/sellers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const seller = getSeller(id);
  if (!seller) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(seller);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const seller = getSeller(id);
  if (!seller) return NextResponse.json({ error: "not found" }, { status: 404 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const updated = {
    ...seller,
    name: typeof body.name === "string" ? body.name : seller.name,
    monthlyRevenue:
      typeof body.monthlyRevenue === "number" ? body.monthlyRevenue : seller.monthlyRevenue,
    skuCount: typeof body.skuCount === "number" ? body.skuCount : seller.skuCount,
    notes: typeof body.notes === "string" ? body.notes : seller.notes,
    updatedAt: new Date().toISOString(),
  };
  return NextResponse.json(saveSeller(updated));
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const ok = deleteSeller(id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
