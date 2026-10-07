import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createDeploymentRoutes, dispatchRequest } from './vercel-output-config.mjs';

const root = process.cwd();
const staticDir = path.join(root, '.vercel', 'output', 'static');
const handlerPath = path.join(root, '.vercel', 'output', 'functions', 'index.func', 'index.mjs');
const routes = createDeploymentRoutes();
const port = Number(process.env.PORT) || 4173;

const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.woff2', 'font/woff2'],
  ['.ico', 'image/x-icon'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.map', 'application/json'],
]);

async function fileExists(pathname) {
  const relativePath = pathname.replace(/^\/+/, '');
  if (!relativePath || relativePath.includes('..')) return false;
  const fullPath = path.resolve(staticDir, relativePath);
  const rootPath = path.resolve(staticDir);
  if (fullPath !== rootPath && !fullPath.startsWith(`${rootPath}${path.sep}`)) return false;
  const fileStat = await stat(fullPath).catch(() => null);
  return Boolean(fileStat?.isFile());
}

function staticPath(pathname) {
  return path.resolve(staticDir, pathname.replace(/^\/+/, ''));
}

const handlerModule = await import(pathToFileURL(handlerPath).href);
const fetchHandler = handlerModule.default;
if (typeof fetchHandler !== 'function') {
  throw new Error('Vercel function entry must default-export a Web Request handler.');
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const decision = await dispatchRequest({
      pathname: url.pathname,
      routes,
      fileExists,
    });

    if (decision.kind === 'static') {
      const filePath = staticPath(decision.pathname);
      const type = types.get(path.extname(filePath)) ?? 'application/octet-stream';
      res.writeHead(200, { 'content-type': type });
      createReadStream(filePath).pipe(res);
      return;
    }

    if (decision.kind !== 'function') {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const functionUrl = new URL(req.url ?? '/', 'http://127.0.0.1');
    functionUrl.pathname = decision.pathname;
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length > 0 && req.method !== 'GET' && req.method !== 'HEAD' ? Buffer.concat(chunks) : undefined;
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (value == null) continue;
      headers.set(name, Array.isArray(value) ? value.join(', ') : value);
    }
    const response = await fetchHandler(
      new Request(functionUrl, {
        method: req.method,
        headers,
        body,
      }),
    );
    const responseHeaders = {};
    response.headers.forEach((value, name) => {
      responseHeaders[name] = value;
    });
    res.writeHead(response.status, responseHeaders);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Server error');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Vercel-like server at http://127.0.0.1:${port}`);
});
