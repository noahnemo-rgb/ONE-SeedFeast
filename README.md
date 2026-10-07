# SeedFeast

From seed to gourmet feast.

SeedFeast cooks a recipe from the seeds and ingredients you already have. Open `/feast` and describe what is on hand.

Model calls use [ai-buffer](https://github.com/noahnemo-rgb/ai-buffer-template) at commit `9e7397958d93423d2bba65315fcd88b30caa3e61`. That package is the connections connector: one cook call, then Puter, Space Bunny Alpha, or OpenRouter. In the browser, Puter runs first. A key saved in that tab tries Space Bunny Alpha (`stealth/space-bunny-alpha`), then `OPENROUTER_MODEL` (default `openai/gpt-4o-mini`). The server uses `OPENROUTER_API_KEY` in that same keyed order and does not call Puter. Keys stay in the browser tab or in the server environment. OpenRouter calls send `https://seedfeast.ai` as the site URL.

`seedfeast.ai` is the Namecheap domain for this AI. `www.seedfeast.ai` still answers from Namecheap's parking page, so the domain is not serving this app yet. Pointing it here is a DNS change at Namecheap, separate from this repository.

SeedFeast accounts and Stripe checkout stay on this app. Integration handles, upload relays, and webhook forwarding to an external project host are disconnected.
