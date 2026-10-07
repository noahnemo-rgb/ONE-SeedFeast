import { AsyncLocalStorage } from 'node:async_hooks';
import nodeConsole from 'node:console';
import { skipCSRFCheck } from '@auth/core';
import Credentials from '@auth/core/providers/credentials';
import { authHandler, initAuthConfig } from '@hono/auth-js';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { hash, verify } from 'argon2';
import { Hono } from 'hono';
import { contextStorage, getContext } from 'hono/context-storage';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { requestId } from 'hono/request-id';
import { createHonoServer } from 'react-router-hono-server/node';
import { serializeError } from 'serialize-error';
import ws from 'ws';
import NeonAdapter from './adapter';
import { getHTMLForErrorPage } from './get-html-for-error-page';
import { isAuthAction } from './is-auth-action';
import { askConnection, askFeast } from './feast/seedfeast-router.js';
import { API_BASENAME, api } from './route-builder';
import { mountCatalogApi } from './src/server/catalog.js';
neonConfig.webSocketConstructor = ws;

const als = new AsyncLocalStorage<{ requestId: string }>();

for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
  const original = nodeConsole[method].bind(console);

  console[method] = (...args: unknown[]) => {
    const requestId = als.getStore()?.requestId;
    if (requestId) {
      original(`[traceId:${requestId}]`, ...args);
    } else {
      original(...args);
    }
  };
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = NeonAdapter(pool);

const app = new Hono();

app.use('*', requestId());

app.use('*', (c, next) => {
  const requestId = c.get('requestId');
  return als.run({ requestId }, () => next());
});

app.use(contextStorage());

app.onError((err, c) => {
  if (c.req.method !== 'GET') {
    return c.json(
      {
        error: 'An error occurred in your app',
        details: serializeError(err),
      },
      500
    );
  }
  return c.html(getHTMLForErrorPage(err), 200);
});

if (process.env.CORS_ORIGINS) {
  app.use(
    '/*',
    cors({
      origin: process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
    })
  );
}
for (const method of ['post', 'put', 'patch'] as const) {
  app[method](
    '*',
    bodyLimit({
      maxSize: 4.5 * 1024 * 1024, // 4.5mb to match vercel limit
      onError: (c) => {
        return c.json({ error: 'Body size limit exceeded' }, 413);
      },
    })
  );
}

if (process.env.AUTH_SECRET) {
  app.use(
    '*',
    initAuthConfig((c) => ({
      secret: c.env.AUTH_SECRET,
      pages: {
        signIn: '/account/signin',
        signOut: '/account/logout',
      },
      skipCSRFCheck,
      session: {
        strategy: 'jwt',
      },
      callbacks: {
        session({ session, token }) {
          if (token.sub) {
            session.user.id = token.sub;
          }
          return session;
        },
      },
      cookies: {
        csrfToken: {
          options: {
            secure: true,
            sameSite: 'none',
          },
        },
        sessionToken: {
          options: {
            secure: true,
            sameSite: 'none',
          },
        },
        callbackUrl: {
          options: {
            secure: true,
            sameSite: 'none',
          },
        },
      },
      providers: [
        Credentials({
          id: 'credentials-signin',
          name: 'Credentials Sign in',
          credentials: {
            email: {
              label: 'Email',
              type: 'email',
            },
            password: {
              label: 'Password',
              type: 'password',
            },
          },
          authorize: async (credentials) => {
            const { email, password } = credentials;
            if (!email || !password) {
              return null;
            }
            if (typeof email !== 'string' || typeof password !== 'string') {
              return null;
            }

            // logic to verify if user exists
            const user = await adapter.getUserByEmail(email);
            if (!user) {
              return null;
            }
            const matchingAccount = user.accounts.find(
              (account) => account.provider === 'credentials'
            );
            const accountPassword = matchingAccount?.password;
            if (!accountPassword) {
              return null;
            }

            const isValid = await verify(accountPassword, password);
            if (!isValid) {
              return null;
            }

            // return user object with the their profile data
            return user;
          },
        }),
        Credentials({
          id: 'credentials-signup',
          name: 'Credentials Sign up',
          credentials: {
            email: {
              label: 'Email',
              type: 'email',
            },
            password: {
              label: 'Password',
              type: 'password',
            },
            name: { label: 'Name', type: 'text' },
            image: { label: 'Image', type: 'text', required: false },
          },
          authorize: async (credentials) => {
            const { email, password, name, image } = credentials;
            if (!email || !password) {
              return null;
            }
            if (typeof email !== 'string' || typeof password !== 'string') {
              return null;
            }

            // logic to verify if user exists
            const user = await adapter.getUserByEmail(email);
            if (!user) {
              const newUser = await adapter.createUser({
                emailVerified: null,
                email,
                name: typeof name === 'string' && name.length > 0 ? name : undefined,
                image: typeof image === 'string' && image.length > 0 ? image : undefined,
              });
              await adapter.linkAccount({
                extraData: {
                  password: await hash(password),
                },
                type: 'credentials',
                userId: newUser.id,
                providerAccountId: newUser.id,
                provider: 'credentials',
              });
              return newUser;
            }
            return null;
          },
        }),
      ],
    }))
  );
}
const seedFeastRoot = fileURLToPath(new URL('.', import.meta.url));

