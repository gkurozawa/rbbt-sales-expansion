import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude-cli";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();
  if (typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }
  try {
    const reply = await callClaude(prompt);
    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
