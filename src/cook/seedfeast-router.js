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

export const CHAT_PROMPT = [
  "You are SeedFeast's assistant.",
  "Members are talking about the seed vault exchange: ancient, heirloom, and gourmet plants, and how to sell, trade, share, or gift them.",
  "Answer the member directly.",
  "Do not write a recipe unless they ask to cook.",
].join(" ");

export const LISTING_PROMPT = [
  "You are SeedFeast's listing assistant.",
  "Help a member describe living plant material for the exchange.",
  "Cover the display name, scientific name when they gave one, origin, quantity, and whether the line should be a sell, a trade, a share, or a gift.",
  "Write for growers passing plants on.",
  "Do not write a recipe.",
].join(" ");

export const COORDINATE_PROMPT = [
  "You are SeedFeast's community coordinator.",
  "Help members arrange a handoff: who offers, who receives, and whether the movement is a sell, a trade, a share, or a gift.",
  "Keep the plan practical for people in different places.",
  "Do not write a recipe unless they ask to cook.",
].join(" ");

export const AI_PURPOSES = ["chat", "listing", "coordinate"];

export function purposePrompt(purpose) {
  if (purpose === "cook") return SEEDFEAST_PROMPT;
  if (purpose === "listing") return LISTING_PROMPT;
  if (purpose === "coordinate") return COORDINATE_PROMPT;
  return CHAT_PROMPT;
}

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

async function callConnection({
  message,
  systemPrompt,
  apiKey,
  model,
  platform = "browser",
  fetchImpl,
  loadPuter,
  timeoutMs,
}) {
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
      /* The model id is only for the status line. */
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
  const reply = await router.streamChat({
    message,
    systemPrompt,
    timeoutMs,
  });
  return { reply, models, connection };
}

export async function askConnection({
  purpose = "chat",
  message,
  notes,
  apiKey,
  model,
  platform = "browser",
  fetchImpl,
  loadPuter,
  timeoutMs,
} = {}) {
  const text = String(message ?? "").trim();
  if (!text) throw new Error("Tell SeedFeast what you need.");
  if (purpose !== "cook" && !AI_PURPOSES.includes(purpose)) {
    throw new Error("Choose chat, listing help, or community coordination.");
  }
  const noteText = String(notes ?? "").trim();
  const full = noteText ? `${text}\n\nNotes:\n${noteText}` : text;
  const result = await callConnection({
    message: full,
    systemPrompt: purposePrompt(purpose),
    apiKey,
    model,
    platform,
    fetchImpl,
    loadPuter,
    timeoutMs,
  });
  return { ...result, purpose };
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
  const result = await callConnection({
    message: feastMessage(seeds, notes),
    systemPrompt: SEEDFEAST_PROMPT,
    apiKey,
    model,
    platform,
    fetchImpl,
    loadPuter,
    timeoutMs,
  });
  return { recipe: result.reply, models: result.models, connection: result.connection };
}
