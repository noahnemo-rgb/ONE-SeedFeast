import { askConnection, AI_PURPOSES, CONNECTION_LABELS, SEEDFEAST_SITE } from '../../cook/seedfeast-router.js';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AppFrame } from '../components/frame';

const KEY = 'seedfeast_openrouter_key';

const purposes = [
  ['chat', 'Chat'],
  ['listing', 'Listing help'],
  ['coordinate', 'Coordination'],
];

function initialPurpose(value) {
  return AI_PURPOSES.includes(value) ? value : 'chat';
}

export default function AssistScreen() {
  const [params] = useSearchParams();
  const [purpose, setPurpose] = useState(() => initialPurpose(params.get('purpose')));
  const [message, setMessage] = useState(() => params.get('message') || '');
  const [notes, setNotes] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [answer, setAnswer] = useState('');
  const [connection, setConnection] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setApiKey(sessionStorage.getItem(KEY) ?? '');
    if (!document.querySelector('script[data-puter]')) {
      const script = document.createElement('script');
      script.src = 'https://js.puter.com/v2/';
      script.async = true;
      script.dataset.puter = 'true';
      document.body.appendChild(script);
    }
  }, []);

  function rememberKey() {
    const next = apiKey.trim();
    if (next) sessionStorage.setItem(KEY, next);
    else sessionStorage.removeItem(KEY);
    return next;
  }

  async function askHere(event) {
    event.preventDefault();
    const key = rememberKey();
    setAnswer('');
    setConnection('');
    setError('');
    setBusy(true);
    try {
      const result = await askConnection({
        purpose,
        message,
        notes,
        apiKey: key,
        platform: 'browser',
        loadPuter: async () => {
          if (window.puter?.ai?.chat) return window.puter;
          throw new Error('Puter is not available in this browser.');
        },
      });
      setAnswer(result.reply);
      setConnection(result.connection || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SeedFeast could not answer that.');
    } finally {
      setBusy(false);
    }
  }

  async function askOnServer() {
    rememberKey();
    setAnswer('');
    setConnection('');
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose, message, notes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The server could not answer that.');
      setAnswer(data.reply);
      setConnection(data.connection || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SeedFeast could not answer that.');
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
        <h1 className="text-4xl">selling, trading, sharing, and gifting of lost ancient and heirloom seeds, roots, cuttings, and plants</h1>
        <p className="mt-2 leading-relaxed">
          The same ai-buffer connection ({SEEDFEAST_SITE}) answers chat, listing help, and community coordination. This door does not cook. Recipes stay on the feast page.
        </p>
        <form onSubmit={askHere}>
          <div className="mt-4 flex flex-wrap gap-2 font-sans">
            {purposes.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPurpose(value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  purpose === value ? 'bg-[#6d4c2f] text-[#fffaf3]' : 'border border-[#c9b89a] text-[#6d4c2f]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="mt-4 block font-sans text-sm" htmlFor="message">
            {purpose === 'listing' ? 'The line you want to list' : purpose === 'coordinate' ? 'The handoff to arrange' : 'Message'}
          </label>
          <textarea
            id="message"
            required
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={
              purpose === 'listing'
                ? 'Chufa tubers from a dry bed in Giza, a gift for another grower'
                : purpose === 'coordinate'
                  ? 'Trade emmer from Gaziantep for a packet of teff'
                  : 'selling, trading, sharing, and gifting of lost ancient and heirloom seeds, roots, cuttings, and plants'
            }
            className="mt-1 min-h-28 w-full rounded-md border border-[#c9b89a] bg-[#fffdf8] px-3 py-2"
          />
          <label className="mt-4 block font-sans text-sm" htmlFor="assist-notes">
            Notes
          </label>
          <textarea
            id="assist-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Places, quantities, or who is waiting"
            className="mt-1 min-h-20 w-full rounded-md border border-[#c9b89a] bg-[#fffdf8] px-3 py-2"
          />
          <label className="mt-4 block font-sans text-sm" htmlFor="assist-key">
            OpenRouter key, saved in this tab only
          </label>
          <input
            id="assist-key"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            className="mt-1 w-full rounded-md border border-[#c9b89a] bg-[#fffdf8] px-3 py-2"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="rounded-full bg-[#6d4c2f] px-4 py-2.5 font-sans text-[#fffaf3] disabled:opacity-60">
              Ask here
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={askOnServer}
              className="rounded-full border border-[#6d4c2f] px-4 py-2.5 font-sans text-[#6d4c2f] disabled:opacity-60"
            >
              Ask the server
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
        <p className="mt-6 font-sans text-sm">
          <Link to="/feast" className="text-[#6d4c2f] underline">
            Cook with what you have
          </Link>
        </p>
      </main>
    </AppFrame>
  );
}
