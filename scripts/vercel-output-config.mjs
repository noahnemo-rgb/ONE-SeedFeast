/**
 * Routing for the Vercel Build Output.
 *
 * Static files (hashed assets, the prerendered homepage, public images) are
 * served by the CDN. Everything else, including `/__manifest`, `*.data`, and
 * `/api/*`, is sent to the Hono server function. The function keeps the
 * visitor path so React Router does not see a rewritten `/index`.
 */

export function createDeploymentRoutes() {
  return [
    {
      src: '^/assets/(.*)$',
      headers: {
        'cache-control': 'public, max-age=31536000, immutable',
      },
      continue: true,
    },
    { src: '^/$', dest: '/index.html' },
    { handle: 'filesystem' },
    {
      src: '^/(.*)$',
      dest: '/index',
      transforms: [
        {
          type: 'request.path',
          op: 'set',
          args: '/$1',
        },
      ],
    },
  ];
}

export function createDeploymentConfig() {
  return {
    version: 3,
    routes: createDeploymentRoutes(),
  };
}

function applyCaptures(template, match) {
  return template.replace(/\$(\d+)/g, (_, index) => match[Number(index)] ?? '');
}

function normalizePathname(pathname) {
  if (!pathname.startsWith('/')) return `/${pathname}`;
  return pathname;
}

/**
 * Apply the deployment routes the way Vercel does: a rewrite updates the path
 * for later routes, `filesystem` serves a real file, and the catch-all selects
 * the server function while `request.path` keeps the original pathname.
 */
export async function dispatchRequest({ pathname, routes, fileExists }) {
  let path = normalizePathname(pathname);
  let observedPath = path;

  for (const route of routes) {
    if (route.handle === 'filesystem') {
      if (await fileExists(path)) return { kind: 'static', pathname: path };
      continue;
    }

    if (!route.src) continue;
    const match = new RegExp(route.src).exec(path);
    if (!match) continue;

    for (const transform of route.transforms ?? []) {
      if (transform.type === 'request.path' && transform.op === 'set') {
        observedPath = normalizePathname(applyCaptures(transform.args, match));
      }
    }

    if (route.continue) continue;

    if (route.dest === '/index' || route.dest === 'index') {
      return { kind: 'function', pathname: observedPath };
    }

    if (route.dest) {
      path = normalizePathname(applyCaptures(route.dest, match));
      observedPath = path;
    }
  }

  return { kind: 'miss', pathname: path };
}
