import {
  createLocalStorageStore,
  createMemoryKeyStore,
  createMemoryStore,
  createProviderSelectionStore,
} from "ai-buffer";

/** Removed on load. The raw key is never written back here. */
export const LEGACY_OPENROUTER_KEY = "seedfeast_openrouter_key";

const memoryKeys = createMemoryKeyStore("openrouter");

let selection;

export function dropLegacyOpenRouterKey() {
  try {
    sessionStorage.removeItem(LEGACY_OPENROUTER_KEY);
  } catch {
    /* A blocked sessionStorage still must not receive the key. */
  }
}

export function providerSelection() {
  if (!selection) {
    try {
      selection = createProviderSelectionStore(createLocalStorageStore());
    } catch {
      selection = createProviderSelectionStore(createMemoryStore());
    }
  }
  return selection;
}

export function readMemoryKey() {
  return memoryKeys.getKey();
}

/**
 * The typed field is the source of truth once the member edits it.
 * An untouched empty field keeps the in-memory key from earlier in this page load
 * and does not copy that key back onto the screen.
 */
export async function rememberOpenRouterKey(typed, touched) {
  const next = typeof typed === "string" ? typed.trim() : "";
  if (touched || next) {
    if (next) await memoryKeys.setKey(next);
    else await memoryKeys.clearKey();
    return next;
  }
  return (await memoryKeys.getKey()) ?? "";
}

export function byokFor(provider, key) {
  const text = typeof key === "string" ? key.trim() : "";
  if (!text) return "";
  if (!provider || provider === "openrouter" || provider === "space-bunny") return text;
  return "";
}

export async function selectionFields() {
  const chosen = await providerSelection().getSelection();
  if (!chosen || chosen.provider === "puter") return {};
  return { provider: chosen.provider, model: chosen.model };
}

export async function callServerAi(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    const fallback = path === "/api/feast" ? "The server could not cook that." : "The server could not answer that.";
    throw new Error(data.error || fallback);
  }
  return data;
}
