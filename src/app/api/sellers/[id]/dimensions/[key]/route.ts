import { NextRequest, NextResponse } from "next/server";
import { updateDimension } from "@/lib/sellers";
import { DIMENSION_ORDER, DimensionKey } from "@/lib/seller-types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; key: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id, key: keyParam } = await params;
  const key = keyParam as DimensionKey;
  if (!DIMENSION_ORDER.includes(key)) {
    return NextResponse.json({ error: "dimensão inválida" }, { status: 400 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const data = (body.data ?? {}) as Record<string, string | number>;
  const seller = updateDimension(id, key, data);
  if (!seller) return NextResponse.json({ error: "seller não encontrado" }, { status: 404 });
  return NextResponse.json(seller);
}
