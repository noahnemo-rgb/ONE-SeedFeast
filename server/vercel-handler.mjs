// react-router-hono-server 2.21.0 calls listen() whenever this bundle is imported
// in production. The Vercel copy of that bundle skips listen() when this is set
// (see scripts/assemble-vercel-output.mjs) so the function only answers fetch().
process.env.SEEDFEAST_VERCEL_FETCH = '1';

const { default: app } = await import('./build/server/index.js');

if (!app || typeof app.fetch !== 'function') {
  throw new Error('SeedFeast server build did not export a Hono app.');
}

export async function fetch(request) {
  return app.fetch(request);
}

export default { fetch };
