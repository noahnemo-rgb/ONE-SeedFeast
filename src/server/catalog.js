import { createHash, randomBytes } from 'node:crypto';
import { Hono } from 'hono';

const img = (id, w = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const digest = createHash('sha256').update(`${salt}:${password}`).digest('hex');
  return `${salt}:${digest}`;
}

function checkPassword(stored, password) {
  const [salt, digest] = String(stored).split(':');
  if (!salt || !digest) return false;
  const next = createHash('sha256').update(`${salt}:${password}`).digest('hex');
  return next === digest;
}

function createSeed() {
  const categories = [
    { id: 1, name: 'Vegetables', icon: '🥕', color: '#10B981' },
    { id: 2, name: 'Bread', icon: '🍞', color: '#D97706' },
    { id: 3, name: 'Herbs', icon: '🌿', color: '#059669' },
    { id: 4, name: 'Grains', icon: '🌾', color: '#CA8A04' },
    { id: 5, name: 'Preserves', icon: '🫙', color: '#B45309' },
  ];

  const seedCategories = [
    { id: 1, name: 'Vegetables', icon: '🥕', color: '#10B981' },
    { id: 2, name: 'Herbs', icon: '🌿', color: '#059669' },
    { id: 3, name: 'Flowers', icon: '🌸', color: '#DB2777' },
    { id: 4, name: 'Grains', icon: '🌾', color: '#CA8A04' },
  ];

  const chefs = [
    {
      id: 1,
      name: 'Mira Solano',
      username: 'mira',
      role: 'Seed-to-table cook',
      bio: 'Turns the seeds and produce already on the counter into one generous supper.',
      avatar: img('photo-1577219491135-ce391730fb2c', 400),
      followers: 12840,
      following: 312,
      likes: 6402,
      is_featured: true,
    },
    {
      id: 2,
      name: 'Jonah Park',
      username: 'jonah',
      role: 'Baker',
      bio: 'Long ferments, seeded loaves, and grain you can grow or bake.',
      avatar: img('photo-1583394293214-28ded15ee548', 400),
      followers: 4200,
      following: 180,
      likes: 2104,
      is_featured: false,
    },
    {
      id: 3,
      name: 'Amina Diallo',
      username: 'amina',
      role: 'Garden cook',
      bio: 'Herb-garden sauces and bright plates from what is ready to pick.',
      avatar: img('photo-1556910103-1c02745aae4d', 400),
      followers: 8901,
      following: 240,
      likes: 5011,
      is_featured: false,
    },
  ];

  const recipes = [
    {
      id: 1,
      chef_id: 1,
      category_id: 1,
      title: 'Tomato-bed panzanella',
      description:
        'Torn bread, ripe tomatoes, and basil. A feast from the seeds that already came up.',
      image: img('photo-1546069901-ba9599a7e63c'),
      time: '25 min',
      difficulty: 'Easy',
      calories: '420 cal',
      created_at: '2026-06-02T12:00:00.000Z',
      ingredients: ['Ripe tomatoes', 'Day-old bread', 'Basil', 'Olive oil', 'Red wine vinegar'],
      steps: [
        { id: 1, title: 'Salt the tomatoes', description: 'Cut them into wedges and let them sit so the juices collect.' },
        { id: 2, title: 'Toast the bread', description: 'Tear the loaf and toast it in olive oil until the edges go gold.' },
        { id: 3, title: 'Toss and rest', description: 'Fold in basil, vinegar, and the tomato juices. Rest ten minutes.' },
      ],
    },
    {
      id: 2,
      chef_id: 3,
      category_id: 3,
      title: 'Basil skillet beans',
      description: 'A one-pan supper of white beans, garlic, and a fistful of basil.',
      image: img('photo-1547592166-23ac45744acd'),
      time: '35 min',
      difficulty: 'Easy',
      calories: '380 cal',
      created_at: '2026-05-28T12:00:00.000Z',
      ingredients: ['Cooked white beans', 'Garlic', 'Basil', 'Lemon', 'Chili'],
      steps: [
        { id: 2, title: 'Warm the beans', description: 'Simmer beans with garlic and a splash of the cooking liquid.' },
        { id: 3, title: 'Finish with herbs', description: 'Off the heat, tear in basil and add lemon.' },
      ],
    },
    {
      id: 3,
      chef_id: 1,
      category_id: 1,
      title: 'Heirloom tomato tart',
      description: 'A flaky tart layered with sliced heirlooms, mustard, and thyme.',
      image: img('photo-1466637574441-749b8f19452f'),
      time: '55 min',
      difficulty: 'Medium',
      calories: '510 cal',
      created_at: '2026-05-20T12:00:00.000Z',
      ingredients: ['Pie dough', 'Heirloom tomatoes', 'Dijon', 'Thyme', 'Grated cheese'],
      steps: [
        { id: 4, title: 'Blind bake', description: 'Dock the dough and bake until the base is dry.' },
        { id: 5, title: 'Layer and roast', description: 'Spread mustard, shingle the tomatoes, and roast until jammy.' },
      ],
    },
    {
      id: 4,
      chef_id: 2,
      category_id: 2,
      title: 'Seeded honey loaf',
      description: 'A soft pan loaf scattered with sunflower, sesame, and a thread of honey.',
      image: img('photo-1509440159596-0249088772ff'),
      time: '3 hr',
      difficulty: 'Medium',
      calories: '280 cal',
      created_at: '2026-05-11T12:00:00.000Z',
      ingredients: ['Bread flour', 'Sunflower seeds', 'Sesame', 'Honey', 'Yeast'],
      steps: [
        { id: 6, title: 'Mix and rise', description: 'Knead until smooth and let the dough double.' },
        { id: 7, title: 'Seed the crust', description: 'Brush with honey water and press seeds into the top before baking.' },
      ],
    },
    {
      id: 5,
      chef_id: 3,
      category_id: 3,
      title: 'Sunflower herb salad',
      description: 'Tender leaves, toasted sunflower seeds, and a lemony dressing.',
      image: img('photo-1512621776951-a57141f2eefd'),
      time: '15 min',
      difficulty: 'Easy',
      calories: '220 cal',
      created_at: '2026-04-30T12:00:00.000Z',
      ingredients: ['Salad leaves', 'Sunflower seeds', 'Lemon', 'Olive oil', 'Parsley'],
      steps: [
        { id: 8, title: 'Toast the seeds', description: 'Warm sunflower seeds in a dry pan until they smell nutty.' },
        { id: 9, title: 'Dress', description: 'Toss leaves with lemon, oil, and the warm seeds.' },
      ],
    },
    {
      id: 6,
      chef_id: 2,
      category_id: 4,
      title: 'Barley with roasted squash',
      description: 'Chewy barley, caramelized squash, and sage from the garden bed.',
      image: img('photo-1476718406336-bb5a9690ee2a'),
      time: '50 min',
      difficulty: 'Medium',
      calories: '460 cal',
      created_at: '2026-04-18T12:00:00.000Z',
      ingredients: ['Pearled barley', 'Winter squash', 'Sage', 'Onion', 'Stock'],
      steps: [
        { id: 10, title: 'Roast the squash', description: 'Cube the squash and roast until the edges brown.' },
        { id: 11, title: 'Simmer the barley', description: 'Cook barley in stock, then fold in squash and sage.' },
      ],
    },
  ];

  const growers = [
    { id: 'grower-1', name: 'Lena Cho', image: img('photo-1438761681033-6461ffad8d80', 200) },
    { id: 'grower-2', name: 'Sam Ortiz', image: null },
    { id: 'grower-3', name: 'Priya Shah', image: img('photo-1544005313-94ddf0286df2', 200) },
    { id: 'grower-4', name: 'Eli Brooks', image: null },
  ];

  const listings = [
    {
      id: 1,
      user_id: 'grower-1',
      title: 'Brandywine tomato seeds',
      description: 'Saved from last summer’s biggest plants. Open-pollinated and happy in a warm bed.',
      image: img('photo-1592841200221-a6898f307baa'),
      category_id: 1,
      quantity: '1 packet, about 30 seeds',
      listing_type: 'offer',
      exchange_type: 'free',
      price: null,
      location_city: 'Oakland',
      location_state: 'CA',
      growing_season: 'Spring',
      days_to_harvest: '80 days',
      difficulty: 'Medium',
      organic: true,
      heirloom: true,
      status: 'available',
      created_at: '2026-06-01T12:00:00.000Z',
    },
    {
      id: 2,
      user_id: 'grower-2',
      title: 'Looking for Genovese basil',
      description: 'Starting a windowsill row. Happy to trade thyme or extra tomato starts.',
      image: img('photo-1618375569909-3c8616cf7733'),
      category_id: 2,
      quantity: 'A few starts',
      listing_type: 'request',
      exchange_type: 'trade',
      price: null,
      location_city: 'Portland',
      location_state: 'OR',
      growing_season: 'Summer',
      days_to_harvest: '30 days',
      difficulty: 'Easy',
      organic: true,
      heirloom: false,
      status: 'available',
      created_at: '2026-05-22T12:00:00.000Z',
    },
    {
      id: 3,
      user_id: 'grower-3',
      title: 'Mammoth sunflower packets',
      description: 'Tall cut flowers and seeds you can toast for the salad bowl later.',
      image: img('photo-1470509037663-253afd7f0f51'),
      category_id: 3,
      quantity: '3 packets',
      listing_type: 'offer',
      exchange_type: 'sell',
      price: '4.00',
      location_city: 'Austin',
      location_state: 'TX',
      growing_season: 'Late spring',
      days_to_harvest: '70 days',
      difficulty: 'Easy',
      organic: false,
      heirloom: true,
      status: 'available',
      created_at: '2026-05-14T12:00:00.000Z',
    },
    {
      id: 4,
      user_id: 'grower-4',
      title: 'Fall rye for the garden',
      description: 'A handful of rye berries to sow as a cover crop or mill for the loaf.',
      image: img('photo-1574323347407-f5e1ad6d020b'),
      category_id: 4,
      quantity: '2 cups',
      listing_type: 'offer',
      exchange_type: 'free',
      price: null,
      location_city: 'Madison',
      location_state: 'WI',
      growing_season: 'Fall',
      days_to_harvest: 'Cover crop',
      difficulty: 'Easy',
      organic: true,
      heirloom: false,
      status: 'available',
      created_at: '2026-04-02T12:00:00.000Z',
    },
  ];

  return {
    categories,
    seedCategories,
    chefs,
    recipes,
    growers,
    listings,
    users: [],
    favorites: [],
    comments: [
      {
        id: 1,
        recipe_id: 1,
        user_id: 'grower-1',
        user_name: 'Lena Cho',
        user_image: growers[0].image,
        content: 'Made this with the brandywines from the porch pots. The juices are the dressing.',
        parent_id: null,
        created_at: '2026-06-03T15:00:00.000Z',
        likes: ['grower-2'],
      },
    ],
    reviews: [
      {
        id: 1,
        listing_id: 1,
        reviewer_id: 'grower-2',
        reviewer_name: 'Sam Ortiz',
        reviewer_image: null,
        reviewed_user_id: 'grower-1',
        rating: 5,
        comment: 'Seeds germinated in a week. Generous packet.',
        created_at: '2026-06-04T15:00:00.000Z',
      },
    ],
    messages: [],
    nextRecipeId: 7,
    nextListingId: 5,
    nextCommentId: 2,
    nextReviewId: 2,
    nextStepId: 12,
    nextUserId: 1,
    nextChefId: 4,
  };
}

