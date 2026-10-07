import { randomBytes } from 'node:crypto';
import { hash, verify } from 'argon2';
import { Hono } from 'hono';
import { query, resetDatabase } from './db.js';

const fallbackImage = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

export async function resetCatalog() {
  await resetDatabase();
}

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function bool(value) {
  return value === true || value === 't' || value === 'true' || value === 1;
}

async function filterRecipes({ query: search = '', categoryId = null, userId = null, chefId = null } = {}) {
  const needle = String(search || '').trim();
  const rows = await query(
    `SELECT r.id, r.title, r.description, r.image, r.time, r.difficulty, r.calories, r.category_id,
            c.name AS category_name, ch.name AS chef_name,
            EXISTS (
              SELECT 1 FROM user_favorites f
              WHERE f.recipe_id = r.id AND f.user_id = $1
            ) AS is_favorite
     FROM recipes r
     LEFT JOIN categories c ON c.id = r.category_id
     LEFT JOIN chefs ch ON ch.id = r.chef_id
     WHERE ($2::int IS NULL OR r.category_id = $2)
       AND ($3::text IS NULL OR r.title ILIKE $3 OR r.description ILIKE $3)
       AND ($4::int IS NULL OR r.chef_id = $4)
     ORDER BY r.created_at DESC`,
    [userId, categoryId ? Number(categoryId) : null, needle ? `%${needle}%` : null, chefId ? Number(chefId) : null],
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    image: row.image,
    time: row.time,
    difficulty: row.difficulty,
    calories: row.calories,
    is_favorite: bool(row.is_favorite),
    chef_name: row.chef_name || 'SeedFeast',
    category_name: row.category_name,
    category_id: row.category_id,
  }));
}

async function filterListings({ category = null, type = null, search = '' } = {}) {
  const needle = String(search || '').trim();
  const listingType = type && type !== 'all' ? type : null;
  const rows = await query(
    `SELECT sl.*,
            u.name AS user_name,
            u.image AS user_image,
            sc.name AS category_name,
            sc.icon AS category_icon,
            sc.color AS category_color,
            COALESCE(AVG(sr.rating), 0) AS avg_rating,
            COUNT(DISTINCT sr.id) AS review_count
     FROM seed_listings sl
     LEFT JOIN auth_users u ON sl.user_id = u.id
     LEFT JOIN seed_categories sc ON sl.category_id = sc.id
     LEFT JOIN seed_reviews sr ON sl.id = sr.listing_id
     WHERE sl.status = 'available'
       AND ($1::int IS NULL OR sl.category_id = $1)
       AND ($2::text IS NULL OR sl.listing_type = $2)
       AND ($3::text IS NULL OR sl.title ILIKE $3 OR COALESCE(sl.description, '') ILIKE $3)
     GROUP BY sl.id, u.name, u.image, sc.name, sc.icon, sc.color
     ORDER BY sl.created_at DESC`,
    [category ? Number(category) : null, listingType, needle ? `%${needle}%` : null],
  );
  return rows.map(shapeListing);
}

function shapeListing(row) {
  return {
    ...row,
    organic: bool(row.organic),
    heirloom: bool(row.heirloom),
    avg_rating: num(row.avg_rating),
    review_count: num(row.review_count),
    price: row.price == null ? null : String(row.price),
  };
}

function publicUser(user) {
  if (!user) return null;
  return { id: user.id, email: user.email, name: user.name, image: user.image || null };
}

