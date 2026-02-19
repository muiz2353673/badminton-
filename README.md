# North London Badminton Tournament – Full stack

React (Next.js) + Python (FastAPI) + Supabase.

## Structure

- **`web/`** – Next.js (React) front end. Register, players, schedule, draws, admin.
- **`api/`** – FastAPI backend. Full single-elimination bracket generation and draws API.
- **`supabase/schema.sql`** – Database schema. Run in Supabase SQL Editor.
- **`supabase/migrations/001_add_bracket_fields.sql`** – Run after schema: adds `round_order`, `slot_in_round` to matches for draw display.
- **`supabase/migrations/002_add_standard_to_matches.sql`** – Run after 001: adds `standard` to matches so draws are per event + standard (Intermediate / Advanced for all age groups).
- **`supabase/migrations/003_add_age_group_to_matches.sql`** – Run after 002: adds `age_group` to matches so draws are per event + standard + age group (U11, U13, U15, U17, U19, Senior).
- **`index.html`** – Static site (backup / optional).
- **`GOOGLE_SHEETS_PLAN.md`** – Google Sheets fallback for registration.

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run the contents of **`supabase/schema.sql`**.
3. In **Settings → API**: copy **Project URL** and **anon public** key for the front end; copy **service_role** key for the Python API (keep secret).

## 2. Front end (Next.js)

```bash
cd web
cp .env.local.example .env.local
```

Edit **`web/.env.local`**:

- `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL  
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key  
- `NEXT_PUBLIC_API_URL` = `http://localhost:8000` (optional, for calling Python API)
- `ADMIN_USERNAME` = staff login username (default: `admin`)
- `ADMIN_PASSWORD` = staff login password (default: `password@12345`). Set in production.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Register, view players, schedule, admin.

## 3. Python API (FastAPI)

```bash
cd api
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit **`api/.env`**:

- `SUPABASE_URL` = your Supabase project URL  
- `SUPABASE_SERVICE_ROLE_KEY` = your Supabase **service_role** key (not anon)

```bash
uvicorn main:app --reload --port 8000
```

API: [http://localhost:8000](http://localhost:8000). Docs: [http://localhost:8000/docs](http://localhost:8000/docs).

**Generate bracket (example):**

```bash
curl -X POST http://localhost:8000/generate-bracket \
  -H "Content-Type: application/json" \
  -d '{"tournament_id": "<uuid-from-supabase>", "event": "Singles (Woodhouse)"}'
```

Use the tournament UUID from Supabase (e.g. from the tournaments table). After running, new rows appear in `matches` and show on the Schedule page.

## 4. Run both

- Terminal 1: `cd web && npm run dev` (port 3000)  
- Terminal 2: `cd api && source venv/bin/activate && uvicorn main:app --reload --port 8000` (port 8000)

## 5. Production (e.g. Render)

- **API service** – Deploy the `api/` app (e.g. as `tournament-api`). Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the service environment.
- **Web service** – Deploy the `web/` app (e.g. as `tournament-web`). Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and **`NEXT_PUBLIC_API_URL`** to your **deployed API URL** (e.g. `https://tournament-api.onrender.com`). If `NEXT_PUBLIC_API_URL` is missing or wrong, the Draws page will show “Load failed”.
- Redeploy the web service after changing any `NEXT_PUBLIC_*` env vars (they are baked in at build time).

## 6. Why is it slow? (Render / free tier)

- **Cold starts** – On Render’s free tier, the **backend API sleeps** after ~15 minutes of no traffic. The first request after that can take **30–60 seconds** while the service starts. The frontend (Next.js) may also spin down. That’s the main reason “everything feels slow” after a break.
- **What helps**
  - **Keep the API warm**: Use a free cron (e.g. [cron-job.org](https://cron-job.org)) to hit your API’s health URL every 10–15 minutes: `GET https://your-api.onrender.com/health`
  - **Paid plan**: Render paid services don’t spin down, so the first request is fast.
  - **Same region**: If you can, put Supabase and Render in the same region to cut database latency.

Bracket generation now uses a **single bulk insert** instead of one insert per match, so generating draws is faster.

## Stack

- **React** – via Next.js in `web/`.
- **Python** – FastAPI in `api/` for bracket generation and future backend logic.
- **Supabase** – Postgres, RLS, and (optionally) auth; used by both Next.js and FastAPI.
# badminton-
