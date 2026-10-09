import { Hono } from "hono";
import {
  createAiProxy,
  createMemoryRateLimit,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_LLMAPI_MODEL,
  DEFAULT_MODEL,
  DEFAULT_NVIDIA_MODEL,
  DEFAULT_VERCEL_GATEWAY_MODEL,
  readGatewayApiKey,
  readGeminiApiKey,
  readLlmapiApiKey,
  readNvidiaApiKey,
  SERVER_PROXY_PROVIDERS,
  SPACE_BUNNY_MODEL,
} from "ai-buffer";
import { feastMessage, purposePrompt } from "../../feast/seedfeast-router.js";

export const SEEDFEAST_SITE = "https://seedfeast.ai";

const STATIC_ORIGINS = ["https://seedfeast.ai", "https://www.seedfeast.ai"];

const MISSING_OWNER_KEY =
  "The server has no OpenRouter key. In the browser, Puter runs first, and a key saved on this device tries Space Bunny Alpha next.";

const FAILOVER = new Set(["missing_key", "rate_limited", "payment_required", "provider_error"]);

function unique(values) {
  const seen = new Set();
  const list = [];
  for (const value of values) {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text || seen.has(text)) continue;
    seen.add(text);
    list.push(text);
  }
  return list;
}

export function modelAllowlist(env = process.env) {
  const add = (name, fallback) => unique([fallback, env[name]]);
  return {
    openrouter: add("OPENROUTER_MODEL", DEFAULT_MODEL),
    "space-bunny": [SPACE_BUNNY_MODEL],
    "vercel-gateway": add("AI_GATEWAY_MODEL", DEFAULT_VERCEL_GATEWAY_MODEL),
    gemini: add("GEMINI_MODEL", DEFAULT_GEMINI_MODEL),
    nvidia: add("NVIDIA_MODEL", DEFAULT_NVIDIA_MODEL),
    llmapi: add("LLMAPI_MODEL", DEFAULT_LLMAPI_MODEL),
  };
}

export function allowedOrigins(env = process.env, request) {
  const origins = new Set(STATIC_ORIGINS);
  for (const name of ["VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"]) {
    const host = env[name]?.trim().replace(/^https?:\/\//, "");
    if (host) origins.add(`https://${host}`);
  }
  const extra = env.AI_BUFFER_ALLOWED_ORIGINS;
  if (extra) {
    for (const item of extra.split(",")) {
      const value = item.trim();
      if (value) origins.add(value);
    }
  }
  if (request?.url) {
    try {
      origins.add(new URL(request.url).origin);
    } catch {
      /* A bad URL does not widen the list. */
    }
  }
  return [...origins];
}

function hintTail(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length < 4) return "";
  return text.slice(-4);
}

/** Booleans and 4-character tails only. The full owner key is not copied. */
export function ownerProbe(env = process.env) {
  const openrouter = env.OPENROUTER_API_KEY?.trim() || "";
  const gateway = readGatewayApiKey(env) || "";
  const gemini = readGeminiApiKey(env) || "";
  const nvidia = readNvidiaApiKey(env) || "";
  const llmapi = readLlmapiApiKey(env) || "";
  return {
    puterSignedIn: false,
    openrouterKey: Boolean(openrouter),
    gatewayKey: Boolean(gateway),
    geminiKey: Boolean(gemini),
    nvidiaKey: Boolean(nvidia),
    llmapiKey: Boolean(llmapi),
    keyHints: {
      openrouter: hintTail(openrouter),
      "space-bunny": hintTail(openrouter),
      "vercel-gateway": hintTail(gateway),
      gemini: hintTail(gemini),
      nvidia: hintTail(nvidia),
      llmapi: hintTail(llmapi),
    },
  };
}

export function resolveModel(provider, requested, env = process.env) {
  const allow = modelAllowlist(env)[provider] ?? [];
  if (provider === "space-bunny") return allow[0] || SPACE_BUNNY_MODEL;
  const model = typeof requested === "string" ? requested.trim() : "";
  if (model && allow.includes(model)) return model;
  return allow[0] || "";
}

function createProxy({ env, fetchImpl, rateLimit, request }) {
  return createAiProxy({
    allowedOrigins: allowedOrigins(env, request),
    allowMissingOrigin: false,
    providers: SERVER_PROXY_PROVIDERS,
    models: modelAllowlist(env),
    rateLimit,
    env,
    allowByok: true,
    appName: "SeedFeast",
    siteUrl: SEEDFEAST_SITE,
    fetchImpl,
  });
}

export async function readProxyResult(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/event-stream")) {
    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }
    return {
      ok: false,
      status: response.status,
      code: payload?.error?.code || "provider_error",
      message: typeof payload?.error?.message === "string" ? payload.error.message : "",
    };
  }
  const raw = await response.text();
  let reply = "";
  let error = null;
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch {
      continue;
    }
    if (typeof parsed?.text === "string") reply += parsed.text;
    if (parsed?.error) error = parsed.error;
  }
  if (error && !reply) {
    return {
      ok: false,
      status: 502,
      code: error.code || "provider_error",
      message: typeof error.message === "string" ? error.message : "",
    };
  }
  if (!reply) return { ok: false, status: 502, code: "provider_error", message: "" };
  return { ok: true, reply };
}

