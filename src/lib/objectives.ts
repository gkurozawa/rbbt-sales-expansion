import "server-only";
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import {
  HistoricalSeries,
  Objective,
  ObjectiveStatus,
  ObjectiveTemplate,
  OBJECTIVE_TEMPLATES,
  VariableSelection,
  variableId,
  MIN_POINTS_REQUIRED,
} from "./objective-types";

const DATA_DIR = path.join(process.cwd(), "data", "objectives");

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

export function listObjectives(): Objective[] {
  ensureDir();
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  const items: Objective[] = [];
  for (const f of files) {
    try {
      items.push(JSON.parse(readFileSync(path.join(DATA_DIR, f), "utf8")) as Objective);
    } catch {
      /* skip */
    }
  }
  items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return items;
}

export function getObjective(id: string): Objective | null {
  ensureDir();
  const p = fileFor(id);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as Objective;
  } catch {
    return null;
  }
}

export function saveObjective(o: Objective): Objective {
  ensureDir();
  writeFileSync(fileFor(o.id), JSON.stringify(o, null, 2));
  return o;
}

export function deleteObjective(id: string): boolean {
  ensureDir();
  const p = fileFor(id);
  if (!existsSync(p)) return false;
  unlinkSync(p);
  return true;
}

export type CreateObjectiveInput = {
  title: string;
  description?: string;
  templateId?: string;
  metricLabel?: string;
  metricUnit?: string;
  baseline?: number;
  target: number;
  direction?: "up" | "down";
  horizonDays?: number;
  variables?: VariableSelection[];
};

export function createObjective(input: CreateObjectiveInput): Objective {
  const template: ObjectiveTemplate | undefined = input.templateId
    ? OBJECTIVE_TEMPLATES.find((t) => t.id === input.templateId)
    : undefined;
  const o: Objective = {
    id: newId(),
    title: input.title,
    description: input.description,
    category: template?.category ?? "custom",
    templateId: template?.id,
    metricLabel: input.metricLabel ?? template?.metricLabel ?? "Métrica",
    metricUnit: input.metricUnit ?? template?.metricUnit ?? "",
    baseline: input.baseline,
    target: input.target,
    direction: input.direction ?? template?.direction ?? "up",
    horizonDays: input.horizonDays ?? template?.defaultHorizonDays ?? 90,
    status: "draft",
    variables: input.variables ?? template?.variables ?? [],
    series: {},
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  return saveObjective(o);
}

export function patchObjective(id: string, patch: Partial<Objective>): Objective | null {
  const o = getObjective(id);
  if (!o) return null;
  const updated: Objective = {
    ...o,
    ...patch,
    id: o.id,
    createdAt: o.createdAt,
    updatedAt: nowIso(),
  };
  return saveObjective(updated);
}

export function setSeries(id: string, vid: string, series: HistoricalSeries): Objective | null {
  const o = getObjective(id);
  if (!o) return null;
  o.series = { ...o.series, [vid]: series };
  o.updatedAt = nowIso();
  // Avança o status do rascunho conforme dados chegam
  if (o.status === "draft") o.status = "data";
  return saveObjective(o);
}

// Heurística: variáveis required têm série com >= MIN_POINTS_REQUIRED pontos
export function isReadyForValidation(o: Objective): boolean {
  const requiredVars = o.variables.filter((v) => v.required);
  for (const v of requiredVars) {
    const s = o.series[variableId(v)];
    if (!s || s.points.length < MIN_POINTS_REQUIRED) return false;
  }
  return requiredVars.length > 0;
}

export function setStatus(id: string, status: ObjectiveStatus): Objective | null {
  const o = getObjective(id);
  if (!o) return null;
  o.status = status;
  o.updatedAt = nowIso();
  return saveObjective(o);
}
