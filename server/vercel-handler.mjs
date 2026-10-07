// react-router-hono-server 2.21.0 calls listen() whenever this bundle is imported
// in production. The Vercel copy of that bundle skips listen() when this is set
// (see scripts/assemble-vercel-output.mjs) so the function only answers fetch().
// The env var is set inside the loader, not at module top level, so a failed
// import can still be reported as a response.

let appPromise;

function loadApp() {
  if (!appPromise) {
    process.env.SEEDFEAST_VERCEL_FETCH = '1';
    appPromise = import('./build/server/index.js').then((mod) => {
      const app = mod.default;
      if (!app || typeof app.fetch !== 'function') {
        throw new Error('SeedFeast server build did not export a Hono app.');
      }
      return app;
    });
  }
  return appPromise;
}

function errorText(error) {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  return `seedfeast-handler-error\n${message}`;
}

function sendNodeError(response, error) {
  if (!response || typeof response.writeHead !== 'function' || response.headersSent) return false;
  response.statusCode = 500;
  response.setHeader('content-type', 'text/plain; charset=utf-8');
  response.end(errorText(error));
  return true;
}

// Vercel calls this with a Web Request when useWebApi is set, and with
// Node's (req, res) otherwise. Either path must answer; an uncaught throw
// becomes FUNCTION_INVOCATION_FAILED.
export default async function handler(request, response) {
  try {
    const app = await loadApp();
    if (typeof Request !== 'undefined' && request instanceof Request) {
      return app.fetch(request);
    }
    const { getRequestListener } = await import('@hono/node-server');
    return getRequestListener((webRequest) => app.fetch(webRequest))(request, response);
  } catch (error) {
    if (sendNodeError(response, error)) return;
    return new Response(errorText(error), {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
}
