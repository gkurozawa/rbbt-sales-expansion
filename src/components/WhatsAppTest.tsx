"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, MessageCircle, MessageSquare, XCircle } from "lucide-react";
import {
  CHANNEL_LABEL,
  CLASSIFICATION_LABEL,
  ChannelVerification,
  ResponseSpeed,
  SPEED_LABEL,
  TestChannel,
  WhatsAppAnalysis,
  WHATSAPP_TEST_QUESTION,
} from "@/lib/whatsapp-types";

const SPEED_ORDER: ResponseSpeed[] = ["instant", "minutes", "tens", "hours", "no-response"];

function titleFor(v: ChannelVerification | null): string {
  if (!v) return "Atendimento por chat / WhatsApp";
  if (v.whatsapp && v.chat) return "Atendimento por WhatsApp + chat";
  if (v.whatsapp) return "Atendimento por WhatsApp";
  if (v.chat) return "Atendimento por chat";
  return "Atendimento por chat / WhatsApp";
}

export function WhatsAppTest({ company }: { company: string }) {
  const [verification, setVerification] = useState<ChannelVerification | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Canal selecionado pro registro/análise — preferindo WhatsApp se ambos
  const [channel, setChannel] = useState<TestChannel>("whatsapp");
  const [showForm, setShowForm] = useState(false);
  const [autoReply, setAutoReply] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [speed, setSpeed] = useState<ResponseSpeed>("minutes");
  const [notes, setNotes] = useState("");

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<WhatsAppAnalysis | null>(null);

  // Se a verificação muda, define o canal padrão (WhatsApp tem prioridade)
  useEffect(() => {
    if (!verification) return;
    if (verification.whatsapp) setChannel("whatsapp");
    else if (verification.chat) setChannel("chat");
  }, [verification]);

  async function verify() {
    setVerifying(true);
    setVerifyError(null);
    setVerification(null);
    setAnalysis(null);
    setShowForm(false);
    try {
      const res = await fetch("/api/whatsapp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setVerification(data as ChannelVerification);
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "erro desconhecido");
    } finally {
      setVerifying(false);
    }
  }

  async function submitTest(e: React.FormEvent) {
    e.preventDefault();
    setAnalyzing(true);
    setAnalyzeError(null);
    setAnalysis(null);
    const channelDetail =
      channel === "whatsapp"
        ? verification?.whatsapp?.display
        : verification?.chat?.provider;
    try {
      const res = await fetch("/api/whatsapp/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          channel,
          channelDetail,
          question: WHATSAPP_TEST_QUESTION,
          autoReplyReceived: autoReply,
          responseText: responseText.trim() || undefined,
          speed,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setAnalysis(data as WhatsAppAnalysis);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "erro desconhecido");
    } finally {
      setAnalyzing(false);
    }
  }

  const waLink =
    verification?.whatsapp
      ? `https://wa.me/${verification.whatsapp.number}?text=${encodeURIComponent(WHATSAPP_TEST_QUESTION)}`
      : null;

  const hasAny = Boolean(verification?.whatsapp || verification?.chat);
  const hasBoth = Boolean(verification?.whatsapp && verification?.chat);

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
      <div className="mb-3 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-emerald-600" />
        <h4 className="text-base font-semibold">{titleFor(verification)}</h4>
      </div>

      {!verification && !verifying && (
        <>
          <p className="mb-3 text-sm opacity-80">
            Vou carregar o site oficial e procurar links de WhatsApp <span className="font-medium">e</span> widgets de chat (JivoChat, Zendesk, Crisp, Intercom, Tawk, Take Blip, etc.).
          </p>
          <button
            type="button"
            onClick={verify}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            Verificar canais no site
          </button>
        </>
      )}

      {verifying && (
        <div className="flex items-center gap-2 text-sm opacity-80">
          <Loader2 className="h-4 w-4 animate-spin" /> Buscando site e varrendo HTML…
        </div>
      )}

      {verifyError && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm">
          <div className="font-medium">Erro na verificação</div>
          <div className="opacity-80">{verifyError}</div>
        </div>
      )}

      {verification && (
        <div className="space-y-3">
          <div className="rounded-lg bg-white/60 p-3 text-sm dark:bg-white/5">
            {verification.whatsapp ? (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">WhatsApp: {verification.whatsapp.display}</div>
                  <div className="text-xs opacity-70">{verification.whatsapp.source}</div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 opacity-70">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
                <div className="font-medium">WhatsApp não detectado no HTML inicial.</div>
              </div>
            )}

            <div className="mt-2 flex items-start gap-3">
              {verification.chat ? (
                <>
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <div className="font-semibold">Chat: {verification.chat.provider}</div>
                    <div className="text-xs opacity-70">{verification.chat.source}</div>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500 opacity-70" />
                  <div className="font-medium opacity-70">Nenhum widget de chat conhecido detectado.</div>
                </>
              )}
            </div>

            {verification.websiteUrl && (
              <a
                href={verification.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs underline opacity-70 hover:opacity-100"
              >
                {verification.websiteUrl} <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {verification.notes && (
              <p className="mt-2 text-xs opacity-80">{verification.notes}</p>
            )}
          </div>

          {hasAny && (
            <div className="space-y-2">
              <div className="rounded-lg border border-emerald-500/30 bg-white p-3 text-sm dark:bg-white/5">
                <div className="text-xs font-semibold uppercase tracking-wide opacity-70">Mensagem de teste</div>
                <p className="mt-1 italic">&ldquo;{WHATSAPP_TEST_QUESTION}&rdquo;</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {waLink && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setChannel("whatsapp")}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700"
                  >
                    <MessageCircle className="h-4 w-4" /> Testar via WhatsApp
                    <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                  </a>
                )}
                {verification.chat && verification.websiteUrl && (
                  <a
                    href={verification.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setChannel("chat")}
                    className="inline-flex items-center gap-2 rounded-lg border border-indigo-500 bg-indigo-500/10 px-3 py-1.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-500/20 dark:text-indigo-300"
                  >
                    <MessageSquare className="h-4 w-4" /> Abrir site e testar chat ({verification.chat.provider})
                    <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setShowForm((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg border border-black/15 px-3 py-1.5 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                >
                  {showForm ? "Esconder" : "Registrar resultado do teste"}
                </button>
              </div>
              {hasBoth && (
                <p className="text-xs opacity-70">
                  Recomendação: priorize o WhatsApp (canal mais direto). Se quiser comparar, teste o chat depois.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {hasAny && showForm && (
        <form onSubmit={submitTest} className="mt-4 space-y-3 rounded-lg border border-black/10 bg-white/60 p-3 text-sm dark:border-white/10 dark:bg-white/5">
          {hasBoth && (
            <div>
              <label className="mb-1 block font-medium">Canal testado</label>
              <div className="flex gap-2">
                {(["whatsapp", "chat"] as TestChannel[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setChannel(c)}
                    aria-pressed={channel === c}
                    className={`rounded-md border px-3 py-1 text-sm transition ${
                      channel === c
                        ? "border-emerald-500 bg-emerald-500/10 font-medium"
                        : "border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                    }`}
                  >
                    {CHANNEL_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={autoReply} onChange={(e) => setAutoReply(e.target.checked)} />
            <span>Recebeu auto-reply imediata?</span>
          </label>

          <div>
            <label className="mb-1 block font-medium">Texto recebido (auto-reply + resposta posterior)</label>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Cole exatamente o que recebeu. Deixe vazio se não veio nada."
              rows={4}
              className="w-full rounded-lg border border-black/15 bg-transparent p-2 dark:border-white/15"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium">Velocidade da primeira resposta</label>
            <div className="flex flex-wrap gap-2">
              {SPEED_ORDER.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  aria-pressed={speed === s}
                  className={`rounded-md border px-2.5 py-1 text-xs transition ${
                    speed === s
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                  }`}
                >
                  {SPEED_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block font-medium">Observações (opcional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ex.: pediu nome e CEP antes de qualquer coisa; depois caiu em humano"
              className="w-full rounded-lg border border-black/15 bg-transparent p-2 dark:border-white/15"
            />
          </div>

          <button
            type="submit"
            disabled={analyzing}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {analyzing && <Loader2 className="h-4 w-4 animate-spin" />}
            {analyzing ? "Analisando…" : `Analisar resposta no ${CHANNEL_LABEL[channel]}`}
          </button>
        </form>
      )}

      {analyzeError && (
        <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm">
          <div className="font-medium">Erro na análise</div>
          <div className="opacity-80">{analyzeError}</div>
        </div>
      )}

      {analysis && (
        <div className="mt-4 space-y-3 rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-4 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
                Classificação · {CHANNEL_LABEL[analysis.channel]}
              </div>
              <div className="text-base font-semibold">{CLASSIFICATION_LABEL[analysis.classification]}</div>
              <div className="text-xs opacity-70">{SPEED_LABEL[analysis.speed]}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold uppercase tracking-wide opacity-70">Qualidade</div>
              <div className="text-2xl font-bold tabular-nums">{analysis.qualityScore}/10</div>
            </div>
          </div>

          {analysis.observations.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide opacity-70">Observações</div>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {analysis.observations.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </div>
          )}

          {analysis.rbbtPitch && (
            <div className="rounded-md bg-white/60 p-3 dark:bg-white/5">
              <div className="text-xs font-semibold uppercase tracking-wide opacity-70">Pitch RBBT Sales</div>
              <p className="mt-1">{analysis.rbbtPitch}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