app.get('/vendor/ai-buffer/:file', async (c) => {
  const file = c.req.param('file');
  if (!/^[A-Za-z0-9._-]+\.js$/.test(file)) return c.notFound();
  try {
    const source = await readFile(join(seedFeastRoot, 'node_modules', 'ai-buffer', 'dist', file));
    return c.body(source, 200, { 'Content-Type': 'text/javascript; charset=utf-8' });
  } catch {
    return c.notFound();
  }
});

app.post('/api/ai', async (c) => {
  let body: { purpose?: unknown; message?: unknown; notes?: unknown } = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Send the request as JSON.' }, 400);
  }
  const purpose = body.purpose === 'listing' || body.purpose === 'coordinate' ? body.purpose : 'chat';
  if (body.purpose != null && body.purpose !== 'chat' && body.purpose !== 'listing' && body.purpose !== 'coordinate') {
    return c.json({ error: 'Choose chat, listing help, or community coordination.' }, 400);
  }
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return c.json(
      {
        error:
          'The server has no OpenRouter key. In the browser, Puter runs first, and a key saved on this device tries Space Bunny Alpha next.',
      },
      503,
    );
  }
  try {
    const result = await askConnection({
      purpose,
      message: typeof body.message === 'string' ? body.message : '',
      notes: typeof body.notes === 'string' ? body.notes : '',
      apiKey,
      model: process.env.OPENROUTER_MODEL,
      platform: 'server',
      timeoutMs: 55_000,
    });
    return c.json({
      reply: result.reply,
      models: result.models,
      connection: result.connection,
      purpose: result.purpose,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SeedFeast could not answer that.';
    const status = message.includes('what you need') || message.includes('Choose chat') ? 400 : 502;
    return c.json({ error: message }, status);
  }
});

app.post('/api/feast', async (c) => {
  let body: { seeds?: unknown; notes?: unknown } = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Send the seeds as JSON.' }, 400);
  }
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return c.json(
      {
        error:
          'The server has no OpenRouter key. In the browser, Puter runs first, and a key saved on this device tries Space Bunny Alpha next.',
      },
      503,
    );
  }
  try {
    const result = await askFeast({
      seeds: typeof body.seeds === 'string' ? body.seeds : '',
      notes: typeof body.notes === 'string' ? body.notes : '',
      apiKey,
      model: process.env.OPENROUTER_MODEL,
      platform: 'server',
      timeoutMs: 55_000,
    });
    return c.json({ recipe: result.recipe, models: result.models, connection: result.connection });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SeedFeast could not cook that.';
    const status = message.includes('seeds or ingredients') ? 400 : 502;
    return c.json({ error: message }, status);
  }
});

app.all('/integrations/:path{.+}', (c) => {
  return c.json({ error: 'SeedFeast does not forward integration handles or webhooks.' }, 410);
});

mountCatalogApi(app);

app.use('/api/auth/*', async (c, next) => {
  if (!process.env.AUTH_SECRET) {
    if (c.req.path === '/api/auth/session') return c.json(null);
    return next();
  }
  if (isAuthAction(c.req.path)) {
    return authHandler()(c, next);
  }
  return next();
});
app.route(API_BASENAME, api);

export default await createHonoServer({
  app,
  defaultLogger: false,
});
