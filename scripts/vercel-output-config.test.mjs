import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createDeploymentRoutes, createFunctionConfig, dispatchRequest } from './vercel-output-config.mjs';

const staticFiles = new Set(['/index.html', '/assets/app.js', '/_root.data', '/seedfeast-logo.jpg']);

function dispatch(pathname) {
  return dispatchRequest({
    pathname,
    routes: createDeploymentRoutes(),
    fileExists: (filePath) => staticFiles.has(filePath),
  });
}

test('the Node runtime is told to call a Web Request handler', () => {
  const config = createFunctionConfig();
  assert.equal(config.useWebApi, true);
  assert.equal(config.launcherType, 'Nodejs');
  assert.equal(config.handler, 'index.mjs');
  const handler = readFileSync(new URL('../server/vercel-handler.mjs', import.meta.url), 'utf8');
  assert.match(handler, /export default async function handler\(request, response\)/);
  assert.doesNotMatch(handler, /export default\s*\{/);
});

test('homepage is the prerendered document, not the server function', async () => {
  assert.deepEqual(await dispatch('/'), { kind: 'static', pathname: '/index.html' });
});

test('lazy route discovery is a server request, not index.html', async () => {
  assert.deepEqual(await dispatch('/__manifest'), { kind: 'function', pathname: '/__manifest' });
});

test('single-fetch data and catalog API stay on the server', async () => {
  assert.deepEqual(await dispatch('/search.data'), { kind: 'function', pathname: '/search.data' });
  assert.deepEqual(await dispatch('/api/seeds/listings'), {
    kind: 'function',
    pathname: '/api/seeds/listings',
  });
});

test('hashed assets and public files stay on the CDN', async () => {
  assert.deepEqual(await dispatch('/assets/app.js'), { kind: 'static', pathname: '/assets/app.js' });
  assert.deepEqual(await dispatch('/seedfeast-logo.jpg'), {
    kind: 'static',
    pathname: '/seedfeast-logo.jpg',
  });
});

test('prerendered root data is static and other documents hit the server', async () => {
  assert.deepEqual(await dispatch('/_root.data'), { kind: 'static', pathname: '/_root.data' });
  assert.deepEqual(await dispatch('/search'), { kind: 'function', pathname: '/search' });
  assert.deepEqual(await dispatch('/seeds'), { kind: 'function', pathname: '/seeds' });
  assert.deepEqual(await dispatch('/bookmarks'), { kind: 'function', pathname: '/bookmarks' });
  assert.deepEqual(await dispatch('/profile'), { kind: 'function', pathname: '/profile' });
});