let state = createSeed();

export function resetCatalog() {
  state = createSeed();
}

function chefById(id) {
  return state.chefs.find((chef) => chef.id === Number(id)) || null;
}

function recipeSummary(recipe, userId) {
  const chef = chefById(recipe.chef_id);
  const category = state.categories.find((item) => item.id === recipe.category_id);
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    image: recipe.image,
    time: recipe.time,
    difficulty: recipe.difficulty,
    calories: recipe.calories,
    is_favorite: userId
      ? state.favorites.some((fav) => fav.userId === userId && fav.recipeId === recipe.id)
      : false,
    chef_name: chef?.name || 'SeedFeast',
    category_name: category?.name || null,
    category_id: recipe.category_id,
  };
}

export function filterRecipes({ query = '', categoryId = null, userId = null } = {}) {
  const needle = String(query || '').trim().toLowerCase();
  return state.recipes
    .filter((recipe) => {
      if (categoryId && recipe.category_id !== Number(categoryId)) return false;
      if (!needle) return true;
      return (
        recipe.title.toLowerCase().includes(needle) ||
        recipe.description.toLowerCase().includes(needle)
      );
    })
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map((recipe) => recipeSummary(recipe, userId));
}

function growerById(id) {
  return (
    state.growers.find((grower) => grower.id === id) ||
    state.users.find((user) => user.id === id) ||
    null
  );
}

