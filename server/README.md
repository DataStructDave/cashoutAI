# cashOutAI Backend

Express server that uses OpenAI for receipt extraction. Production-ready with optional API key auth, CORS, rate limiting, and graceful shutdown.

## Setup

1. **Revoke any exposed API key** and create a new one at [OpenAI API keys](https://platform.openai.com/api-keys).

2. Copy the example env file and add your key:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set at least:
   ```
   OPENAI_API_KEY=sk-your-new-key-here
   ```

3. Install and run:
   ```bash
   npm install
   npm run dev
   ```
   Server runs at `http://localhost:3000`.

## API

- `GET /health` — health check (no auth). Use for load balancers.
- `POST /api/extract-text` — multipart `images` (files). Returns `{ entries: [...] }` (subtotal, tip, total, payment_method).
- `POST /api/ocr-text` — multipart `images`. Returns raw OCR JSON.

All `/api/*` routes are rate-limited (30 req/min per IP in production) and, when `API_SECRET` is set, require header `x-api-key: <API_SECRET>`.

## Production

Set in your environment (e.g. on Railway, Render, Fly):

- `NODE_ENV=production` — required for production behavior (fail fast on missing key, generic error messages).
- `OPENAI_API_KEY` — required; server exits on startup if missing in production.
- `API_SECRET` — optional; if set, all `/api/*` requests must send `x-api-key: <API_SECRET>` (set the same value in your app’s config).
- `CORS_ORIGIN` — optional; comma-separated origins, e.g. `https://yourapp.com`. If unset, CORS allows all origins.
- `PORT` — optional; default 3000.

Never commit `.env` or share your API key.
