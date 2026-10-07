const base = String(process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');

if (base && typeof globalThis.fetch === 'function' && !globalThis.__seedfeastFetchPatched) {
  const original = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input, init) => {
    if (typeof input === 'string' && (input.startsWith('/api/') || input === '/api')) {
      return original(`${base}${input}`, init);
    }
    return original(input, init);
  };
  globalThis.__seedfeastFetchPatched = true;
}
