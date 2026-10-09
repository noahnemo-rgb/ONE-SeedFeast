import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { dropLegacyOpenRouterKey, LEGACY_OPENROUTER_KEY, rememberOpenRouterKey } from "../src/cook/browser-ai.js";

const files = ["src/app/assist/page.jsx", "src/app/feast/page.jsx", "feast/page.html", "src/cook/browser-ai.js"];

test("the openrouter key is not written to sessionStorage", async () => {
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.equal(source.includes("sessionStorage.setItem"), false, file);
    assert.equal(source.includes("localStorage.setItem"), false, file);
  }
  const removed = [];
  const written = [];
  globalThis.sessionStorage = {
    removeItem(key) {
      removed.push(key);
    },
    setItem(key) {
      written.push(key);
    },
    getItem() {
      return OWNER_SENTINEL;
    },
  };
  dropLegacyOpenRouterKey();
  assert.deepEqual(removed, [LEGACY_OPENROUTER_KEY]);
  assert.deepEqual(written, []);
  const stored = await rememberOpenRouterKey("sk-typed-key", true);
  assert.equal(stored, "sk-typed-key");
  assert.deepEqual(written, []);
  delete globalThis.sessionStorage;
});

const OWNER_SENTINEL = "sk-should-not-be-restored";
