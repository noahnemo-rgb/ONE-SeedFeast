import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

let driver = null;
let ready = null;

function databaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  return value || '';
}

export function dataDirectory() {
  return process.env.SEEDFEAST_DATA_DIR?.trim() || join(process.cwd(), '.data', 'seedfeast');
}

async function raw(text, params = []) {
  const values = params.map((value) => (value === undefined ? null : value));
  const result = await driver.query(text, values);
  return result.rows ?? [];
}

async function connect() {
  const url = databaseUrl();
  if (url) {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: url });
    driver = {
      query: (text, params) => pool.query(text, params),
      close: () => pool.end(),
    };
    return;
  }
  if (process.env.VERCEL) {
    console.warn(
      'DATABASE_URL is unset on Vercel. The file database does not survive serverless isolates. Set DATABASE_URL to a Postgres connection string so accounts, recipes, and listings persist.',
    );
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const dir = dataDirectory();
  await mkdir(dir, { recursive: true });
  const client = new PGlite(dir);
  driver = {
    query: (text, params) => client.query(text, params),
    close: () => client.close(),
  };
}

const schema = [
  'CREATE EXTENSION IF NOT EXISTS pgcrypto',
  `CREATE TABLE IF NOT EXISTS auth_users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT,
    email TEXT UNIQUE,
    "emailVerified" TIMESTAMPTZ,
    image TEXT,
    stripe_id TEXT,
    subscription_status TEXT,
    last_check_subscription_status_at TIMESTAMPTZ
  )`,
  `CREATE TABLE IF NOT EXISTS auth_accounts (
    id SERIAL PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    type TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    access_token TEXT,
    expires_at BIGINT,
    refresh_token TEXT,
    id_token TEXT,
    scope TEXT,
    session_state TEXT,
    token_type TEXT,
    password TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS auth_sessions (
    id SERIAL PRIMARY KEY,
    "sessionToken" TEXT UNIQUE NOT NULL,
    "userId" TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    expires TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS auth_verification_token (
    identifier TEXT NOT NULL,
    token TEXT NOT NULL,
    expires TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (identifier, token)
  )`,
  `CREATE TABLE IF NOT EXISTS chefs (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    role TEXT,
    bio TEXT,
    avatar TEXT,
    followers INTEGER NOT NULL DEFAULT 0,
    following INTEGER NOT NULL DEFAULT 0,
    likes INTEGER NOT NULL DEFAULT 0,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS recipes (
    id SERIAL PRIMARY KEY,
    chef_id INTEGER NOT NULL REFERENCES chefs(id),
    title TEXT NOT NULL,
    description TEXT,
    image TEXT,
    category_id INTEGER REFERENCES categories(id),
    time TEXT,
    difficulty TEXT,
    calories TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS recipe_steps (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    text TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS recipe_comments (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES auth_users(id),
    content TEXT NOT NULL,
    parent_id INTEGER REFERENCES recipe_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS comment_likes (
    comment_id INTEGER NOT NULL REFERENCES recipe_comments(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    PRIMARY KEY (comment_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS user_favorites (
    user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, recipe_id)
  )`,
  `CREATE TABLE IF NOT EXISTS seed_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS seed_listings (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES auth_users(id),
    title TEXT NOT NULL,
    description TEXT,
    image TEXT,
    category_id INTEGER REFERENCES seed_categories(id),
    quantity TEXT,
    listing_type TEXT NOT NULL,
    exchange_type TEXT NOT NULL,
    price TEXT,
    location_city TEXT,
    location_state TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    growing_season TEXT,
    days_to_harvest TEXT,
    difficulty TEXT,
    organic BOOLEAN NOT NULL DEFAULT FALSE,
    heirloom BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS seed_reviews (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES seed_listings(id) ON DELETE CASCADE,
    reviewer_id TEXT NOT NULL REFERENCES auth_users(id),
    reviewed_user_id TEXT NOT NULL REFERENCES auth_users(id),
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS seed_messages (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES seed_listings(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL REFERENCES auth_users(id),
    receiver_id TEXT NOT NULL REFERENCES auth_users(id),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS user_saved_seeds (
    user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    listing_id INTEGER NOT NULL REFERENCES seed_listings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, listing_id)
  )`,
];

