import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { reportErrorToRemote, sendLogsToRemote } from "../report-error-to-remote.js";
import upload from "../upload.js";

const banned = [
  "create.xyz",
  "api.anything.com",
  "anything.com",
  "@anythingai",
  "@auth/create",
  "createanything.com",
  "/_create/api/upload",
];

const files = [
  "index.ts",
  "upload.js",
  "useUpload.js",
  "fetch.ts",
  "stripe.ts",
  "analytics.ts",
  "anything-menu.ios.tsx",
  "DeviceErrorBoundary.tsx",
  "DeviceErrorBoundary.ios.tsx",
  "auth.js",
  "page.jsx",
  "useAuth.js",
  "useUser.js",
  "root.tsx",
  "AuthWebView.jsx",
  "route.js",
];

test("uploads do not call Anything", async () => {
  const calls = [];
  const previous = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return new Response("no");
  };
  try {
    const result = await upload({ url: "https://example.com/a.png" });
    assert.match(result.error, /disconnected/);
    assert.deepEqual(calls, []);
  } finally {
    globalThis.fetch = previous;
  }
});

test("errors stay on the device even when Anything log env vars are set", async () => {
  process.env.EXPO_PUBLIC_LOGS_ENDPOINT = "https://logs.example/ingest";
  process.env.EXPO_PUBLIC_PROJECT_GROUP_ID = "pg";
  process.env.EXPO_PUBLIC_CREATE_TEMP_API_KEY = "key";
  let called = false;
  const previous = globalThis.fetch;
  globalThis.fetch = async () => {
    called = true;
    return new Response("ok");
  };
  try {
    assert.deepEqual(await sendLogsToRemote([{ message: "hi" }]), { success: false });
    assert.deepEqual(await reportErrorToRemote({ error: new Error("boom") }), { success: false });
    assert.equal(called, false);
  } finally {
    globalThis.fetch = previous;
  }
});

test("SeedFeast source no longer names Anything hosts or packages", async () => {
  for (const file of files) {
    const text = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    for (const word of banned) {
      assert.equal(text.includes(word), false, `${file} still mentions ${word}`);
    }
  }
});
