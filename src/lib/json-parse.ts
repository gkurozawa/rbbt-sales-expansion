import "server-only";
import { jsonrepair } from "jsonrepair";

// Remove markdown fences se o Claude decidir usar ```json
function stripFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

// Tenta parse "honesto" do JSON inteiro. Lança se nenhuma estratégia funciona.
export function safeParseJSON(raw: string): unknown {
  const cleaned = stripFences(raw);

  // Tenta extrair o primeiro objeto/array delimitado (descarta prosa antes/depois)
  const candidate = extractOutermost(cleaned) ?? cleaned;

  try {
    return JSON.parse(candidate);
  } catch {}

  try {
    return JSON.parse(jsonrepair(candidate));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro de parse";
    throw new Error(`Resposta do Claude não pôde ser interpretada como JSON (${msg})`);
  }
}

// Para respostas tipo { "companies": [ {...}, {...}, ... ] } que vieram cortadas:
// percorre o texto e devolve todos os objetos { ... } bem formados de nível 1 que
// contenham uma chave "company". Útil pra salvar parcialmente o que veio.
export function salvageObjects(raw: string, requiredKey: string): unknown[] {
  const text = stripFences(raw);
  const results: unknown[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        const block = text.slice(start, i + 1);
        const needle = new RegExp(`["']?${requiredKey}["']?\\s*:`);
        if (needle.test(block)) {
          try {
            results.push(JSON.parse(block));
          } catch {
            try {
              results.push(JSON.parse(jsonrepair(block)));
            } catch {
              // ignora blocos irreparáveis
            }
          }
        }
        start = -1;
      } else if (depth < 0) {
        // chave de fechamento solta — reseta
        depth = 0;
        start = -1;
      }
    }
  }
  return results;
}

// Encontra o primeiro caractere de '{' ou '[' e o último '}' ou ']' correspondente.
// Bem permissivo: não respeita strings, mas serve como filtro inicial.
function extractOutermost(text: string): string | null {
  const firstObj = text.indexOf("{");
  const firstArr = text.indexOf("[");
  let start = -1;
  let open = "";
  let close = "";
  if (firstObj === -1 && firstArr === -1) return null;
  if (firstObj === -1 || (firstArr !== -1 && firstArr < firstObj)) {
    start = firstArr;
    open = "[";
    close = "]";
  } else {
    start = firstObj;
    open = "{";
    close = "}";
  }
  const lastClose = text.lastIndexOf(close);
  if (lastClose <= start) return null;
  return text.slice(start, lastClose + 1);
}