async function ensureSchema() {
  const [{ present }] = await raw(
    `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'gen_random_uuid') AS present`,
  );
  const statements = present ? schema.filter((statement) => !statement.startsWith('CREATE EXTENSION')) : schema;
  for (const statement of statements) {
    try {
      await raw(statement);
    } catch (error) {
      if (statement.startsWith('CREATE EXTENSION')) continue;
      throw error;
    }
  }
}

const img = (id, w = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

async function seedIfEmpty() {
  const [{ count }] = await raw('SELECT COUNT(*)::int AS count FROM chefs');
  if (Number(count) > 0) return;

  const categories = [
    [1, 'Vegetables', '🥕', '#10B981'],
    [2, 'Bread', '🍞', '#D97706'],
    [3, 'Herbs', '🌿', '#059669'],
    [4, 'Grains', '🌾', '#CA8A04'],
    [5, 'Preserves', '🫙', '#B45309'],
  ];
  for (const row of categories) {
    await raw('INSERT INTO categories (id, name, icon, color) VALUES ($1, $2, $3, $4)', row);
  }

  const seedCategories = [
    [1, 'Vegetables', '🥕', '#10B981'],
    [2, 'Herbs', '🌿', '#059669'],
    [3, 'Flowers', '🌸', '#DB2777'],
    [4, 'Grains', '🌾', '#CA8A04'],
  ];
  for (const row of seedCategories) {
    await raw('INSERT INTO seed_categories (id, name, icon, color) VALUES ($1, $2, $3, $4)', row);
  }

  const chefs = [
    [1, 'Mira Solano', 'mira', 'Seed-to-table cook', 'Turns the seeds and produce already on the counter into one generous supper.', img('photo-1577219491135-ce391730fb2c', 400), 12840, 312, 6402, true],
    [2, 'Jonah Park', 'jonah', 'Baker', 'Long ferments, seeded loaves, and grain you can grow or bake.', img('photo-1583394293214-28ded15ee548', 400), 4200, 180, 2104, false],
    [3, 'Amina Diallo', 'amina', 'Garden cook', 'Herb-garden sauces and bright plates from what is ready to pick.', img('photo-1556910103-1c02745aae4d', 400), 8901, 240, 5011, false],
  ];
  for (const row of chefs) {
    await raw(
      `INSERT INTO chefs (id, name, username, role, bio, avatar, followers, following, likes, is_featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      row,
    );
  }

  const growers = [
    ['grower-1', 'Lena Cho', img('photo-1438761681033-6461ffad8d80', 200)],
    ['grower-2', 'Sam Ortiz', null],
    ['grower-3', 'Priya Shah', img('photo-1544005313-94ddf0286df2', 200)],
    ['grower-4', 'Eli Brooks', null],
  ];
  for (const [id, name, image] of growers) {
    await raw('INSERT INTO auth_users (id, name, email, image) VALUES ($1, $2, $3, $4)', [
      id,
      name,
      `${id}@seedfeast.local`,
      image,
    ]);
  }

  const recipes = [
    [1, 1, 1, 'Tomato-bed panzanella', 'Torn bread, ripe tomatoes, and basil. A feast from the seeds that already came up.', img('photo-1546069901-ba9599a7e63c'), '25 min', 'Easy', '420 cal', '2026-06-02T12:00:00.000Z'],
    [2, 3, 3, 'Basil skillet beans', 'A one-pan supper of white beans, garlic, and a fistful of basil.', img('photo-1547592166-23ac45744acd'), '35 min', 'Easy', '380 cal', '2026-05-28T12:00:00.000Z'],
    [3, 1, 1, 'Heirloom tomato tart', 'A flaky tart layered with sliced heirlooms, mustard, and thyme.', img('photo-1466637574441-749b8f19452f'), '55 min', 'Medium', '510 cal', '2026-05-20T12:00:00.000Z'],
    [4, 2, 2, 'Seeded honey loaf', 'A soft pan loaf scattered with sunflower, sesame, and a thread of honey.', img('photo-1509440159596-0249088772ff'), '3 hr', 'Medium', '280 cal', '2026-05-11T12:00:00.000Z'],
    [5, 3, 3, 'Sunflower herb salad', 'Tender leaves, toasted sunflower seeds, and a lemony dressing.', img('photo-1512621776951-a57141f2eefd'), '15 min', 'Easy', '220 cal', '2026-04-30T12:00:00.000Z'],
    [6, 2, 4, 'Barley with roasted squash', 'Chewy barley, caramelized squash, and sage from the garden bed.', img('photo-1476718406336-bb5a9690ee2a'), '50 min', 'Medium', '460 cal', '2026-04-18T12:00:00.000Z'],
  ];
  for (const row of recipes) {
    await raw(
      `INSERT INTO recipes (id, chef_id, category_id, title, description, image, time, difficulty, calories, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      row,
    );
  }

  const ingredients = {
    1: ['Ripe tomatoes', 'Day-old bread', 'Basil', 'Olive oil', 'Red wine vinegar'],
    2: ['Cooked white beans', 'Garlic', 'Basil', 'Lemon', 'Chili'],
    3: ['Pie dough', 'Heirloom tomatoes', 'Dijon', 'Thyme', 'Grated cheese'],
    4: ['Bread flour', 'Sunflower seeds', 'Sesame', 'Honey', 'Yeast'],
    5: ['Salad leaves', 'Sunflower seeds', 'Lemon', 'Olive oil', 'Parsley'],
    6: ['Pearled barley', 'Winter squash', 'Sage', 'Onion', 'Stock'],
  };
  for (const [recipeId, lines] of Object.entries(ingredients)) {
    for (let index = 0; index < lines.length; index += 1) {
      await raw(
        'INSERT INTO recipe_ingredients (recipe_id, position, text) VALUES ($1, $2, $3)',
        [Number(recipeId), index, lines[index]],
      );
    }
  }

  const steps = [
    [1, 1, 1, 'Salt the tomatoes', 'Cut them into wedges and let them sit so the juices collect.'],
    [1, 2, 2, 'Toast the bread', 'Tear the loaf and toast it in olive oil until the edges go gold.'],
    [1, 3, 3, 'Toss and rest', 'Fold in basil, vinegar, and the tomato juices. Rest ten minutes.'],
    [2, 1, 4, 'Warm the beans', 'Simmer beans with garlic and a splash of the cooking liquid.'],
    [2, 2, 5, 'Finish with herbs', 'Off the heat, tear in basil and add lemon.'],
    [3, 1, 6, 'Blind bake', 'Dock the dough and bake until the base is dry.'],
    [3, 2, 7, 'Layer and roast', 'Spread mustard, shingle the tomatoes, and roast until jammy.'],
    [4, 1, 8, 'Mix and rise', 'Knead until smooth and let the dough double.'],
    [4, 2, 9, 'Seed the crust', 'Brush with honey water and press seeds into the top before baking.'],
    [5, 1, 10, 'Toast the seeds', 'Warm sunflower seeds in a dry pan until they smell nutty.'],
    [5, 2, 11, 'Dress', 'Toss leaves with lemon, oil, and the warm seeds.'],
    [6, 1, 12, 'Roast the squash', 'Cube the squash and roast until the edges brown.'],
    [6, 2, 13, 'Simmer the barley', 'Cook barley in stock, then fold in squash and sage.'],
  ];
  for (const [recipeId, stepNumber, id, title, description] of steps) {
    await raw(
      'INSERT INTO recipe_steps (id, recipe_id, step_number, title, description) VALUES ($1, $2, $3, $4, $5)',
      [id, recipeId, stepNumber, title, description],
    );
  }

  await raw(
    `INSERT INTO recipe_comments (id, recipe_id, user_id, content, parent_id, created_at)
     VALUES (1, 1, 'grower-1', $1, NULL, '2026-06-03T15:00:00.000Z')`,
    ['Made this with the brandywines from the porch pots. The juices are the dressing.'],
  );
  await raw(`INSERT INTO comment_likes (comment_id, user_id) VALUES (1, 'grower-2')`);

  const listings = [
    [1, 'grower-1', 'Brandywine tomato seeds', 'Saved from last summer’s biggest plants. Open-pollinated and happy in a warm bed.', img('photo-1592841200221-a6898f307baa'), 1, '1 packet, about 30 seeds', 'offer', 'free', null, 'Oakland', 'CA', 'Spring', '80 days', 'Medium', true, true, '2026-06-01T12:00:00.000Z'],
    [2, 'grower-2', 'Looking for Genovese basil', 'Starting a windowsill row. Happy to trade thyme or extra tomato starts.', img('photo-1618375569909-3c8616cf7733'), 2, 'A few starts', 'request', 'trade', null, 'Portland', 'OR', 'Summer', '30 days', 'Easy', true, false, '2026-05-22T12:00:00.000Z'],
    [3, 'grower-3', 'Mammoth sunflower packets', 'Tall cut flowers and seeds you can toast for the salad bowl later.', img('photo-1470509037663-253afd7f0f51'), 3, '3 packets', 'offer', 'sell', '4.00', 'Austin', 'TX', 'Late spring', '70 days', 'Easy', false, true, '2026-05-14T12:00:00.000Z'],
    [4, 'grower-4', 'Fall rye for the garden', 'A handful of rye berries to sow as a cover crop or mill for the loaf.', img('photo-1574323347407-f5e1ad6d020b'), 4, '2 cups', 'offer', 'free', null, 'Madison', 'WI', 'Fall', 'Cover crop', 'Easy', true, false, '2026-04-02T12:00:00.000Z'],
  ];
  for (const row of listings) {
    await raw(
      `INSERT INTO seed_listings (
        id, user_id, title, description, image, category_id, quantity, listing_type, exchange_type,
        price, location_city, location_state, growing_season, days_to_harvest, difficulty, organic, heirloom, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      row,
    );
  }

  await raw(
    `INSERT INTO seed_reviews (id, listing_id, reviewer_id, reviewed_user_id, rating, comment, created_at)
     VALUES (1, 1, 'grower-2', 'grower-1', 5, $1, '2026-06-04T15:00:00.000Z')`,
    ['Seeds germinated in a week. Generous packet.'],
  );

  const serialTables = [
    'categories',
    'chefs',
    'recipes',
    'recipe_steps',
    'recipe_ingredients',
    'recipe_comments',
    'seed_categories',
    'seed_listings',
    'seed_reviews',
  ];
  for (const table of serialTables) {
    await raw(
      `SELECT setval(pg_get_serial_sequence('${table}', 'id'), (SELECT MAX(id) FROM ${table}))`,
    );
  }
}

export async function ensureReady() {
  if (!ready) {
    ready = (async () => {
      await connect();
      await ensureSchema();
      await seedIfEmpty();
    })().catch((error) => {
      ready = null;
      driver = null;
      throw error;
    });
  }
  return ready;
}

export async function query(text, params = []) {
  await ensureReady();
  return raw(text, params);
}

export function queryable() {
  return {
    async query(text, params = []) {
      const rows = await query(text, params);
      return { rows, rowCount: rows.length };
    },
  };
}

export async function resetDatabase() {
  await ensureReady();
  await raw(`TRUNCATE TABLE
    comment_likes,
    recipe_comments,
    user_favorites,
    recipe_ingredients,
    recipe_steps,
    recipes,
    user_saved_seeds,
    seed_messages,
    seed_reviews,
    seed_listings,
    seed_categories,
    categories,
    chefs,
    auth_sessions,
    auth_accounts,
    auth_verification_token,
    auth_users
    RESTART IDENTITY CASCADE`);
  await seedIfEmpty();
}

export async function closeDb() {
  if (ready) {
    try {
      await ready;
    } catch {
      ready = null;
    }
  }
  if (driver) await driver.close();
  driver = null;
  ready = null;
}
