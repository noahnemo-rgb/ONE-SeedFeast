import { askFeast, CONNECTION_LABELS, SEEDFEAST_SITE } from '../../cook/seedfeast-router.js';
import {
  byokFor,
  callServerAi,
  dropLegacyOpenRouterKey,
  rememberOpenRouterKey,
  selectionFields,
} from '../../cook/browser-ai.js';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ProviderDashboard } from '../components/provider-dashboard';
import { AppFrame } from '../components/frame';

export default function FeastScreen() {
  const [seeds, setSeeds] = useState('');
  const [notes, setNotes] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [answer, setAnswer] = useState('');
  const [connection, setConnection] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    dropLegacyOpenRouterKey();
    if (!document.querySelector('script[data-puter]')) {
      const script = document.createElement('script');
      script.src = 'https://js.puter.com/v2/';
      script.async = true;
      script.dataset.puter = 'true';
      document.body.appendChild(script);
    }
  }, []);

  async function cookHere(event) {
    event.preventDefault();
    const key = await rememberOpenRouterKey(apiKey, keyTouched);
    setAnswer('');
    setConnection('');
    setError('');
    setBusy(true);
    try {
      const selected = await selectionFields();
      if (selected.provider) {
        const byok = byokFor(selected.provider, key);
        const data = await callServerAi('/api/feast', {
          seeds,
          notes,
          ...selected,
          ...(byok ? { byok } : {}),
        });
        setAnswer(data.recipe);
        setConnection(data.connection || '');
        return;
      }
      try {
        const result = await askFeast({
          seeds,
          notes,
          platform: 'browser',
          loadPuter: async () => {
            if (window.puter?.ai?.chat) return window.puter;
            throw new Error('Puter is not available in this browser.');
          },
        });
        setAnswer(result.recipe);
        setConnection(result.connection || '');
      } catch (err) {
        if (!key) throw err;
        const data = await callServerAi('/api/feast', { seeds, notes, byok: key });
        setAnswer(data.recipe);
        setConnection(data.connection || '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SeedFeast could not cook that.');
    } finally {
      setBusy(false);
    }
  }

  async function cookOnServer() {
    await rememberOpenRouterKey(apiKey, keyTouched);
    setAnswer('');
    setConnection('');
    setError('');
    setBusy(true);
    try {
      const selected = await selectionFields();
      const data = await callServerAi('/api/feast', { seeds, notes, ...selected });
      setAnswer(data.recipe);
      setConnection(data.connection || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SeedFeast could not cook that.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppFrame tone="cook">
      <main className="px-5 pb-16 pt-8 text-[#2b2118]" style={{ fontFamily: 'Georgia, "Iowan Old Style", serif' }}>
        <Link to="/" className="mb-4 inline-block font-sans text-sm text-[#6d4c2f]">
          ← SeedFeast home
        </Link>
        <h1 className="text-4xl">SeedFeast</h1>
        <p className="mt-2 leading-relaxed">
          From seed to gourmet feast. Cooking goes through ai-buffer, the shared connection for this site ({SEEDFEAST_SITE}). Puter in this browser runs first. A key saved here tries Space Bunny Alpha, then your OpenRouter model. The server key is the last stop and stays on the server.
        </p>
        <ProviderDashboard />
        <form onSubmit={cookHere}>
          <label className="mt-4 block font-sans text-sm" htmlFor="seeds">
            Seeds and ingredients
          </label>
          <textarea
            id="seeds"
            required
            value={seeds}
            onChange={(event) => setSeeds(event.target.value)}
            placeholder="tomato, basil, day-old bread"
            className="mt-1 min-h-28 w-full rounded-md border border-[#c9b89a] bg-[#fffdf8] px-3 py-2"
          />
          <label className="mt-4 block font-sans text-sm" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="one pan, dinner for two"
            className="mt-1 min-h-28 w-full rounded-md border border-[#c9b89a] bg-[#fffdf8] px-3 py-2"
          />
          <label className="mt-4 block font-sans text-sm" htmlFor="key">
            OpenRouter key, saved in this tab only
          </label>
          <input
            id="key"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(event) => {
              setApiKey(event.target.value);
              setKeyTouched(true);
            }}
            className="mt-1 w-full rounded-md border border-[#c9b89a] bg-[#fffdf8] px-3 py-2"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="rounded-full bg-[#6d4c2f] px-4 py-2.5 font-sans text-[#fffaf3] disabled:opacity-60">
              Cook here
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={cookOnServer}
              className="rounded-full border border-[#6d4c2f] px-4 py-2.5 font-sans text-[#6d4c2f] disabled:opacity-60"
            >
              Cook on the server
            </button>
          </div>
        </form>
        {error ? (
          <p className="mt-4 whitespace-pre-wrap text-[#8a2a1a]" role="alert">
            {error}
          </p>
        ) : null}
        {connection ? (
          <p className="mt-4 font-sans text-sm text-[#6d4c2f]">
            Connected through {CONNECTION_LABELS[connection] || connection}.
          </p>
        ) : null}
        {answer ? <pre className="mt-4 whitespace-pre-wrap font-serif">{answer}</pre> : null}
      </main>
    </AppFrame>
  );
}
