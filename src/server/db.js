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
    scientific_name TEXT,
    origin TEXT,
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
  await raw('ALTER TABLE seed_listings ADD COLUMN IF NOT EXISTS scientific_name TEXT');
  await raw('ALTER TABLE seed_listings ADD COLUMN IF NOT EXISTS origin TEXT');
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
    ['grower-5', 'Nour El-Sayed', null],
    ['grower-6', 'Helen Vogel', null],
    ['grower-7', 'Dawit Bekele', null],
    ['grower-8', 'Rosa Quispe', null],
    ['grower-9', 'Ayo Diallo', null],
    ['grower-10', 'Mateo Ibarra', null],
    ['grower-11', 'Leila Haddad', null],
    ['grower-12', 'Amara Keita', null],
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
    [1, 'grower-1', 'Brandywine tomato seeds', null, null, 'Saved from last summer’s biggest plants. Open-pollinated and happy in a warm bed.', img('photo-1592841200221-a6898f307baa'), 1, '1 packet, about 30 seeds', 'offer', 'free', null, 'Oakland', 'CA', 'Spring', '80 days', 'Medium', true, true, '2026-06-01T12:00:00.000Z'],
    [2, 'grower-2', 'Looking for Genovese basil', null, null, 'Starting a windowsill row. Happy to trade thyme or extra tomato starts.', img('photo-1618375569909-3c8616cf7733'), 2, 'A few starts', 'request', 'trade', null, 'Portland', 'OR', 'Summer', '30 days', 'Easy', true, false, '2026-05-22T12:00:00.000Z'],
    [3, 'grower-3', 'Mammoth sunflower packets', null, null, 'Tall cut flowers and seeds you can toast for the salad bowl later.', img('photo-1470509037663-253afd7f0f51'), 3, '3 packets', 'offer', 'sell', '4.00', 'Austin', 'TX', 'Late spring', '70 days', 'Easy', false, true, '2026-05-14T12:00:00.000Z'],
    [4, 'grower-4', 'Fall rye for the garden', null, null, 'A handful of rye berries to sow as a cover crop or mill for the loaf.', img('photo-1574323347407-f5e1ad6d020b'), 4, '2 cups', 'offer', 'free', null, 'Madison', 'WI', 'Fall', 'Cover crop', 'Easy', true, false, '2026-04-02T12:00:00.000Z'],
    [5, 'grower-5', 'Chufa (tiger nut)', 'Cyperus esculentus', 'Egypt — Nile drought staple, grown for tubers', 'Extra tubers from a dry-bed plot. Gifting a handful so another grower can start a chufa row.', img('photo-1518977676601-b53f82aba655'), 1, '12 tubers', 'offer', 'free', null, 'Giza', 'Egypt', 'Warm season', '110 days', 'Easy', true, true, '2026-09-28T12:00:00.000Z'],
    [6, 'grower-6', 'Emmer wheat', 'Triticum dicoccum', 'Fertile Crescent', 'A jar of hulled emmer saved for replanting. Trading it for another ancient cereal landrace.', img('photo-1500382017468-9049fed747ef'), 4, '1 cup seed grain', 'offer', 'trade', null, 'Gaziantep', 'Türkiye', 'Fall or early spring', '120 days', 'Medium', true, true, '2026-09-27T12:00:00.000Z'],
    [7, 'grower-6', 'Einkorn', 'Triticum monococcum', 'Anatolia and the Fertile Crescent', 'One of the earliest cultivated wheats. Selling a small packet of saved seed so the line keeps moving.', img('photo-1625246333195-78d9c38ad449'), 4, '1 packet', 'offer', 'sell', '6.00', 'Kastamonu', 'Türkiye', 'Fall or early spring', '130 days', 'Medium', true, true, '2026-09-26T12:00:00.000Z'],
    [8, 'grower-7', 'Teff', 'Eragrostis tef', 'Ethiopian highlands', 'Tiny highland grain, still passed hand to hand. Sharing an extra spoon of seed, no charge.', img('photo-1536304993881-ff6e9eefa2a6'), 4, '2 tablespoons of seed', 'offer', 'free', null, 'Addis Ababa', 'Ethiopia', 'Warm season', '90 days', 'Medium', true, true, '2026-09-25T12:00:00.000Z'],
    [9, 'grower-10', 'Amaranth', 'Amaranthus spp.', 'The Americas', 'Heat-loving grain kept across the Americas. Open to a trade for quinoa, maize, or another saved cereal.', img('photo-1501004318641-b39e6451bec6'), 4, '1 packet', 'offer', 'trade', null, 'Puebla', 'Mexico', 'Late spring', '90 days', 'Easy', true, true, '2026-09-24T12:00:00.000Z'],
    [10, 'grower-8', 'Quinoa', 'Chenopodium quinoa', 'Andean highlands', 'Looking for a handful of true seed to replant a highland line. Will trade amaranth or seed potatoes.', img('photo-1464226184884-fa280b87c399'), 4, 'A handful of seed', 'request', 'trade', null, 'Cusco', 'Peru', 'Cool season', '100 days', 'Medium', true, true, '2026-09-23T12:00:00.000Z'],
    [11, 'grower-12', 'Fonio', 'Digitaria exilis', 'West Africa', 'A fast grain for thin soils. Gifting a small packet from this year’s saving to anyone who will sow it.', img('photo-1560493676-04071c5f467b'), 4, '1 small packet', 'offer', 'free', null, 'Bamako', 'Mali', 'Rainy season', '70 days', 'Easy', true, true, '2026-09-22T12:00:00.000Z'],
    [12, 'grower-9', 'Sorghum', 'Sorghum bicolor', 'African savanna', 'Drought-hardy grain from a community plot. Selling a cup of open-pollinated seed for another garden.', img('photo-1530836369250-ef72a3f5cda8'), 4, '1 cup seed', 'offer', 'sell', '5.00', 'Kano', 'Nigeria', 'Warm season', '110 days', 'Easy', true, true, '2026-09-21T12:00:00.000Z'],
    [13, 'grower-9', 'Cowpea (black-eyed pea)', 'Vigna unguiculata', 'Africa', 'A heat-loving pulse saved from last season. Trading seed for chickpea or another dry-land bean.', img('photo-1523348837708-15d4a09cfac2'), 1, '40 seeds', 'offer', 'trade', null, 'Accra', 'Ghana', 'Warm season', '70 days', 'Easy', true, true, '2026-09-20T12:00:00.000Z'],
    [14, 'grower-11', 'Chickpea', 'Cicer arietinum', 'Mediterranean and South Asia', 'Extra seed from a long-kept line. Free to a grower who will replant it and pass some on.', img('photo-1416879595882-3373a0480b5b'), 1, '50 seeds', 'offer', 'free', null, 'Aleppo', 'Syria', 'Cool season', '100 days', 'Medium', true, true, '2026-09-19T12:00:00.000Z'],
    [15, 'grower-11', 'Lentil', 'Lens culinaris', 'Near East', 'A small pulse carried a long way. Selling a packet of saved seed, enough for a trial row.', img('photo-1444858291040-58f756a3bdd6'), 1, '1 packet', 'offer', 'sell', '4.50', 'Diyarbakır', 'Türkiye', 'Cool season', '90 days', 'Easy', true, true, '2026-09-18T12:00:00.000Z'],
    [16, 'grower-4', 'Flax', 'Linum usitatissimum', 'Near East and the Mediterranean', 'Requesting a spoon of linseed to restart a fiber and oilseed row. Can trade sesame or another small seed.', img('photo-1461354464878-ad92f492a5a0'), 4, 'A spoon of seed', 'request', 'trade', null, 'Madison', 'WI', 'Spring', '100 days', 'Easy', true, true, '2026-09-17T12:00:00.000Z'],
    [17, 'grower-12', 'Sesame', 'Sesamum indicum', 'Africa and South Asia', 'Leftover seed from a dry-season planting. Sharing it with anyone putting in a sesame row.', img('photo-1471193945509-9ad0617afabf'), 4, '1 packet', 'offer', 'free', null, 'Khartoum', 'Sudan', 'Warm season', '100 days', 'Medium', true, true, '2026-09-16T12:00:00.000Z'],
    [18, 'grower-3', 'Taro', 'Colocasia esculenta', 'Pacific islands and tropical Asia', 'Passed on as corms, not true seed. Gifting side corms to someone with a wet bed who will divide them.', img('photo-1592419044706-39796d40f98c'), 1, '4 side corms', 'offer', 'free', null, 'Hilo', 'HI', 'Year-round in warm ground', '200 days', 'Medium', true, true, '2026-09-15T12:00:00.000Z'],
    [19, 'grower-1', 'Sweet potato slips', 'Ipomoea batatas', 'Tropical Americas', 'A long-kept variety passed on as slips. Sharing rooted cuttings from the parent plants.', img('photo-1589927986089-35812388d1f4'), 1, '6 slips', 'offer', 'free', null, 'Kumamoto', 'Japan', 'Warm season', '100 days', 'Easy', true, true, '2026-09-14T12:00:00.000Z'],
    [20, 'grower-9', 'Cassava cuttings', 'Manihot esculenta', 'Tropical Americas', 'A tropical root kept by woody cuttings. Trading four sticks for taro corms or sweet potato slips.', img('photo-1615485290382-441e4d049cb5'), 1, '4 cuttings', 'offer', 'trade', null, 'Lagos', 'Nigeria', 'Warm wet season', '10–12 months', 'Medium', true, true, '2026-09-13T12:00:00.000Z'],
  ];
  for (const row of listings) {
    await raw(
      `INSERT INTO seed_listings (
        id, user_id, title, scientific_name, origin, description, image, category_id, quantity, listing_type, exchange_type,
        price, location_city, location_state, growing_season, days_to_harvest, difficulty, organic, heirloom, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
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