function readCookie(c) {
  const raw = c.req.header('cookie') || '';
  const match = raw.match(/(?:^|;\s*)sf_user=([^;]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

async function userFromCookie(c) {
  const token = readCookie(c);
  if (!token) return null;
  const rows = await query(
    `SELECT u.id, u.email, u.name, u.image
     FROM auth_sessions s
     JOIN auth_users u ON u.id = s."userId"
     WHERE s."sessionToken" = $1 AND s.expires > NOW()`,
    [token],
  );
  return rows[0] || null;
}

async function userFromAuthJs(c) {
  if (!process.env.AUTH_SECRET) return null;
  try {
    const { auth } = await import('../../auth.js');
    const session = await auth(c.req.raw);
    const id = session?.user?.id;
    if (!id) return null;
    const rows = await query('SELECT id, email, name, image FROM auth_users WHERE id = $1', [id]);
    return rows[0] || null;
  } catch {
    return null;
  }
}

async function currentUser(c) {
  return (await userFromCookie(c)) || (await userFromAuthJs(c));
}

function writeSession(c, token) {
  const secure = c.req.url.startsWith('https:');
  c.header(
    'Set-Cookie',
    `sf_user=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure ? '; Secure' : ''}`,
  );
}

async function startSession(c, userId) {
  const token = randomBytes(32).toString('hex');
  await query(
    `INSERT INTO auth_sessions ("userId", "sessionToken", expires) VALUES ($1, $2, $3)`,
    [userId, token, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)],
  );
  writeSession(c, token);
  return token;
}

function clearSession(c) {
  c.header('Set-Cookie', 'sf_user=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

async function threadComments(recipeId, userId) {
  const rows = await query(
    `SELECT c.id, c.content, c.created_at, c.parent_id, c.user_id,
            u.name AS user_name, u.image AS user_image,
            (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) AS likes_count,
            EXISTS (
              SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = $2
            ) AS is_liked
     FROM recipe_comments c
     JOIN auth_users u ON u.id = c.user_id
     WHERE c.recipe_id = $1
     ORDER BY c.created_at ASC`,
    [Number(recipeId), userId],
  );
  const mapped = rows.map((row) => ({
    id: row.id,
    content: row.content,
    created_at: row.created_at,
    parent_id: row.parent_id,
    user_id: row.user_id,
    user_name: row.user_name,
    user_image: row.user_image,
    likes_count: num(row.likes_count),
    is_liked: bool(row.is_liked),
    replies: [],
  }));
  const byId = new Map(mapped.map((row) => [row.id, row]));
  const roots = [];
  for (const row of mapped) {
    if (row.parent_id && byId.has(row.parent_id)) byId.get(row.parent_id).replies.push(row);
    else roots.push(row);
  }
  return roots;
}

async function loadListing(id) {
  const rows = await query(
    `SELECT sl.*,
            u.name AS user_name,
            u.email AS user_email,
            u.image AS user_image,
            sc.name AS category_name,
            sc.icon AS category_icon,
            sc.color AS category_color,
            COALESCE(AVG(sr.rating), 0) AS avg_rating,
            COUNT(DISTINCT sr.id) AS review_count
     FROM seed_listings sl
     LEFT JOIN auth_users u ON sl.user_id = u.id
     LEFT JOIN seed_categories sc ON sl.category_id = sc.id
     LEFT JOIN seed_reviews sr ON sl.id = sr.listing_id
     WHERE sl.id = $1
     GROUP BY sl.id, u.name, u.email, u.image, sc.name, sc.icon, sc.color`,
    [Number(id)],
  );
  return rows[0] ? shapeListing(rows[0]) : null;
}

function priceData(product) {
  if (product === 'pro') {
    return {
      currency: 'usd',
      product_data: { name: 'Pro Gardener Plan' },
      recurring: { interval: 'month' },
      unit_amount: 1999,
    };
  }
  return {
    currency: 'usd',
    product_data: { name: 'Premium Gardener Plan' },
    recurring: { interval: 'month' },
    unit_amount: 999,
  };
}

export function mountCatalogApi(app) {
  const api = new Hono();

  api.get('/account/session', async (c) => c.json({ user: publicUser(await currentUser(c)) }));

  api.post('/account/signup', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const name = String(body.name || '').trim();
    if (!email || !password) return c.json({ error: 'Email and password are required' }, 400);
    const existing = await query('SELECT id FROM auth_users WHERE email = $1', [email]);
    if (existing.length) return c.json({ error: 'EmailCreateAccount' }, 409);
    const userId = crypto.randomUUID();
    const passwordHash = await hash(password);
    await query('INSERT INTO auth_users (id, name, email) VALUES ($1, $2, $3)', [
      userId,
      name || email.split('@')[0],
      email,
    ]);
    await query(
      `INSERT INTO auth_accounts ("userId", provider, type, "providerAccountId", password)
       VALUES ($1, 'credentials', 'credentials', $1, $2)`,
      [userId, passwordHash],
    );
    await startSession(c, userId);
    const [user] = await query('SELECT id, email, name, image FROM auth_users WHERE id = $1', [userId]);
    return c.json({ user: publicUser(user) });
  });

  api.post('/account/signin', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const [user] = await query('SELECT id, email, name, image FROM auth_users WHERE email = $1', [email]);
    if (!user) return c.json({ error: 'CredentialsSignin' }, 401);
    const [account] = await query(
      `SELECT password FROM auth_accounts WHERE "userId" = $1 AND provider = 'credentials'`,
      [user.id],
    );
    if (!account?.password) return c.json({ error: 'CredentialsSignin' }, 401);
    const valid = await verify(account.password, password).catch(() => false);
    if (!valid) return c.json({ error: 'CredentialsSignin' }, 401);
    await startSession(c, user.id);
    return c.json({ user: publicUser(user) });
  });

  api.post('/account/signout', async (c) => {
    const token = readCookie(c);
    if (token) await query('DELETE FROM auth_sessions WHERE "sessionToken" = $1', [token]);
    clearSession(c);
    return c.json({ ok: true });
  });

  api.get('/categories', async (c) => {
    const categories = await query('SELECT id, name, icon, color FROM categories ORDER BY id');
    return c.json({ categories });
  });

  api.get('/chefs/featured', async (c) => {
    const [chef] = await query(
      'SELECT * FROM chefs WHERE is_featured = TRUE ORDER BY id LIMIT 1',
    );
    if (chef) return c.json(chef);
    const [fallback] = await query('SELECT * FROM chefs ORDER BY id LIMIT 1');
    return c.json(fallback || null);
  });

  api.get('/chefs/:id', async (c) => {
    const [chef] = await query('SELECT * FROM chefs WHERE id = $1', [Number(c.req.param('id'))]);
    if (!chef) return c.json({ error: 'Chef not found' }, 404);
    const user = await currentUser(c);
    const recipes = await filterRecipes({ userId: user?.id, chefId: chef.id });
    return c.json({ ...chef, recipes });
  });

  api.get('/recipes', async (c) => {
    const user = await currentUser(c);
    return c.json(await filterRecipes({ userId: user?.id }));
  });

  api.post('/recipes', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const body = await c.req.json().catch(() => ({}));
    if (!body.title || !body.category_id) {
      return c.json({ error: 'Title and category are required' }, 400);
    }
    const username = user.email.split('@')[0];
    let [chef] = await query('SELECT * FROM chefs WHERE username = $1', [username]);
    if (!chef) {
      [chef] = await query(
        `INSERT INTO chefs (name, username, role, bio, avatar)
         VALUES ($1, $2, 'Home cook', 'Home cook sharing delicious recipes', $3)
         RETURNING *`,
        [user.name || 'Chef', username, user.image],
      );
    }
    const [recipe] = await query(
      `INSERT INTO recipes (chef_id, category_id, title, description, image, time, difficulty, calories)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        chef.id,
        Number(body.category_id),
        String(body.title),
        body.description || '',
        body.image || fallbackImage('photo-1546069901-ba9599a7e63c'),
        body.time || '30 min',
        body.difficulty || 'Medium',
        body.calories || '300 cal',
      ],
    );
    if (Array.isArray(body.ingredients)) {
      for (let index = 0; index < body.ingredients.length; index += 1) {
        const line = body.ingredients[index];
        if (!line) continue;
        await query(
          'INSERT INTO recipe_ingredients (recipe_id, position, text) VALUES ($1, $2, $3)',
          [recipe.id, index, String(line)],
        );
      }
    }
    if (Array.isArray(body.steps)) {
      let stepNumber = 0;
      for (const step of body.steps) {
        if (!step?.title) continue;
        stepNumber += 1;
        await query(
          `INSERT INTO recipe_steps (recipe_id, step_number, title, description)
           VALUES ($1, $2, $3, $4)`,
          [recipe.id, stepNumber, step.title, step.description || ''],
        );
      }
    }
    return c.json({ success: true, recipe: { id: recipe.id } });
  });

  api.get('/recipes/search', async (c) => {
    const user = await currentUser(c);
    const category = c.req.query('category');
    return c.json({
      recipes: await filterRecipes({
        query: c.req.query('q') || '',
        categoryId: category ? Number(category) : null,
        userId: user?.id,
      }),
    });
  });

  api.get('/recipes/favorites', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const rows = await query(
      `SELECT r.id FROM user_favorites f
       JOIN recipes r ON r.id = f.recipe_id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [user.id],
    );
    const recipes = await filterRecipes({ userId: user.id });
    const wanted = new Set(rows.map((row) => row.id));
    return c.json(recipes.filter((recipe) => wanted.has(recipe.id)));
  });

  api.get('/recipes/mine', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const username = user.email.split('@')[0];
    const [chef] = await query('SELECT id FROM chefs WHERE username = $1', [username]);
    if (!chef) return c.json([]);
    return c.json(await filterRecipes({ userId: user.id, chefId: chef.id }));
  });

  api.get('/recipes/:id', async (c) => {
    const [recipe] = await query('SELECT * FROM recipes WHERE id = $1', [Number(c.req.param('id'))]);
    if (!recipe) return c.json({ error: 'Recipe not found' }, 404);
    const user = await currentUser(c);
    const [chef] = await query('SELECT id, name, avatar, role FROM chefs WHERE id = $1', [recipe.chef_id]);
    const ingredients = await query(
      'SELECT text FROM recipe_ingredients WHERE recipe_id = $1 ORDER BY position',
      [recipe.id],
    );
    const steps = await query(
      'SELECT id, title, description, step_number FROM recipe_steps WHERE recipe_id = $1 ORDER BY step_number',
      [recipe.id],
    );
    const [favorite] = user
      ? await query(
          'SELECT 1 FROM user_favorites WHERE user_id = $1 AND recipe_id = $2',
          [user.id, recipe.id],
        )
      : [];
    return c.json({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      image: recipe.image,
      time: recipe.time,
      difficulty: recipe.difficulty,
      calories: recipe.calories,
      ingredients: ingredients.map((row) => row.text),
      is_favorited: Boolean(favorite),
      chef: chef || { id: null, name: 'SeedFeast', avatar: null, role: 'Cook' },
      steps,
    });
  });

  api.post('/recipes/:id/favorite', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const recipeId = Number(c.req.param('id'));
    const [recipe] = await query('SELECT id FROM recipes WHERE id = $1', [recipeId]);
    if (!recipe) return c.json({ error: 'Recipe not found' }, 404);
    const existing = await query(
      'SELECT 1 FROM user_favorites WHERE user_id = $1 AND recipe_id = $2',
      [user.id, recipeId],
    );
    if (existing.length) {
      await query('DELETE FROM user_favorites WHERE user_id = $1 AND recipe_id = $2', [user.id, recipeId]);
      return c.json({ favorited: false });
    }
    await query('INSERT INTO user_favorites (user_id, recipe_id) VALUES ($1, $2)', [user.id, recipeId]);
    return c.json({ favorited: true });
  });

  api.get('/recipes/:id/comments', async (c) => {
    const user = await currentUser(c);
    return c.json(await threadComments(c.req.param('id'), user?.id));
  });

  api.post('/recipes/:id/comments', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const body = await c.req.json().catch(() => ({}));
    const content = String(body.content || '').trim();
    if (!content) return c.json({ error: 'Comment content is required' }, 400);
    const [comment] = await query(
      `INSERT INTO recipe_comments (recipe_id, user_id, content, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, content, created_at, parent_id`,
      [Number(c.req.param('id')), user.id, content, body.parent_id ? Number(body.parent_id) : null],
    );
    return c.json(comment);
  });

  api.post('/comments/:id/like', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const commentId = Number(c.req.param('id'));
    const [comment] = await query('SELECT id FROM recipe_comments WHERE id = $1', [commentId]);
    if (!comment) return c.json({ error: 'Comment not found' }, 404);
    const existing = await query(
      'SELECT 1 FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
      [commentId, user.id],
    );
    if (existing.length) {
      await query('DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2', [commentId, user.id]);
      return c.json({ liked: false });
    }
    await query('INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2)', [commentId, user.id]);
    return c.json({ liked: true });
  });

  api.get('/seeds/categories', async (c) => {
    return c.json(await query('SELECT id, name, icon, color FROM seed_categories ORDER BY id'));
  });

  api.get('/seeds/listings', async (c) => {
    return c.json(
      await filterListings({
        category: c.req.query('category'),
        type: c.req.query('type'),
        search: c.req.query('search'),
      }),
    );
  });

  api.post('/seeds/listings', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const body = await c.req.json().catch(() => ({}));
    if (!body.title || !body.listing_type || !body.exchange_type) {
      return c.json({ error: 'Title, listing type, and exchange type are required' }, 400);
    }
    const [listing] = await query(
      `INSERT INTO seed_listings (
        user_id, title, description, image, category_id, quantity, listing_type, exchange_type, price,
        location_city, location_state, latitude, longitude, growing_season, days_to_harvest, difficulty,
        organic, heirloom
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING id`,
      [
        user.id,
        String(body.title),
        body.description || '',
        body.image || null,
        body.category_id ? Number(body.category_id) : null,
        body.quantity || '',
        body.listing_type,
        body.exchange_type,
        body.price || null,
        body.location_city || '',
        body.location_state || '',
        body.latitude ?? null,
        body.longitude ?? null,
        body.growing_season || '',
        body.days_to_harvest || '',
        body.difficulty || 'Medium',
        Boolean(body.organic),
        Boolean(body.heirloom),
      ],
    );
    return c.json({ success: true, listing: { id: listing.id } });
  });

  api.get('/seeds/listings/mine', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const rows = await query(
      `SELECT sl.*,
              sc.name AS category_name,
              sc.icon AS category_icon,
              sc.color AS category_color,
              COALESCE(AVG(sr.rating), 0) AS avg_rating,
              COUNT(DISTINCT sr.id) AS review_count
       FROM seed_listings sl
       LEFT JOIN seed_categories sc ON sl.category_id = sc.id
       LEFT JOIN seed_reviews sr ON sl.id = sr.listing_id
       WHERE sl.user_id = $1
       GROUP BY sl.id, sc.name, sc.icon, sc.color
       ORDER BY sl.created_at DESC`,
      [user.id],
    );
    return c.json(rows.map(shapeListing));
  });

  api.get('/seeds/listings/:id', async (c) => {
    const listing = await loadListing(c.req.param('id'));
    if (!listing) return c.json({ error: 'Listing not found' }, 404);
    const reviews = await query(
      `SELECT sr.id, sr.rating, sr.comment, sr.created_at, sr.reviewer_id, sr.reviewed_user_id,
              u.name AS reviewer_name, u.image AS reviewer_image
       FROM seed_reviews sr
       LEFT JOIN auth_users u ON sr.reviewer_id = u.id
       WHERE sr.listing_id = $1
       ORDER BY sr.created_at DESC`,
      [listing.id],
    );
    return c.json({ listing, reviews });
  });

  api.patch('/seeds/listings/:id', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const id = Number(c.req.param('id'));
    const [listing] = await query('SELECT user_id FROM seed_listings WHERE id = $1', [id]);
    if (!listing) return c.json({ error: 'Listing not found' }, 404);
    if (listing.user_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
    const body = await c.req.json().catch(() => ({}));
    const allowed = [
      'title',
      'description',
      'image',
      'category_id',
      'quantity',
      'exchange_type',
      'price',
      'location_city',
      'location_state',
      'latitude',
      'longitude',
      'growing_season',
      'days_to_harvest',
      'difficulty',
      'organic',
      'heirloom',
      'status',
    ];
    const sets = [];
    const values = [];
    for (const field of allowed) {
      if (body[field] !== undefined) {
        values.push(body[field]);
        sets.push(`${field} = $${values.length}`);
      }
    }
    if (!sets.length) return c.json({ error: 'No fields to update' }, 400);
    values.push(id);
    await query(`UPDATE seed_listings SET ${sets.join(', ')} WHERE id = $${values.length}`, values);
    return c.json({ success: true });
  });

  api.get('/seeds/messages', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const listingId = c.req.query('listing_id');
    if (!listingId) return c.json({ error: 'Listing ID is required' }, 400);
    const messages = await query(
      `SELECT sm.*,
              sender.name AS sender_name,
              sender.image AS sender_image,
              receiver.name AS receiver_name,
              receiver.image AS receiver_image
       FROM seed_messages sm
       LEFT JOIN auth_users sender ON sm.sender_id = sender.id
       LEFT JOIN auth_users receiver ON sm.receiver_id = receiver.id
       WHERE sm.listing_id = $1 AND (sm.sender_id = $2 OR sm.receiver_id = $2)
       ORDER BY sm.created_at ASC`,
      [Number(listingId), user.id],
    );
    return c.json(messages);
  });

  api.post('/seeds/messages', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const body = await c.req.json().catch(() => ({}));
    if (!body.listing_id || !body.receiver_id || !body.message) {
      return c.json({ error: 'Listing ID, receiver ID, and message are required' }, 400);
    }
    await query(
      `INSERT INTO seed_messages (listing_id, sender_id, receiver_id, message)
       VALUES ($1, $2, $3, $4)`,
      [Number(body.listing_id), user.id, body.receiver_id, String(body.message)],
    );
    return c.json({ success: true });
  });

  api.post('/seeds/reviews', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const body = await c.req.json().catch(() => ({}));
    const rating = Number(body.rating);
    if (!body.listing_id || !body.reviewed_user_id || !rating) {
      return c.json({ error: 'Listing ID, reviewed user ID, and rating are required' }, 400);
    }
    if (rating < 1 || rating > 5) return c.json({ error: 'Rating must be between 1 and 5' }, 400);
    await query(
      `INSERT INTO seed_reviews (listing_id, reviewer_id, reviewed_user_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)`,
      [Number(body.listing_id), user.id, body.reviewed_user_id, rating, body.comment || ''],
    );
    return c.json({ success: true });
  });

  api.get('/seeds/saved', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const rows = await query(
      `SELECT sl.*,
              u.name AS user_name,
              u.image AS user_image,
              sc.name AS category_name,
              sc.icon AS category_icon,
              sc.color AS category_color,
              COALESCE(AVG(sr.rating), 0) AS avg_rating,
              COUNT(DISTINCT sr.id) AS review_count
       FROM user_saved_seeds uss
       JOIN seed_listings sl ON uss.listing_id = sl.id
       LEFT JOIN auth_users u ON sl.user_id = u.id
       LEFT JOIN seed_categories sc ON sl.category_id = sc.id
       LEFT JOIN seed_reviews sr ON sl.id = sr.listing_id
       WHERE uss.user_id = $1
       GROUP BY sl.id, u.name, u.image, sc.name, sc.icon, sc.color, uss.created_at
       ORDER BY uss.created_at DESC`,
      [user.id],
    );
    return c.json(rows.map(shapeListing));
  });

  api.post('/seeds/saved', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const body = await c.req.json().catch(() => ({}));
    if (!body.listing_id) return c.json({ error: 'Listing ID is required' }, 400);
    await query(
      `INSERT INTO user_saved_seeds (user_id, listing_id) VALUES ($1, $2)
       ON CONFLICT (user_id, listing_id) DO NOTHING`,
      [user.id, Number(body.listing_id)],
    );
    return c.json({ success: true });
  });

  api.delete('/seeds/saved', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const listingId = c.req.query('listing_id');
    if (!listingId) return c.json({ error: 'Listing ID is required' }, 400);
    await query('DELETE FROM user_saved_seeds WHERE user_id = $1 AND listing_id = $2', [
      user.id,
      Number(listingId),
    ]);
    return c.json({ success: true });
  });

  api.post('/get-subscription-status', async (c) => {
    const user = await currentUser(c);
    if (!user?.email) {
      return c.json({ status: 'unauthenticated', message: 'User not logged in' });
    }
    const [row] = await query(
      `SELECT subscription_status, stripe_id, last_check_subscription_status_at
       FROM auth_users WHERE id = $1`,
      [user.id],
    );
    if (!row) return c.json({ status: 'not_found', message: 'User not found' });
    let { subscription_status: status, stripe_id: stripeId, last_check_subscription_status_at: checkedAt } = row;
    const stale =
      !checkedAt || new Date(checkedAt).getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000;
    if (process.env.STRIPE_SECRET_KEY && stripeId && (!status || stale)) {
      try {
        const { default: Stripe } = await import('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const customer = await stripe.customers.retrieve(stripeId, { expand: ['subscriptions'] });
        const next = customer?.subscriptions?.data?.[0]?.status;
        if (next) {
          await query(
            `UPDATE auth_users
             SET subscription_status = $1, last_check_subscription_status_at = NOW()
             WHERE id = $2`,
            [next, user.id],
          );
          status = next;
        }
      } catch (error) {
        console.error('Error fetching from Stripe:', error);
      }
    }
    return c.json({ status: status || 'none', stripeId });
  });

  api.post('/stripe-checkout-link', async (c) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      return c.json(
        {
          error:
            'STRIPE_SECRET_KEY is not set. Checkout stays off until that secret is configured on the server.',
        },
        503,
      );
    }
    const user = await currentUser(c);
    if (!user?.email) return c.json({ error: 'Unauthorized' }, 401);
    const body = await c.req.json().catch(() => ({}));
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    let stripeCustomerId = (
      await query('SELECT stripe_id FROM auth_users WHERE id = $1', [user.id])
    )[0]?.stripe_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ email: user.email });
      stripeCustomerId = customer.id;
      await query('UPDATE auth_users SET stripe_id = $1 WHERE id = $2', [stripeCustomerId, user.id]);
    }
    const redirectURL = typeof body.redirectURL === 'string' ? body.redirectURL : c.req.url;
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [{ price_data: priceData(body.product), quantity: 1 }],
      mode: 'subscription',
      success_url: `${redirectURL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: redirectURL,
    });
    return c.json({ url: checkoutSession.url });
  });

  api.post('/revenue-cat/get-subscription-status', (c) => {
    return c.json(
      {
        error:
          'RevenueCat is not configured. The export did not include store API keys or a webhook secret, so purchases cannot be verified.',
      },
      503,
    );
  });

  app.route('/api', api);
}

export { filterListings, filterRecipes };