function listingView(listing) {
  const category = state.seedCategories.find((item) => item.id === listing.category_id);
  const grower = growerById(listing.user_id);
  const reviews = state.reviews.filter((review) => review.listing_id === listing.id);
  const avg =
    reviews.length === 0
      ? 0
      : reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length;
  return {
    ...listing,
    user_name: grower?.name || 'Unknown',
    user_image: grower?.image || null,
    category_name: category?.name || null,
    category_icon: category?.icon || '',
    category_color: category?.color || null,
    avg_rating: avg,
    review_count: reviews.length,
  };
}

export function filterListings({ category = null, type = null, search = '' } = {}) {
  const needle = String(search || '').trim().toLowerCase();
  return state.listings
    .filter((listing) => listing.status === 'available')
    .filter((listing) => (category ? listing.category_id === Number(category) : true))
    .filter((listing) => (type && type !== 'all' ? listing.listing_type === type : true))
    .filter((listing) => {
      if (!needle) return true;
      return (
        listing.title.toLowerCase().includes(needle) ||
        String(listing.description || '').toLowerCase().includes(needle)
      );
    })
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map(listingView);
}

function publicUser(user) {
  if (!user) return null;
  return { id: user.id, email: user.email, name: user.name, image: user.image || null };
}

function userFromCookie(c) {
  const raw = c.req.header('cookie') || '';
  const match = raw.match(/(?:^|;\s*)sf_user=([^;]+)/);
  if (!match) return null;
  let id = match[1];
  try {
    id = decodeURIComponent(id);
  } catch {
    return null;
  }
  return state.users.find((user) => user.id === id) || null;
}

