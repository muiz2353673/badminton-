# North London Badminton Tournament – Full stack

React (Next.js) + Python (FastAPI) + Supabase.

## Structure

- **`web/`** – Next.js (React) front end. Register, players, schedule, admin.
- **`api/`** – FastAPI backend. Bracket generation, future: emails, cron.
- **`supabase/schema.sql`** – Database schema. Run in Supabase SQL Editor.
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

## Stack

- **React** – via Next.js in `web/`.
- **Python** – FastAPI in `api/` for bracket generation and future backend logic.
- **Supabase** – Postgres, RLS, and (optionally) auth; used by both Next.js and FastAPI.
# badminton-
