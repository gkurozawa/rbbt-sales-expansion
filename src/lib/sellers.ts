import "server-only";
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import {
  DIMENSION_FIELDS,
  DIMENSION_ORDER,
  DimensionInput,
  DimensionKey,
  Seller,
} from "./seller-types";

const DATA_DIR = path.join(process.cwd(), "data", "sellers");

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function fileFor(id: string): string {
  return path.join(DATA_DIR, `${id}.json`);
}

function newId(): string {
  return randomBytes(6).toString("hex");
}

function nowIso(): string {
  return new Date().toISOString();
}

export function listSellers(): Seller[] {
  ensureDir();
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  const sellers: Seller[] = [];
  for (const f of files) {
    try {
      const raw = readFileSync(path.join(DATA_DIR, f), "utf8");
      sellers.push(JSON.parse(raw) as Seller);
    } catch {
      // ignora arquivos corrompidos
    }
  }
  sellers.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return sellers;
}

export function getSeller(id: string): Seller | null {
  ensureDir();
  const p = fileFor(id);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as Seller;
  } catch {
    return null;
  }
}

export function saveSeller(seller: Seller): Seller {
  ensureDir();
  writeFileSync(fileFor(seller.id), JSON.stringify(seller, null, 2));
  return seller;
}

export function createSeller(input: Omit<Seller, "id" | "createdAt" | "updatedAt" | "dimensions"> & {
  dimensions?: Seller["dimensions"];
}): Seller {
  const seller: Seller = {
    id: newId(),
    name: input.name,
    vertical: input.vertical,
    channels: input.channels,
    monthlyRevenue: input.monthlyRevenue,
    skuCount: input.skuCount,
    notes: input.notes,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    dimensions: input.dimensions ?? {},
  };
  return saveSeller(seller);
}

export function deleteSeller(id: string): boolean {
  ensureDir();
  const p = fileFor(id);
  if (!existsSync(p)) return false;
  unlinkSync(p);
  return true;
}

// Marca como filled se pelo menos 50% dos campos não-context foram preenchidos
// OU se o context tiver conteúdo razoável.
function evaluateFilled(key: DimensionKey, data: Record<string, string | number>): boolean {
  const fields = DIMENSION_FIELDS[key];
  const structured = fields.filter((f) => f.key !== "context");
  const filledStructured = structured.filter((f) => {
    const v = data[f.key];
    return v !== undefined && v !== null && v !== "" && !(typeof v === "number" && Number.isNaN(v));
  }).length;
  const contextValue = String(data.context ?? "").trim();
  const structuredRatio = structured.length === 0 ? 0 : filledStructured / structured.length;
  return structuredRatio >= 0.5 || contextValue.length >= 40;
}

export function updateDimension(
  id: string,
  key: DimensionKey,
  data: Record<string, string | number>
): Seller | null {
  const seller = getSeller(id);
  if (!seller) return null;
  const input: DimensionInput = {
    filled: evaluateFilled(key, data),
    data,
    updatedAt: nowIso(),
  };
  seller.dimensions = { ...seller.dimensions, [key]: input };
  seller.updatedAt = nowIso();
  return saveSeller(seller);
}

export function dimensionCoverage(seller: Seller): Record<DimensionKey, "ok" | "partial" | "missing"> {
  const coverage: Record<DimensionKey, "ok" | "partial" | "missing"> = {} as Record<
    DimensionKey,
    "ok" | "partial" | "missing"
  >;
  for (const key of DIMENSION_ORDER) {
    const dim = seller.dimensions?.[key];
    if (!dim) {
      coverage[key] = "missing";
      continue;
    }
    coverage[key] = dim.filled ? "ok" : "partial";
  }
  return coverage;
}
