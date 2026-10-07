import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const dataDir = mkdtempSync(join(tmpdir(), 'seedfeast-persist-'));
const root = fileURL(new URL('.', import.meta.url));
const catalogHref = pathToFileURL(join(root, 'catalog.js')).href;
const dbHref = pathToFileURL(join(root, 'db.js')).href;

function fileURL(url) {
  return new URL(url).pathname;
}

function run(source) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', source], {
      cwd: join(root, '..', '..'),
      env: { ...process.env, SEEDFEAST_DATA_DIR: dataDir, DATABASE_URL: '' },
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => {
      out += chunk;
    });
    child.stderr.on('data', (chunk) => {
      err += chunk;
    });
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(err || out || `child exited ${code}`));
      else resolve(out.trim());
    });
  });
}

test('accounts, recipes, and listings survive a process restart', async () => {
  const write = await run(`
    import { Hono } from 'hono';
    import { mountCatalogApi } from ${JSON.stringify(catalogHref)};
    import { closeDb } from ${JSON.stringify(dbHref)};
    const app = new Hono();
    mountCatalogApi(app);
    const signup = await app.request('/api/account/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'persist@seedfeast.test', password: 'garden', name: 'Persist' }),
    });
    const cookie = (signup.headers.get('set-cookie') || '').match(/sf_user=[^;]+/)?.[0] || '';
    const created = await app.request('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ title: 'Restart stew', category_id: 1, ingredients: ['beans'], steps: [{ title: 'Simmer', description: 'Slowly.' }] }),
    });
    const recipe = await created.json();
    await app.request('/api/recipes/1/favorite', { method: 'POST', headers: { cookie } });
    await app.request('/api/seeds/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ title: 'Saved dill', listing_type: 'offer', exchange_type: 'trade' }),
    });
    await closeDb();
    console.log(JSON.stringify({ cookie, recipeId: recipe.recipe.id, status: created.status }));
  `);
  const written = JSON.parse(write.split('\n').at(-1));
  assert.equal(written.status, 200);

  const read = await run(`
    import { Hono } from 'hono';
    import { mountCatalogApi } from ${JSON.stringify(catalogHref)};
    import { closeDb } from ${JSON.stringify(dbHref)};
    const app = new Hono();
    mountCatalogApi(app);
    const cookie = ${JSON.stringify(written.cookie)};
    const session = await app.request('/api/account/session', { headers: { cookie } });
    const sessionBody = await session.json();
    const detail = await app.request('/api/recipes/${written.recipeId}');
    const detailBody = await detail.json();
    const favorites = await app.request('/api/recipes/favorites', { headers: { cookie } });
    const favoritesBody = await favorites.json();
    const mine = await app.request('/api/recipes/mine', { headers: { cookie } });
    const mineBody = await mine.json();
    const listings = await app.request('/api/seeds/listings/mine', { headers: { cookie } });
    const listingsBody = await listings.json();
    const signin = await app.request('/api/account/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'persist@seedfeast.test', password: 'garden' }),
    });
    await closeDb();
    console.log(JSON.stringify({
      email: sessionBody.user && sessionBody.user.email,
      title: detailBody.title,
      favorite: favoritesBody[0] && favoritesBody[0].title,
      mine: mineBody.map((item) => item.title),
      listing: listingsBody[0] && listingsBody[0].title,
      signin: signin.status,
    }));
  `);
  const body = JSON.parse(read.split('\n').at(-1));
  assert.equal(body.email, 'persist@seedfeast.test');
  assert.equal(body.title, 'Restart stew');
  assert.equal(body.favorite, 'Tomato-bed panzanella');
  assert.deepEqual(body.mine, ['Restart stew']);
  assert.equal(body.listing, 'Saved dill');
  assert.equal(body.signin, 200);
  rmSync(dataDir, { recursive: true, force: true });
});