function writeSession(c, userId) {
  const secure = c.req.url.startsWith('https:');
  c.header(
    'Set-Cookie',
    `sf_user=${encodeURIComponent(userId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure ? '; Secure' : ''}`,
  );
}

function clearSession(c) {
  c.header('Set-Cookie', 'sf_user=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

function requireUser(c) {
  const user = userFromCookie(c);
  if (!user) return null;
  return user;
}

function threadComments(recipeId, userId) {
  const rows = state.comments
    .filter((comment) => comment.recipe_id === Number(recipeId))
    .map((comment) => ({
      id: comment.id,
      content: comment.content,
      created_at: comment.created_at,
      parent_id: comment.parent_id,
      user_id: comment.user_id,
      user_name: comment.user_name,
      user_image: comment.user_image,
      likes_count: comment.likes.length,
      is_liked: userId ? comment.likes.includes(userId) : false,
      replies: [],
    }));
  const byId = new Map(rows.map((row) => [row.id, row]));
  const roots = [];
  for (const row of rows) {
    if (row.parent_id && byId.has(row.parent_id)) byId.get(row.parent_id).replies.push(row);
    else roots.push(row);
  }
  return roots;
}

export function mountCatalogApi(app) {
  const api = new Hono();

  api.get('/account/session', (c) => c.json({ user: publicUser(userFromCookie(c)) }));

  api.post('/account/signup', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const name = String(body.name || '').trim();
    if (!email || !password) return c.json({ error: 'Email and password are required' }, 400);
    if (state.users.some((user) => user.email === email)) {
      return c.json({ error: 'EmailCreateAccount' }, 409);
    }
    const user = {
      id: `u${state.nextUserId++}`,
      email,
      name: name || email.split('@')[0],
      image: null,
      password: hashPassword(password),
    };
    state.users.push(user);
    writeSession(c, user.id);
    return c.json({ user: publicUser(user) });
  });

  api.post('/account/signin', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const user = state.users.find((item) => item.email === email);
    if (!user || !checkPassword(user.password, password)) {
      return c.json({ error: 'CredentialsSignin' }, 401);
    }
    writeSession(c, user.id);
    return c.json({ user: publicUser(user) });
  });

  api.post('/account/signout', (c) => {
    clearSession(c);
    return c.json({ ok: true });
  });

  api.get('/categories', (c) => c.json({ categories: state.categories }));

  api.get('/chefs/featured', (c) => {
    const chef = state.chefs.find((item) => item.is_featured) || state.chefs[0] || null;
    return c.json(chef);
  });

  api.get('/chefs/:id', (c) => {
    const chef = chefById(c.req.param('id'));
    if (!chef) return c.json({ error: 'Chef not found' }, 404);
    const user = userFromCookie(c);
    const recipes = state.recipes
      .filter((recipe) => recipe.chef_id === chef.id)
      .map((recipe) => recipeSummary(recipe, user?.id));
    return c.json({ ...chef, recipes });
  });

  api.get('/recipes', (c) => {
    const user = userFromCookie(c);
    return c.json(filterRecipes({ userId: user?.id }));
  });

  api.post('/recipes', async (c) => {
    const user = requireUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const body = await c.req.json().catch(() => ({}));
    if (!body.title || !body.category_id) {
      return c.json({ error: 'Title and category are required' }, 400);
    }
    const username = user.email.split('@')[0];
    let chef = state.chefs.find((item) => item.username === username);
    if (!chef) {
      chef = {
        id: state.nextChefId++,
        name: user.name || 'Chef',
        username,
        role: 'Home cook',
        bio: 'Home cook sharing delicious recipes',
        avatar: user.image,
        followers: 0,
        following: 0,
        likes: 0,
        is_featured: false,
      };
      state.chefs.push(chef);
    }
    const recipe = {
      id: state.nextRecipeId++,
      chef_id: chef.id,
      category_id: Number(body.category_id),
      title: String(body.title),
      description: body.description || '',
      image: body.image || img('photo-1546069901-ba9599a7e63c'),
      time: body.time || '30 min',
      difficulty: body.difficulty || 'Medium',
      calories: body.calories || '300 cal',
      created_at: new Date().toISOString(),
      ingredients: Array.isArray(body.ingredients) ? body.ingredients : [],
      steps: [],
    };
    if (Array.isArray(body.steps)) {
      body.steps.forEach((step, index) => {
        if (!step?.title) return;
        recipe.steps.push({
          id: state.nextStepId++,
          title: step.title,
          description: step.description || '',
          step_number: index + 1,
        });
      });
    }
    state.recipes.unshift(recipe);
    return c.json({ success: true, recipe: { id: recipe.id } });
  });

  api.get('/recipes/search', (c) => {
    const user = userFromCookie(c);
    const category = c.req.query('category');
    return c.json({
      recipes: filterRecipes({
        query: c.req.query('q') || '',
        categoryId: category ? Number(category) : null,
        userId: user?.id,
      }),
    });
  });

  api.get('/recipes/favorites', (c) => {
    const user = requireUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const recipes = state.favorites
      .filter((fav) => fav.userId === user.id)
      .map((fav) => state.recipes.find((recipe) => recipe.id === fav.recipeId))
      .filter(Boolean)
      .map((recipe) => recipeSummary(recipe, user.id));
    return c.json(recipes);
  });

  api.get('/recipes/mine', (c) => {
    const user = requireUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const username = user.email.split('@')[0];
    const chef = state.chefs.find((item) => item.username === username);
    if (!chef) return c.json([]);
    const recipes = state.recipes
      .filter((recipe) => recipe.chef_id === chef.id)
      .map((recipe) => recipeSummary(recipe, user.id));
    return c.json(recipes);
  });

  api.get('/recipes/:id', (c) => {
    const recipe = state.recipes.find((item) => item.id === Number(c.req.param('id')));
    if (!recipe) return c.json({ error: 'Recipe not found' }, 404);
    const user = userFromCookie(c);
    const chef = chefById(recipe.chef_id);
    return c.json({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      image: recipe.image,
      time: recipe.time,
      difficulty: recipe.difficulty,
      calories: recipe.calories,
      ingredients: recipe.ingredients || [],
      is_favorited: user
        ? state.favorites.some((fav) => fav.userId === user.id && fav.recipeId === recipe.id)
        : false,
      chef: chef
        ? { id: chef.id, name: chef.name, avatar: chef.avatar, role: chef.role }
        : { id: null, name: 'SeedFeast', avatar: null, role: 'Cook' },
      steps: recipe.steps,
    });
  });

  api.post('/recipes/:id/favorite', (c) => {
    const user = requireUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const recipeId = Number(c.req.param('id'));
    if (!state.recipes.some((recipe) => recipe.id === recipeId)) {
      return c.json({ error: 'Recipe not found' }, 404);
    }
    const index = state.favorites.findIndex(
      (fav) => fav.userId === user.id && fav.recipeId === recipeId,
    );
    if (index >= 0) {
      state.favorites.splice(index, 1);
      return c.json({ favorited: false });
    }
    state.favorites.unshift({ userId: user.id, recipeId, created_at: new Date().toISOString() });
    return c.json({ favorited: true });
  });

  api.get('/recipes/:id/comments', (c) => {
    const user = userFromCookie(c);
    return c.json(threadComments(c.req.param('id'), user?.id));
  });

  api.post('/recipes/:id/comments', async (c) => {
    const user = requireUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const body = await c.req.json().catch(() => ({}));
    const content = String(body.content || '').trim();
    if (!content) return c.json({ error: 'Comment content is required' }, 400);
    const comment = {
      id: state.nextCommentId++,
      recipe_id: Number(c.req.param('id')),
      user_id: user.id,
      user_name: user.name,
      user_image: user.image,
      content,
      parent_id: body.parent_id ? Number(body.parent_id) : null,
      created_at: new Date().toISOString(),
      likes: [],
    };
    state.comments.push(comment);
    return c.json({
      id: comment.id,
      content: comment.content,
      created_at: comment.created_at,
      parent_id: comment.parent_id,
    });
  });

  api.post('/comments/:id/like', (c) => {
    const user = requireUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const comment = state.comments.find((item) => item.id === Number(c.req.param('id')));
    if (!comment) return c.json({ error: 'Comment not found' }, 404);
    const index = comment.likes.indexOf(user.id);
    if (index >= 0) {
      comment.likes.splice(index, 1);
      return c.json({ liked: false });
    }
    comment.likes.push(user.id);
    return c.json({ liked: true });
  });

  api.get('/seeds/categories', (c) => c.json(state.seedCategories));

  api.get('/seeds/listings', (c) => {
    return c.json(
      filterListings({
        category: c.req.query('category'),
        type: c.req.query('type'),
        search: c.req.query('search'),
      }),
    );
  });

  api.post('/seeds/listings', async (c) => {
    const user = requireUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const body = await c.req.json().catch(() => ({}));
    if (!body.title || !body.listing_type || !body.exchange_type) {
      return c.json({ error: 'Title, listing type, and exchange type are required' }, 400);
    }
    const listing = {
      id: state.nextListingId++,
      user_id: user.id,
      title: String(body.title),
      description: body.description || '',
      image: body.image || null,
      category_id: body.category_id ? Number(body.category_id) : null,
      quantity: body.quantity || '',
      listing_type: body.listing_type,
      exchange_type: body.exchange_type,
      price: body.price || null,
      location_city: body.location_city || '',
      location_state: body.location_state || '',
      growing_season: body.growing_season || '',
      days_to_harvest: body.days_to_harvest || '',
      difficulty: body.difficulty || 'Medium',
      organic: Boolean(body.organic),
      heirloom: Boolean(body.heirloom),
      status: 'available',
      created_at: new Date().toISOString(),
    };
    state.listings.unshift(listing);
    return c.json({ success: true, listing: { id: listing.id } });
  });

  api.get('/seeds/listings/:id', (c) => {
    const listing = state.listings.find((item) => item.id === Number(c.req.param('id')));
    if (!listing) return c.json({ error: 'Listing not found' }, 404);
    const reviews = state.reviews
      .filter((review) => review.listing_id === listing.id)
      .map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        reviewer_name: review.reviewer_name,
        reviewer_image: review.reviewer_image,
        created_at: review.created_at,
      }));
    return c.json({ listing: listingView(listing), reviews });
  });

  api.post('/seeds/messages', async (c) => {
    const user = requireUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const body = await c.req.json().catch(() => ({}));
    if (!body.listing_id || !body.receiver_id || !body.message) {
      return c.json({ error: 'Listing ID, receiver ID, and message are required' }, 400);
    }
    state.messages.push({
      id: state.messages.length + 1,
      listing_id: Number(body.listing_id),
      sender_id: user.id,
      receiver_id: body.receiver_id,
      message: String(body.message),
      created_at: new Date().toISOString(),
    });
    return c.json({ success: true });
  });

  api.post('/seeds/reviews', async (c) => {
    const user = requireUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const body = await c.req.json().catch(() => ({}));
    const rating = Number(body.rating);
    if (!body.listing_id || !body.reviewed_user_id || !rating) {
      return c.json({ error: 'Listing ID, reviewed user ID, and rating are required' }, 400);
    }
    if (rating < 1 || rating > 5) return c.json({ error: 'Rating must be between 1 and 5' }, 400);
    state.reviews.unshift({
      id: state.nextReviewId++,
      listing_id: Number(body.listing_id),
      reviewer_id: user.id,
      reviewer_name: user.name,
      reviewer_image: user.image,
      reviewed_user_id: body.reviewed_user_id,
      rating,
      comment: body.comment || '',
      created_at: new Date().toISOString(),
    });
    return c.json({ success: true });
  });

  app.route('/api', api);
}
