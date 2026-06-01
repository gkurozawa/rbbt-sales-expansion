import "server-only";
import { readFileSync } from "fs";
import path from "path";

// Lê o body de uma skill local em .claude/skills/<name>/SKILL.md, removendo o frontmatter YAML.
// Retorna string vazia se o arquivo não existir (degrada graciosamente em deploys sem .claude/).
export function loadSkillBody(skillName: string): string {
  try {
    const skillPath = path.join(process.cwd(), `.claude/skills/${skillName}/SKILL.md`);
    const raw = readFileSync(skillPath, "utf8");
    return raw.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "").trim();
  } catch {
    return "";
  }
}
