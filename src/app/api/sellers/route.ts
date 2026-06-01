import { NextRequest, NextResponse } from "next/server";
import { createSeller, listSellers } from "@/lib/sellers";
import { Channel, SellerVertical } from "@/lib/seller-types";

export const runtime = "nodejs";

const VALID_VERTICALS: SellerVertical[] = [
  "moda",
  "suplementos",
  "beleza",
  "eletronicos",
  "casa",
  "outros",
];

const VALID_CHANNELS: Channel[] = [
  "mercado-livre",
  "amazon",
  "shopee",
  "magalu",
  "americanas",
  "loja-propria",
  "ifood",
  "outros",
];

export async function GET() {
  return NextResponse.json({ sellers: listSellers() });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name é obrigatório" }, { status: 400 });
  const vertical = body.vertical as SellerVertical;
  if (!VALID_VERTICALS.includes(vertical)) {
    return NextResponse.json({ error: "vertical inválido" }, { status: 400 });
  }
  const channelsRaw = Array.isArray(body.channels) ? body.channels : [];
  const channels = channelsRaw.filter((c): c is Channel =>
    typeof c === "string" && (VALID_CHANNELS as string[]).includes(c)
  );
  if (channels.length === 0) {
    return NextResponse.json({ error: "channels deve ter ao menos um canal" }, { status: 400 });
  }
  const monthlyRevenue = typeof body.monthlyRevenue === "number" ? body.monthlyRevenue : undefined;
  const skuCount = typeof body.skuCount === "number" ? body.skuCount : undefined;
  const notes = typeof body.notes === "string" ? body.notes : undefined;
  const seller = createSeller({ name, vertical, channels, monthlyRevenue, skuCount, notes });
  return NextResponse.json(seller, { status: 201 });
}
