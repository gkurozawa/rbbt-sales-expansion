import { spawn } from "child_process";
import { realpathSync, accessSync, constants } from "fs";

const CLAUDE_BINARY = (() => {
  const candidates = [
    process.env.CLAUDE_PATH,
    "/usr/local/bin/claude",
    "/opt/homebrew/bin/claude",
    "/usr/bin/claude",
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    try {
      const real = realpathSync(p);
      accessSync(real, constants.X_OK);
      return real;
    } catch {}
  }
  return process.env.CLAUDE_PATH || "/usr/local/bin/claude";
})();

const CLAUDE_MODEL = process.env.CLAUDE_MODEL;

function callClaudeOnce(prompt: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const { ANTHROPIC_API_KEY: _key, ...safeEnv } = process.env as NodeJS.ProcessEnv;

    const args = ["-p", ...(CLAUDE_MODEL ? ["--model", CLAUDE_MODEL] : [])];
    const proc = spawn(CLAUDE_BINARY, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...safeEnv,
        HOME: process.env.HOME || "",
        PATH: `/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:${process.env.PATH || ""}`,
      },
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    function settle(code: number | null) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { proc.stdout.destroy(); } catch {}
      try { proc.stderr.destroy(); } catch {}
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `Claude CLI exited with code ${code}`));
    }

    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stdout.on("error", () => {});
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    proc.stderr.on("error", () => {});
    proc.on("error", (err) => { if (!settled) { settled = true; clearTimeout(timer); reject(err); } });

    // 'exit' not 'close' — claude spawns children that delay 'close'
    proc.on("exit", (code) => settle(code));

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        proc.kill("SIGKILL");
        reject(new Error(`Claude CLI timeout após ${timeoutMs / 1000}s`));
      }
    }, timeoutMs);

    proc.stdin.write(prompt, "utf8");
    proc.stdin.end();
  });
}

export async function callClaude(prompt: string, timeoutMs = 120000): Promise<string> {
  try {
    return await callClaudeOnce(prompt, timeoutMs);
  } catch (err) {
    if (err instanceof Error && err.message.includes("timeout")) {
      return callClaudeOnce(prompt, timeoutMs);
    }
    throw err;
  }
}
