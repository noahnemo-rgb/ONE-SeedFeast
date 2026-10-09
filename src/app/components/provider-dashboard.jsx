import { loadDashboard } from "ai-buffer";
import { useEffect, useState } from "react";
import { dropLegacyOpenRouterKey, providerSelection, readMemoryKey } from "../../cook/browser-ai.js";

async function probeProviders() {
  const probe = {
    puterSignedIn: false,
    openrouterKey: false,
    gatewayKey: false,
    geminiKey: false,
    nvidiaKey: false,
    llmapiKey: false,
    keyHints: {},
  };
  try {
    const response = await fetch("/api/ai/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (response.ok) Object.assign(probe, await response.json());
  } catch {
    /* Rows still render from the selection store. */
  }
  const memory = await readMemoryKey();
  if (memory && memory.length >= 4) {
    const tail = memory.slice(-4);
    probe.openrouterKey = true;
    probe.keyHints = { ...(probe.keyHints || {}), openrouter: tail, "space-bunny": tail };
  }
  try {
    const signedIn = window.puter?.auth?.isSignedIn;
    if (typeof signedIn === "function") probe.puterSignedIn = Boolean(await signedIn.call(window.puter.auth));
  } catch {
    /* Puter stays not configured. */
  }
  return probe;
}

export function ProviderDashboard() {
  const [rows, setRows] = useState([]);

  async function draw() {
    dropLegacyOpenRouterKey();
    const store = providerSelection();
    setRows(await loadDashboard(store, await probeProviders()));
  }

  useEffect(() => {
    draw();
  }, []);

  async function choose(id) {
    await providerSelection().setProvider(id);
    await draw();
  }

  async function changeModel(id, value) {
    try {
      await providerSelection().setModel(id, value);
    } catch {
      /* Key-shaped model text is rejected and not shown. */
    }
    await draw();
  }

  if (!rows.length) return null;

  return (
    <ul className="mt-4 list-none p-0">
      {rows.map((row) => (
        <li
          key={row.id}
          data-active={row.activeLabel ? "true" : "false"}
          className="mt-2 flex flex-wrap items-center gap-3"
        >
          <button
            type="button"
            onClick={() => choose(row.id)}
            className="rounded-full border border-[#c9b89a] px-4 py-2 font-sans text-sm text-[#6d4c2f]"
          >
            {row.label}
          </button>
          <span className="font-sans text-sm">{row.status}</span>
          <span className="font-sans text-sm">{row.keyHint}</span>
          <span className="font-sans text-sm">{row.activeLabel}</span>
          <label className="flex items-center gap-2 font-sans text-sm">
            <span>{row.modelLabel}</span>
            <input
              value={row.model}
              autoComplete="off"
              onChange={(event) => changeModel(row.id, event.target.value)}
              className="rounded-md border border-[#c9b89a] bg-[#fffdf8] px-2 py-1"
            />
          </label>
        </li>
      ))}
    </ul>
  );
}