function publicFailure(result, fallback) {
  if (result?.code === "missing_key") return { status: 503, error: MISSING_OWNER_KEY };
  return { status: 502, error: fallback };
}

function validationStatus(error) {
  const message = error instanceof Error ? error.message : "";
  if (
    message.includes("what you need") ||
    message.includes("Choose chat") ||
    message.includes("seeds or ingredients") ||
    message.includes("Send the request") ||
    message.includes("Send the seeds")
  ) {
    return 400;
  }
  return 502;
}

async function askThroughProxy({ env, fetchImpl, rateLimit, request, messages, provider, model, byok, fallback }) {
  const plan =
    typeof provider === "string" && provider.trim() ? [provider.trim()] : ["space-bunny", "openrouter"];
  const proxy = createProxy({ env, fetchImpl, rateLimit, request });
  const origin = request.headers.get("origin");
  const forwarded = request.headers.get("x-forwarded-for");
  const attempted = [];
  let last = null;
  for (const id of plan) {
    const chosen = resolveModel(id, model, env);
    attempted.push(chosen);
    const headers = { "content-type": "application/json" };
    if (origin) headers.origin = origin;
    if (forwarded) headers["x-forwarded-for"] = forwarded;
    const body = { provider: id, model: chosen, messages };
    if (byok) body.byok = byok;
    const proxyRequest = new Request(request.url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const response = await proxy(proxyRequest);
    const result = await readProxyResult(response);
    if (result.ok) {
      return { ok: true, reply: result.reply, connection: id, models: attempted };
    }
    last = result;
    if (provider || !FAILOVER.has(result.code)) break;
  }
  const failure = publicFailure(last, fallback);
  return { ok: false, ...failure, connection: null, models: attempted };
}

function readByok(value) {
  if (typeof value !== "string") return "";
  const text = value.trim();
  return text || "";
}

function chatMessages(body) {
  const purpose = body.purpose === "listing" || body.purpose === "coordinate" ? body.purpose : "chat";
  if (body.purpose != null && body.purpose !== "chat" && body.purpose !== "listing" && body.purpose !== "coordinate") {
    const error = new Error("Choose chat, listing help, or community coordination.");
    error.statusCode = 400;
    throw error;
  }
  const text = typeof body.message === "string" ? body.message.trim() : "";
  if (!text) {
    const error = new Error("Tell SeedFeast what you need.");
    error.statusCode = 400;
    throw error;
  }
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const full = notes ? `${text}\n\nNotes:\n${notes}` : text;
  return {
    purpose,
    messages: [
      { role: "system", content: purposePrompt(purpose) },
      { role: "user", content: full },
    ],
  };
}

function cookMessages(body) {
  return [
    { role: "system", content: purposePrompt("cook") },
    { role: "user", content: feastMessage(body.seeds, body.notes) },
  ];
}

async function readJson(c, invalidMessage) {
  try {
    return await c.req.json();
  } catch {
    const error = new Error(invalidMessage);
    error.statusCode = 400;
    throw error;
  }
}

export function mountAiRoutes(app, options = {}) {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl;
  const rateLimit = options.rateLimit ?? createMemoryRateLimit({ limit: 30, windowMs: 60_000 });

  app.post("/api/ai/proxy", async (c) => {
    const proxy = createProxy({ env, fetchImpl, rateLimit, request: c.req.raw });
    return proxy(c.req.raw);
  });

  app.post("/api/ai/providers", (c) => {
    const origin = c.req.header("origin");
    const allowed = allowedOrigins(env, c.req.raw);
    if (!origin || !allowed.includes(origin)) {
      return c.json({ error: "SeedFeast could not answer that." }, 403);
    }
    return c.json(ownerProbe(env));
  });

  app.post("/api/ai", async (c) => {
    try {
      const body = await readJson(c, "Send the request as JSON.");
      const { purpose, messages } = chatMessages(body);
      const result = await askThroughProxy({
        env,
        fetchImpl,
        rateLimit,
        request: c.req.raw,
        messages,
        provider: body.provider,
        model: body.model,
        byok: readByok(body.byok),
        fallback: "SeedFeast could not answer that.",
      });
      if (!result.ok) return c.json({ error: result.error }, result.status);
      return c.json({
        reply: result.reply,
        models: result.models,
        connection: result.connection,
        purpose,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "SeedFeast could not answer that.";
      return c.json({ error: message }, error.statusCode || validationStatus(error));
    }
  });

  app.post("/api/feast", async (c) => {
    try {
      const body = await readJson(c, "Send the seeds as JSON.");
      const messages = cookMessages(body);
      const result = await askThroughProxy({
        env,
        fetchImpl,
        rateLimit,
        request: c.req.raw,
        messages,
        provider: body.provider,
        model: body.model,
        byok: readByok(body.byok),
        fallback: "SeedFeast could not cook that.",
      });
      if (!result.ok) return c.json({ error: result.error }, result.status);
      return c.json({ recipe: result.reply, models: result.models, connection: result.connection });
    } catch (error) {
      const message = error instanceof Error ? error.message : "SeedFeast could not cook that.";
      return c.json({ error: message }, error.statusCode || validationStatus(error));
    }
  });
}

export function createAiApp(options) {
  const app = new Hono();
  mountAiRoutes(app, options);
  return app;
}
