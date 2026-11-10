/**
 * Minimal OpenAI-compatible chat client for the live chat's AI (9Router, the same router mychatbot uses).
 * Settings (apps/web .env.production):
 * - LIVECHAT_AI_BASE_URL — default http://127.0.0.1:20128/v1 (9Router; on the Iran server a tunnel to the old server)
 * - LIVECHAT_AI_API_KEY, LIVECHAT_AI_MODEL — both needed, or the AI stays off
 * - LIVECHAT_AI_FALLBACK_MODELS — comma-separated, tried in order when the main model is over quota / failing
 * - LIVECHAT_AI_REASONING_EFFORT — optional (none | minimal | low | medium | high)
 * Always streams (SSE) and collects the deltas: some routed models never finish a non-streaming request.
 */

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type StreamUsage = { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };

export class AiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "AiError";
  }
}

const cfg = () => ({
  baseUrl: (process.env.LIVECHAT_AI_BASE_URL?.trim() || "http://127.0.0.1:20128/v1").replace(/\/$/, ""),
  key: process.env.LIVECHAT_AI_API_KEY?.trim() ?? "",
  model: process.env.LIVECHAT_AI_MODEL?.trim() ?? "",
  fallbacks: (process.env.LIVECHAT_AI_FALLBACK_MODELS ?? "").split(",").map((m) => m.trim()).filter(Boolean),
  effort: process.env.LIVECHAT_AI_REASONING_EFFORT?.trim() ?? "",
});

export const aiConfigured = () => {
  const c = cfg();
  return Boolean(c.key && c.model);
};

// Models over quota are skipped until their quota resets, so a fallback answers right away.
const g = globalThis as unknown as { __nobatetAiExhausted?: Map<string, number> };
const exhaustedUntil: Map<string, number> = (g.__nobatetAiExhausted ??= new Map());

const isQuotaError = (err: unknown) => err instanceof AiError && (err.status === 429 || /\[429\]|quota|RESOURCE_EXHAUSTED/i.test(err.message));
function retryAfterMs(message: string) {
  const m = message.match(/retryDelay"?\s*:\s*"(\d+)s"/) ?? message.match(/reset after (\d+)s/);
  return Math.min(24 * 3600, Math.max(30, m ? Number(m[1]) : 60)) * 1000;
}

export type AiAnswer = { text: string; model: string; id: string | null; usage: StreamUsage | null };

/** LIVECHAT_AI_MODEL first, then the fallbacks, skipping ones known to be over quota. */
export async function chatCompletion(messages: ChatMessage[], opts: { maxTokens?: number; timeoutMs?: number } = {}): Promise<AiAnswer> {
  const c = cfg();
  if (!c.key || !c.model) throw new AiError("AI is not configured (LIVECHAT_AI_API_KEY / LIVECHAT_AI_MODEL)");
  const models = [c.model, ...c.fallbacks];
  const deadline = Date.now() + (opts.timeoutMs ?? 25_000);
  const now = Date.now();
  const usable = models.filter((m) => (exhaustedUntil.get(m) ?? 0) <= now);
  let lastErr: unknown = new AiError("All AI models are over quota");
  for (const model of usable.length ? usable : models.slice(-1)) {
    const left = deadline - Date.now();
    if (left < 3000) break;
    try {
      return { ...(await callModel(model, messages, opts.maxTokens, left)), model };
    } catch (err) {
      lastErr = err;
      if (isQuotaError(err)) {
        exhaustedUntil.set(model, Date.now() + retryAfterMs(String((err as Error).message)));
        console.warn(`[livechat-ai] ${model} over quota; trying the next model`);
        continue;
      }
      // Provider / network failures: the next model may still answer; timeouts used the budget up.
      if (err instanceof AiError && (err.status === undefined || err.status >= 500) && !/timed out/.test(err.message)) continue;
      throw err;
    }
  }
  throw lastErr;
}

async function callModel(model: string, messages: ChatMessage[], maxTokens: number | undefined, timeoutMs: number) {
  const c = cfg();
  const res = await fetch(`${c.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream", Authorization: `Bearer ${c.key}` },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens ?? 400,
      temperature: 0.4,
      stream: true,
      ...(c.effort ? { reasoning_effort: c.effort } : {}),
    }),
    signal: AbortSignal.timeout(timeoutMs),
  }).catch((err: unknown) => {
    throw new AiError(err instanceof Error && err.name === "TimeoutError" ? "AI request timed out" : `AI request failed: ${err instanceof Error ? err.message : err}`);
  });

  if (!res.ok || !res.body) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } | string };
    const msg = typeof body.error === "string" ? body.error : body.error?.message;
    throw new AiError(msg ?? `AI HTTP ${res.status}`, res.status);
  }

  // A non-streaming JSON answer is accepted too (some routes ignore `stream`).
  if (!(res.headers.get("content-type") ?? "").includes("text/event-stream")) {
    const body = (await res.json()) as { id?: string; usage?: StreamUsage; choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content?.trim();
    if (!text) throw new AiError("AI returned an empty answer");
    return { text, id: body.id ?? null, usage: body.usage ?? null };
  }

  const decoder = new TextDecoder();
  const reader = res.body.getReader();
  let buffer = "";
  let text = "";
  let id: string | null = null;
  let usage: StreamUsage | null = null;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") return finish(text, id, usage);
        try {
          const chunk = JSON.parse(data) as { id?: string; usage?: StreamUsage; choices?: { delta?: { content?: string } }[]; error?: { message?: string } };
          if (chunk.error) throw new AiError(chunk.error.message ?? "AI stream error");
          if (chunk.id) id = chunk.id;
          if (chunk.usage) usage = chunk.usage;
          text += chunk.choices?.[0]?.delta?.content ?? "";
        } catch (err) {
          if (err instanceof AiError) throw err; // ignore unparsable keep-alive lines
        }
      }
    }
  } catch (err) {
    if (err instanceof AiError) throw err;
    throw new AiError(err instanceof Error && err.name === "TimeoutError" ? "AI request timed out" : `AI stream failed: ${err instanceof Error ? err.message : err}`);
  } finally {
    reader.releaseLock();
  }
  return finish(text, id, usage);
}

function finish(text: string, id: string | null, usage: StreamUsage | null) {
  const t = text.trim();
  if (!t) throw new AiError("AI returned an empty answer");
  return { text: t, id, usage };
}
