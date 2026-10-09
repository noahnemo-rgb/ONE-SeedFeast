import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { SPACE_BUNNY_MODEL } from "ai-buffer";
import { createAiApp, ownerProbe } from "./ai-proxy.js";

const OWNER = "sk-test-owner-9f3c";
const BYOK = "sk-user-byok-ab12";
const GEMINI = "AIzaSyOwnerGeminiKey9f3c";

function sse(text) {
  const body = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\ndata: [DONE]\n`;
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

function geminiSse(text) {
  const body = `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}\n`;
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

function appFor(env, fetchImpl, rateLimit) {
  return createAiApp({ env, fetchImpl, rateLimit });
}

function post(app, path, body, origin = "https://seedfeast.ai") {
  const headers = { "content-type": "application/json" };
  if (origin) headers.origin = origin;
  return app.request(path, { method: "POST", headers, body: JSON.stringify(body) });
}

test("owner calls go through the proxy allowlist and do not echo the key", async () => {
  const calls = [];
  const env = { OPENROUTER_API_KEY: OWNER, OPENROUTER_MODEL: "openai/gpt-4o-mini" };
  const app = appFor(env, async (url, init) => {
    calls.push({ url: String(url), init });
    const payload = JSON.parse(String(init.body));
    if (payload.model === SPACE_BUNNY_MODEL) return new Response("slow down", { status: 429 });
    return sse("Members can gift the tubers.");
  });

  const denied = await post(app, "/api/ai", { purpose: "chat", message: "Move the chufa." }, "https://evil.example");
  assert.equal(denied.status, 502);
  assert.equal(calls.length, 0);
  const deniedBody = await denied.json();
  assert.equal(deniedBody.error, "SeedFeast could not answer that.");
  assert.equal(JSON.stringify(deniedBody).includes(OWNER), false);

  const missing = await post(app, "/api/ai/proxy", { provider: "puter", model: "openai/gpt-4o-mini", message: "hi" });
  assert.equal(missing.status, 400);
  assert.equal(calls.length, 0);

  const response = await post(app, "/api/ai", {
    purpose: "chat",
    message: "Keep the chufa line moving between growers.",
    model: "secret-model-not-allowed",
  });
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.reply, "Members can gift the tubers.");
  assert.equal(data.connection, "openrouter");
  assert.deepEqual(data.models, [SPACE_BUNNY_MODEL, "openai/gpt-4o-mini"]);
  assert.equal(JSON.stringify(data).includes(OWNER), false);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].init.headers.Authorization, `Bearer ${OWNER}`);
  assert.equal(calls[1].init.headers["HTTP-Referer"], "https://seedfeast.ai");
  const sent = JSON.parse(String(calls[1].init.body));
  assert.equal(sent.model, "openai/gpt-4o-mini");
  assert.match(sent.messages[0].content, /sell/);
  assert.match(sent.messages[0].content, /gift/);
  assert.equal(String(calls[1].url).includes(OWNER), false);
});

test("a typed key is used once as byok and is not kept for the next owner call", async () => {
  const bearers = [];
  const env = { OPENROUTER_API_KEY: OWNER };
  const app = appFor(env, async (_url, init) => {
    bearers.push(init.headers.Authorization);
    const payload = JSON.parse(String(init.body));
    if (payload.model === SPACE_BUNNY_MODEL) return new Response("no", { status: 429 });
    return sse("ok");
  });
  const first = await post(app, "/api/ai", { purpose: "chat", message: "Share the emmer.", byok: BYOK });
  assert.equal(first.status, 200);
  assert.equal(JSON.stringify(await first.json()).includes(BYOK), false);
  assert.ok(bearers.includes(`Bearer ${BYOK}`));
  assert.equal(bearers.includes(`Bearer ${OWNER}`), false);

  bearers.length = 0;
  const second = await post(app, "/api/feast", { seeds: "tomato, basil" });
  assert.equal(second.status, 200);
  assert.equal(JSON.stringify(await second.json()).includes(OWNER), false);
  assert.ok(bearers.includes(`Bearer ${OWNER}`));
  assert.equal(bearers.includes(`Bearer ${BYOK}`), false);
});

test("gemini, gateway, nvidia, and llmapi stay on the allowlist and off the URL", async () => {
  const seen = [];
  const env = {
    OPENROUTER_API_KEY: OWNER,
    AI_GATEWAY_API_KEY: "gateway-owner-key-9f3c",
    GEMINI_API_KEY: GEMINI,
    NVIDIA_API_KEY: "nvapi-ownersecret9f3c",
    LLM_API_KEY: "sk-llmapi-owner9f3c",
  };
  const app = appFor(env, async (url, init) => {
    seen.push({ url: String(url), headers: init.headers });
    if (String(url).includes("generativelanguage.googleapis.com")) return geminiSse("gemini reply");
    return sse("provider reply");
  });

  const cases = [
    ["vercel-gateway", "https://ai-gateway.vercel.sh/v1/chat/completions", "Authorization", "Bearer gateway-owner-key-9f3c"],
    ["gemini", "https://generativelanguage.googleapis.com/", "x-goog-api-key", GEMINI],
    ["nvidia", "https://integrate.api.nvidia.com/v1/chat/completions", "Authorization", "Bearer nvapi-ownersecret9f3c"],
    ["llmapi", "https://api.llmapi.ai/v1/chat/completions", "Authorization", "Bearer sk-llmapi-owner9f3c"],
  ];
  for (const [provider, urlPart, header, value] of cases) {
    seen.length = 0;
    const response = await post(app, "/api/ai", { purpose: "listing", message: "Gift the chufa.", provider });
    const data = await response.json();
    assert.equal(response.status, 200, JSON.stringify(data));
    assert.equal(data.connection, provider);
    assert.equal(seen.length, 1);
    assert.ok(seen[0].url.startsWith(urlPart), seen[0].url);
    assert.equal(seen[0].headers[header], value);
    assert.equal(seen[0].url.includes(value), false);
    assert.equal(seen[0].url.includes("key="), false);
    assert.equal(JSON.stringify(data).includes(value), false);
  }
});

test("a missing origin or missing owner key does not call a provider", async () => {
  let called = false;
  const app = appFor({ OPENROUTER_API_KEY: "" }, async () => {
    called = true;
    return sse("no");
  });
  const noOrigin = await app.request("/api/ai", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ purpose: "chat", message: "Trade the teff." }),
  });
  assert.equal(noOrigin.status, 502);
  assert.equal(called, false);

  const noKey = await post(app, "/api/feast", { seeds: "beans" });
  const body = await noKey.json();
  assert.equal(noKey.status, 503);
  assert.match(body.error, /no OpenRouter key/);
  assert.equal(called, false);
});

test("the provider probe returns a masked tail and rejects another origin", async () => {
  const env = {
    OPENROUTER_API_KEY: OWNER,
    GEMINI_API_KEY: GEMINI,
    VERCEL_URL: "seedfeast-preview.vercel.app",
  };
  const app = appFor(env, async () => sse("no"));
  const probe = ownerProbe(env);
  assert.equal(probe.openrouterKey, true);
  assert.equal(probe.geminiKey, true);
  assert.equal(probe.keyHints.openrouter, "9f3c");
  assert.equal(probe.keyHints.gemini, "9f3c");
  assert.equal(JSON.stringify(probe).includes("sk-test-owner"), false);
  assert.equal(JSON.stringify(probe).includes("AIza"), false);

  const ok = await post(app, "/api/ai/providers", {}, "https://seedfeast-preview.vercel.app");
  const json = await ok.json();
  assert.equal(ok.status, 200);
  assert.equal(json.keyHints["vercel-gateway"], "");
  assert.equal(JSON.stringify(json).includes(OWNER), false);

  const blocked = await post(app, "/api/ai/providers", {}, "https://evil.example");
  assert.equal(blocked.status, 403);
  assert.equal(JSON.stringify(await blocked.json()).includes(OWNER), false);
});

test("empty questions and a provider error body stay off the wire", async () => {
  let called = false;
  const app = appFor({ OPENROUTER_API_KEY: OWNER }, async () => {
    called = true;
    return new Response(`leaked ${OWNER}`, { status: 500 });
  });
  const empty = await post(app, "/api/ai", { purpose: "chat", message: "   " });
  assert.equal(empty.status, 400);
  assert.match((await empty.json()).error, /what you need/);
  assert.equal(called, false);

  const failed = await post(app, "/api/ai", { purpose: "chat", message: "Share the seeds.", provider: "openrouter" });
  const body = await failed.json();
  assert.equal(failed.status, 502);
  assert.equal(body.error, "SeedFeast could not answer that.");
  assert.equal(JSON.stringify(body).includes(OWNER), false);
});

test("the server entry does not pass the owner key into the browser router", async () => {
  const source = await readFile(new URL("../../index.ts", import.meta.url), "utf8");
  assert.equal(source.includes("OPENROUTER_API_KEY"), false);
  assert.equal(source.includes("askConnection"), false);
  assert.equal(source.includes("askFeast"), false);
  assert.match(source, /mountAiRoutes/);
});
