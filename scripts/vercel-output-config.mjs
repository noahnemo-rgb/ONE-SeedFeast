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

/**
 * Node.js function config. `useWebApi` makes Vercel set VERCEL_USE_WEB_API
 * and call the default export as `(request: Request) => Response`. Without
 * it, the runtime expects a Node `(req, res)` function and crashes when the
 * export is anything else.
 */
export function createFunctionConfig() {
  return {
    runtime: 'nodejs22.x',
    handler: 'index.mjs',
    launcherType: 'Nodejs',
    shouldAddHelpers: false,
    shouldAddSourcemapSupport: true,
    supportsResponseStreaming: true,
    useWebApi: true,
  };
}

/**
 * Vercel's Node runtime resolves package exports with its CJS hook and asks
 * for the `.js` "default" file. Node's own file tracer prefers the
 * `module-sync` `.mjs` file, so the `.js` sibling never gets copied and the
 * function dies with "Cannot find module .../dom-export.js".
 */
export function addCjsSiblings(files, exists) {
  const extra = [];
  for (const file of files) {
    if (!file.includes('node_modules/') || !file.endsWith('.mjs')) continue;
    const sibling = `${file.slice(0, -4)}.js`;
    if (files.has(sibling) || !exists(sibling)) continue;
    files.add(sibling);
    extra.push(sibling);
  }
  return extra;
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
