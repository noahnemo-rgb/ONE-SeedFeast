import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { after } from 'node:test';
import { Hono } from 'hono';
import { closeDb } from './db.js';
import { filterListings, filterRecipes, mountCatalogApi, resetCatalog } from './catalog.js';

const dataDir = mkdtempSync(join(tmpdir(), 'seedfeast-catalog-'));
process.env.SEEDFEAST_DATA_DIR = dataDir;
delete process.env.DATABASE_URL;

after(async () => {
  await closeDb();
  rmSync(dataDir, { recursive: true, force: true });
});

let gate = Promise.resolve();
function serial(name, fn) {
  test(name, async () => {
    const previous = gate;
    let release;
    gate = new Promise((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      await fn();
    } finally {
      release();
    }
  });
}

serial('recipe search matches title and category', async () => {
  await resetCatalog();
  const bread = await filterRecipes({ categoryId: 2 });
  assert.equal(bread.length, 1);
  assert.equal(bread[0].title, 'Seeded honey loaf');
  const tomato = await filterRecipes({ query: 'tomato' });
  assert.ok(tomato.length >= 2);
});

serial('seed listings filter by type and search', async () => {
  await resetCatalog();
  const requests = await filterListings({ type: 'request' });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].listing_type, 'request');
  const rye = await filterListings({ search: 'rye' });
  assert.equal(rye.length, 1);
  assert.equal(rye[0].location_city, 'Madison');
});

serial('signup, favorite, and create recipe round trip', async () => {
  await resetCatalog();
  const app = new Hono();
  mountCatalogApi(app);

  const signup = await app.request('/api/account/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'cook@seedfeast.test', password: 'garden', name: 'Cook' }),
  });
  assert.equal(signup.status, 200);
  const setCookie = signup.headers.get('set-cookie') || '';
  const cookie = setCookie.match(/sf_user=[^;]+/)?.[0] || '';
  assert.match(cookie, /sf_user=/);

  const favorite = await app.request('/api/recipes/1/favorite', {
    method: 'POST',
    headers: { cookie },
  });
  assert.equal(favorite.status, 200);
  assert.deepEqual(await favorite.json(), { favorited: true });

  const saved = await app.request('/api/recipes/favorites', { headers: { cookie } });
  const savedBody = await saved.json();
  assert.equal(savedBody[0].title, 'Tomato-bed panzanella');

  const created = await app.request('/api/recipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({
      title: 'Porch pesto',
      category_id: 3,
      ingredients: ['basil'],
      steps: [{ title: 'Blend', description: 'Basil, oil, salt.' }],
    }),
  });
  assert.equal(created.status, 200);
  const { recipe } = await created.json();
  const detail = await app.request(`/api/recipes/${recipe.id}`);
  const body = await detail.json();
  assert.equal(body.title, 'Porch pesto');
  assert.equal(body.steps[0].title, 'Blend');
  assert.equal(body.chef.name, 'Cook');

  const listing = await app.request('/api/seeds/listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({
      title: 'Window basil',
      listing_type: 'offer',
      exchange_type: 'free',
    }),
  });
  assert.equal(listing.status, 200);
  const savedSeed = await app.request('/api/seeds/saved', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ listing_id: 1 }),
  });
  assert.equal(savedSeed.status, 200);
  const savedSeeds = await app.request('/api/seeds/saved', { headers: { cookie } });
  const savedSeedsBody = await savedSeeds.json();
  assert.equal(savedSeedsBody[0].title, 'Brandywine tomato seeds');

  const checkout = await app.request('/api/stripe-checkout-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ product: 'premium' }),
  });
  assert.equal(checkout.status, 503);
});
