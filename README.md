# SeedFeast

From seed to gourmet feast.

SeedFeast cooks a recipe from the seeds and ingredients you already have. Open `/feast` and describe what is on hand.

Model calls use [ai-buffer](https://github.com/noahnemo-rgb/ai-buffer-template) at commit `d0c7cbc40df991805efaf64223a00fc3fbb72e15`. In the browser, Puter runs first. A key saved in that tab tries Space Bunny Alpha (`stealth/space-bunny-alpha`), then `OPENROUTER_MODEL` (default `openai/gpt-4o-mini`). The server uses `OPENROUTER_API_KEY` in that same keyed order and does not call Puter. Keys stay in the browser tab or in the server environment.

SeedFeast accounts and Stripe checkout stay on this app. Integration handles, upload relays, and webhook forwarding to an external project host are disconnected.

## Vercel

Tab navigation requests `/__manifest` and expects JSON. Publishing only `build/client` and rewriting every other path to `/index.html` makes that URL return the homepage HTML, so `response.json()` throws `SyntaxError` (Safari reports “The string did not match the expected pattern.”).

`npm run build` still runs `react-router build`, then writes a Build Output API deployment to `.vercel/output`:

- `static/` is the client build (hashed assets and the prerendered `/`).
- `functions/index.func` runs the Hono server produced at `build/server/index.js`. The function entry is `server/vercel-handler.mjs`. It serves React Router (`/__manifest`, `*.data`, documents) and the Hono routes (`/api/*`, including `/api/seeds/listings`).
- Routing serves a real file when one exists, then sends every other path to that function. There is no catch-all rewrite to `/index.html`.

`vercel.json` overrides the dashboard. Keep these project settings:

- Framework Preset: Other (`"framework": null`).
- Install Command: `npm install`.
- Build Command: `npm run build`.
- Development Command: `npm run dev` (the React Router dev server, not the production output).
- Output Directory: empty. `vercel.json` sets `"outputDirectory": null`. Do not set it back to `build/client`.
- Do not add a rewrite from `/(.*)` to `/index.html`.

Local `npm start` still runs `react-router-serve` against `build/server/index.js`. The Vercel function imports that same build and does not listen on a port.
