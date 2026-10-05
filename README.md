# SeedFeast

From seed to gourmet feast.

SeedFeast cooks a recipe from the seeds and ingredients you already have. Open `/feast` and describe what is on hand.

Model calls use [ai-buffer](https://github.com/noahnemo-rgb/ai-buffer-template) at commit `d0c7cbc40df991805efaf64223a00fc3fbb72e15`. In the browser, Puter runs first. A key saved in that tab tries Space Bunny Alpha (`stealth/space-bunny-alpha`), then `OPENROUTER_MODEL` (default `openai/gpt-4o-mini`). The server uses `OPENROUTER_API_KEY` in that same keyed order and does not call Puter. Keys stay in the browser tab or in the server environment.

SeedFeast accounts and Stripe checkout stay on this app. Integration handles, upload relays, and webhook forwarding to an external project host are disconnected.
