import assert from 'node:assert/strict';
import test from 'node:test';
import { Hono } from 'hono';
import { filterListings, filterRecipes, mountCatalogApi, resetCatalog } from './catalog.js';

test('recipe search matches title and category', () => {
  resetCatalog();
  const bread = filterRecipes({ categoryId: 2 });
  assert.equal(bread.length, 1);
  assert.equal(bread[0].title, 'Seeded honey loaf');
  const tomato = filterRecipes({ query: 'tomato' });
  assert.ok(tomato.length >= 2);
});

test('seed listings filter by type and search', () => {
  resetCatalog();
  const requests = filterListings({ type: 'request' });
  assert.ok(requests.some((listing) => listing.title.includes('Genovese basil')));
  assert.ok(requests.every((listing) => listing.listing_type === 'request'));
  const rye = filterListings({ search: 'rye' });
  assert.equal(rye.length, 1);
  assert.equal(rye[0].location_city, 'Madison');
});

test('ancient vault listings lead the exchange', () => {
  resetCatalog();
  const listings = filterListings();
  assert.equal(listings[0].title, 'Chufa (tiger nut)');
  assert.equal(listings[0].scientific_name, 'Cyperus esculentus');
  assert.match(listings[0].origin, /Egypt/);
  assert.equal(listings[0].exchange_type, 'free');
  const names = [
    'Chufa',
    'Emmer',
    'Einkorn',
    'Teff',
    'Amaranth',
    'Quinoa',
    'Fonio',
    'Sorghum',
    'Cowpea',
    'Chickpea',
    'Lentil',
    'Flax',
    'Sesame',
    'Taro',
    'Sweet potato',
    'Cassava',
  ];
  for (const name of names) {
    assert.ok(
      listings.some((listing) => listing.title.includes(name)),
      `missing ${name}`,
    );
  }
  const chufa = filterListings({ search: 'cyperus' });
  assert.equal(chufa.length, 1);
  assert.equal(chufa[0].listing_type, 'offer');
});

test('fund listings are cooperative pledges', () => {
  resetCatalog();
  const funds = filterListings({ exchange: 'fund' });
  assert.ok(funds.length >= 2);
  const teff = funds.find((listing) => listing.title === 'Teff');
  assert.ok(teff);
  assert.equal(teff.exchange_type, 'fund');
  assert.ok(Number(teff.funded_amount) > 0);
  assert.ok(Number(teff.funded_amount) < Number(teff.price));
  assert.equal(filterListings()[1].title, 'Teff');
});

test('signup, favorite, and create recipe round trip', async () => {
  resetCatalog();
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
});
