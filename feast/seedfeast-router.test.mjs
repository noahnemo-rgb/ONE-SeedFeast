import assert from "node:assert/strict";
import test from "node:test";
import { AiBufferError } from "ai-buffer";
import { askConnection, askFeast, createSeedFeastRouter, purposePrompt } from "./seedfeast-router.js";

function sse(text) {
  const body = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\ndata: [DONE]\n`;
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

test("browser Puter fails over to Space Bunny Alpha, then the OpenRouter model", async () => {
  const models = [];
  const extras = [];
  const result = await askFeast({
    seeds: "tomato, basil, day-old bread",
    notes: "one pan",
    apiKey: "sk-test",
    platform: "browser",
    timeoutMs: 1000,
    loadPuter: async () => {
      throw Object.assign(new Error("slow down"), { status: 429 });
    },
    fetchImpl: async (_input, init) => {
      const payload = JSON.parse(String(init?.body));
      models.push(payload.model);
      extras.push(payload.reasoning ?? null);
      if (models.length === 1) return new Response("slow down", { status: 429 });
      return sse("Tomato bread feast");
    },
  });

  assert.equal(result.recipe, "Tomato bread feast");
  assert.equal(result.connection, "openrouter");
  assert.deepEqual(models, ["stealth/space-bunny-alpha", "openai/gpt-4o-mini"]);
  assert.deepEqual(result.models, ["stealth/space-bunny-alpha", "openai/gpt-4o-mini"]);
  assert.deepEqual(extras[0], { effort: "medium" });
  assert.equal(extras[1], null);
});

test("a server key does not configure Puter", () => {
  const router = createSeedFeastRouter({
    apiKey: "sk-test",
    platform: "server",
    fetchImpl: async () => sse("ok"),
  });
  assert.equal(router.route("space-bunny").id, "space-bunny");
  assert.throws(
    () => router.route("puter"),
    (error) => error instanceof AiBufferError && error.code === "provider_error",
  );
});

test("the server stays quiet without a key", async () => {
  assert.equal(createSeedFeastRouter({ platform: "server" }), null);
  await assert.rejects(
    () => askFeast({ seeds: "beans", platform: "server" }),
    (error) => error instanceof Error && /no OpenRouter key/.test(error.message),
  );
});

test("chat, listing help, and coordination use the same connection without a recipe", async () => {
  for (const purpose of ["chat", "listing", "coordinate"]) {
    const prompt = purposePrompt(purpose);
    assert.equal(prompt.includes("feast recipe"), false);
    let system = "";
    const result = await askConnection({
      purpose,
      message: "Keep the chufa line moving between growers.",
      apiKey: "sk-test",
      platform: "server",
      timeoutMs: 1000,
      fetchImpl: async (_input, init) => {
        const payload = JSON.parse(String(init?.body));
        system = payload.messages?.[0]?.content || "";
        return sse("Members can gift the tubers.");
      },
    });
    assert.equal(result.purpose, purpose);
    assert.equal(result.reply, "Members can gift the tubers.");
    assert.equal(result.connection, "space-bunny");
    assert.equal(system, prompt);
    assert.equal(system.includes("feast recipe"), false);
  }
});

test("an empty cooperative question does not call a model", async () => {
  let called = false;
  await assert.rejects(
    () =>
      askConnection({
        purpose: "chat",
        message: "   ",
        apiKey: "sk-test",
        platform: "server",
        fetchImpl: async () => {
          called = true;
          return sse("no");
        },
      }),
    (error) => error instanceof Error && /what you need/.test(error.message),
  );
  assert.equal(called, false);
});

test("empty seeds do not call a model", async () => {
  let called = false;
  await assert.rejects(
    () =>
      askFeast({
        seeds: "   ",
        apiKey: "sk-test",
        platform: "server",
        fetchImpl: async () => {
          called = true;
          return sse("no");
        },
      }),
    (error) => error instanceof Error && /seeds or ingredients/.test(error.message),
  );
  assert.equal(called, false);
});
