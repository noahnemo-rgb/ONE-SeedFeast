import { createCallRouter } from "ai-buffer";

const SPACE_BUNNY_MODEL = "stealth/space-bunny-alpha";

export const CONNECTION_LABELS = {
  puter: "Puter",
  "space-bunny": "Space Bunny Alpha",
  openrouter: "OpenRouter",
};

export const SEEDFEAST_MODEL = "openai/gpt-4o-mini";
export const SEEDFEAST_SITE = "https://seedfeast.ai";
export const SEEDFEAST_PROMPT = [
  "You are SeedFeast.",
  "Turn the seeds and ingredients the cook already has into one practical feast recipe.",
  "Name the dish, list ingredients they have and any small pantry staples, then give clear steps.",
  "Keep the recipe cookable in a home kitchen.",
].join(" ");

export function feastMessage(seeds, notes) {
  const seedText = String(seeds ?? "").trim();
  const noteText = String(notes ?? "").trim();
  if (!seedText) {
    throw new Error("Tell SeedFeast which seeds or ingredients you have.");
  }
  return noteText
    ? `Seeds and ingredients:\n${seedText}\n\nNotes:\n${noteText}`
    : `Seeds and ingredients:\n${seedText}`;
}

function keyedClient(apiKey, model, fetchImpl, timeoutMs) {
  const key = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!key) return null;
  const shared = {
    getApiKey: () => key,
    appName: "SeedFeast",
    siteUrl: SEEDFEAST_SITE,
    timeoutMs,
    fetchImpl,
  };
  const named = typeof model === "string" && model.trim() ? model.trim() : SEEDFEAST_MODEL;
  return {
    spaceBunny: shared,
    openrouter: named === SPACE_BUNNY_MODEL ? shared : { ...shared, model: named },
  };
}

/**
 * Browser order is Puter, then Space Bunny Alpha, then the OpenRouter model.
 * A server has no Puter route. Space Bunny runs only when an OpenRouter key exists.
 */
export function createSeedFeastRouter({
  apiKey,
  model,
  platform = "browser",
  fetchImpl,
  loadPuter,
  timeoutMs,
} = {}) {
  const keyed = keyedClient(apiKey, model, fetchImpl, timeoutMs);
  const browser = platform !== "server";
  if (!browser && !keyed) return null;
  return createCallRouter({
    ...(browser ? { puter: { model: SEEDFEAST_MODEL, loadPuter, timeoutMs } } : {}),
    ...(keyed ?? {}),
    order: browser
      ? keyed
        ? ["puter", "space-bunny", "openrouter"]
        : ["puter"]
      : ["space-bunny", "openrouter"],
  });
}

export async function askFeast({
  seeds,
  notes,
  apiKey,
  model,
  platform = "browser",
  fetchImpl,
  loadPuter,
  timeoutMs,
} = {}) {
  const message = feastMessage(seeds, notes);
  const models = [];
  let connection = null;
  const wrappedFetch = async (input, init) => {
    try {
      const payload = JSON.parse(String(init?.body));
      if (typeof payload?.model === "string") {
        models.push(payload.model);
        connection = payload.model === SPACE_BUNNY_MODEL ? "space-bunny" : "openrouter";
      }
    } catch {
      /* The model id is only for the cook's status line. */
    }
    const impl = fetchImpl ?? fetch;
    return impl(input, init);
  };
  const wrappedLoadPuter = loadPuter
    ? async () => {
        const puter = await loadPuter();
        if (!puter?.ai?.chat) return puter;
        return {
          ...puter,
          ai: {
            ...puter.ai,
            chat: async (...args) => {
              connection = "puter";
              return puter.ai.chat(...args);
            },
          },
        };
      }
    : loadPuter;
  const router = createSeedFeastRouter({
    apiKey,
    model,
    platform,
    fetchImpl: wrappedFetch,
    loadPuter: wrappedLoadPuter,
    timeoutMs,
  });
  if (!router) {
    throw new Error(
      "The server has no OpenRouter key. In the browser, Puter runs first, and a key saved on this device tries Space Bunny Alpha next.",
    );
  }
  const recipe = await router.streamChat({
    message,
    systemPrompt: SEEDFEAST_PROMPT,
    timeoutMs,
  });
  return { recipe, models, connection };
}
