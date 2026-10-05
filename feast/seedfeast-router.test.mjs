import assert from "node:assert/strict";
import test from "node:test";
import { AiBufferError } from "ai-buffer";
import { askFeast, createSeedFeastRouter } from "./seedfeast-router.js";

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
