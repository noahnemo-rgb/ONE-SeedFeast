import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createDeploymentRoutes, dispatchRequest } from './vercel-output-config.mjs';

const root = process.cwd();
const staticDir = path.join(root, '.vercel', 'output', 'static');
const handlerPath = path.join(root, '.vercel', 'output', 'functions', 'index.func', 'index.mjs');
const routes = createDeploymentRoutes();

async function fileExists(pathname) {
  const relativePath = pathname.replace(/^\/+/, '');
  if (!relativePath || relativePath.includes('..')) return false;
  const fullPath = path.resolve(staticDir, relativePath);
  const rootPath = path.resolve(staticDir);
  if (fullPath !== rootPath && !fullPath.startsWith(`${rootPath}${path.sep}`)) return false;
  const fileStat = await stat(fullPath).catch(() => null);
  return Boolean(fileStat?.isFile());
}

async function dispatch(pathname) {
  return dispatchRequest({
    pathname,
    routes,
    fileExists,
  });
}

const home = await dispatch('/');
if (home.kind !== 'static' || home.pathname !== '/index.html') {
  throw new Error(`Expected prerendered / to be static index.html, got ${JSON.stringify(home)}`);
}

const manifestRoute = await dispatch('/__manifest');
if (manifestRoute.kind !== 'function' || manifestRoute.pathname !== '/__manifest') {
  throw new Error(`Expected /__manifest to hit the server, got ${JSON.stringify(manifestRoute)}`);
}

const listingsRoute = await dispatch('/api/seeds/listings');
if (listingsRoute.kind !== 'function' || listingsRoute.pathname !== '/api/seeds/listings') {
  throw new Error(`Expected /api/seeds/listings to hit the server, got ${JSON.stringify(listingsRoute)}`);
}

const functionDir = path.dirname(handlerPath);
const functionConfig = JSON.parse(
  await readFile(path.join(functionDir, '.vc-config.json'), 'utf8'),
);
if (functionConfig.useWebApi !== true) {
  throw new Error(
    'Vercel only invokes a Web Request default export when useWebApi is true. Without it the function crashes with FUNCTION_INVOCATION_FAILED.',
  );
}
process.chdir(functionDir);
const handlerModule = await import(pathToFileURL(handlerPath).href);
const fetchHandler = handlerModule.default;
if (typeof fetchHandler !== 'function') {
  throw new Error(
    'Vercel calls the default export as a function. An object such as { fetch } is not invoked.',
  );
}

async function callServer(pathname, search = '') {
  const decision = await dispatch(pathname);
  if (decision.kind !== 'function') {
    throw new Error(`${pathname} was not routed to the server function.`);
  }
  const url = new URL(`http://127.0.0.1${decision.pathname}${search}`);
  const response = await fetchHandler(new Request(url));
  const body = await response.text();
  const contentType = response.headers.get('content-type') ?? '';
  return { response, body, contentType };
}

function assertNotHtml(label, body) {
  const trimmed = body.trimStart().slice(0, 20).toLowerCase();
  if (trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html')) {
    throw new Error(`${label} returned HTML. The SPA rewrite is still in front of the server.`);
  }
}

const homepageHtml = await readFile(path.join(staticDir, 'index.html'), 'utf8');
const versionMatch = homepageHtml.match(/"version":\s*"([^"]+)"/);
if (!versionMatch) {
  throw new Error('Prerendered index.html did not include a React Router manifest version.');
}
const manifest = await callServer(
  '/__manifest',
  `?paths=${encodeURIComponent('/search,/seeds,/bookmarks,/profile')}&version=${versionMatch[1]}`,
);
assertNotHtml('/__manifest', manifest.body);
if (manifest.response.status === 204) {
  throw new Error('/__manifest returned 204. The client calls response.json() and that becomes a SyntaxError.');
}
let manifestJson;
try {
  manifestJson = JSON.parse(manifest.body);
} catch (error) {
  throw new Error(
    `/__manifest was not JSON (${manifest.response.status} ${manifest.contentType}): ${manifest.body.slice(0, 180)}`,
    { cause: error },
  );
}
const manifestText = JSON.stringify(manifestJson);
for (const routePath of ['search', 'seeds', 'bookmarks', 'profile']) {
  if (!manifestText.includes(routePath)) {
    throw new Error(`/__manifest JSON did not include the ${routePath} route: ${manifestText.slice(0, 240)}`);
  }
}

const listings = await callServer('/api/seeds/listings');
assertNotHtml('/api/seeds/listings', listings.body);
if (listings.response.status !== 200) {
  throw new Error(`/api/seeds/listings returned ${listings.response.status}: ${listings.body.slice(0, 180)}`);
}
const listingsJson = JSON.parse(listings.body);
if (!Array.isArray(listingsJson) || listingsJson.length === 0) {
  throw new Error('/api/seeds/listings did not return a listing array.');
}

const search = await callServer('/search');
if (search.response.status !== 200 || !search.contentType.includes('text/html') || !search.body.includes('"search/page"')) {
  throw new Error(
    `/search did not render the search route (${search.response.status} ${search.contentType}): ${search.body.slice(0, 180)}`,
  );
}

const searchData = await callServer('/search.data');
assertNotHtml('/search.data', searchData.body);
if (searchData.response.status >= 500) {
  throw new Error(`/search.data returned ${searchData.response.status}: ${searchData.body.slice(0, 180)}`);
}

console.log(
  `Vercel routing ok: /__manifest JSON, /api/seeds/listings ${listingsJson.length} rows, /search SSR.`,
);
