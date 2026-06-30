# Deployment Guide — Nyayalay Legal Case Management

This guide walks you through deploying the full stack:
- **Frontend** → Vercel
- **Backend** → Render
- **Database** → Supabase (PostgreSQL)
- **Vector DB** → Pinecone (free tier)

---

## Prerequisites

- Node.js 20+ and npm
- Python 3.11+
- Git
- Accounts on: Vercel, Render, Supabase, Pinecone, OpenAI

---

## Step 1 — Set Up Supabase Database

1. Go to https://supabase.com → **New Project**
2. Note your project URL and anon key
3. Go to **Settings → Database** → copy the **Connection String** (URI format)
4. It looks like: `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`
5. Save this — it's your `DATABASE_URL`

---

## Step 2 — Set Up Pinecone (Vector DB for RAG)

1. Go to https://pinecone.io → sign up (free tier works)
2. Create a new index:
   - **Name**: `legal-docs`
   - **Dimensions**: `1536` (OpenAI ada-002)
   - **Metric**: `cosine`
   - **Cloud/Region**: AWS us-east-1
3. Copy your **API Key** from the Pinecone console
4. Save as `PINECONE_API_KEY`

---

## Step 3 — Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create a new key
3. Save as `OPENAI_API_KEY`
4. Note: Used for OCR summaries (gpt-4o-mini) and embeddings (text-embedding-ada-002)

---

## Step 4 — Deploy Backend to Render

### 4a. Push to GitHub

```bash
cd legal-app
git init
git add .
git commit -m "Initial commit — Nyayalay Legal Case Management"
git remote add origin https://github.com/YOUR_USERNAME/nyayalay.git
git push -u origin main
```

### 4b. Create Render Web Service

1. Go to https://render.com → **New → Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Root Directory**: `backend`
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### 4c. Add Environment Variables in Render

In the Render dashboard → Environment → Add:

```
DATABASE_URL          = postgresql://... (from Supabase)
JWT_SECRET_KEY        = (generate: python -c "import secrets; print(secrets.token_hex(32))")
OPENAI_API_KEY        = sk-...
PINECONE_API_KEY      = ...
PINECONE_INDEX        = legal-docs
ALLOWED_ORIGINS       = https://your-frontend.vercel.app
UPLOAD_DIR            = /tmp/legal_uploads
```

### 4d. Seed the Database

After the backend deploys, open Render Shell or run locally:

```bash
# Option A: Via Render Shell (click "Shell" in dashboard)
python seed.py

# Option B: Locally with the production DATABASE_URL
export DATABASE_URL="postgresql://..."
python seed.py
```

This creates 15 Indian cases + 3 demo users:
- `judge@court.in` / `Judge@123`
- `lawyer@court.in` / `Lawyer@123`
- `clerk@court.in` / `Clerk@123`

---

## Step 5 — Deploy Frontend to Vercel

### 5a. Configure environment

Create `frontend/.env.local`:
```
VITE_API_URL=https://your-backend.onrender.com
```

### 5b. Deploy via Vercel CLI

```bash
cd frontend
npm install -g vercel
vercel login
vercel --prod
```

When prompted:
- **Root directory**: `frontend` (or current dir)
- **Framework**: Vite
- **Build command**: `npm run build`
- **Output directory**: `dist`

### 5c. Or deploy via Vercel Dashboard

1. Go to https://vercel.com → **New Project**
2. Import your GitHub repo
3. Set **Root Directory** to `frontend`
4. Add Environment Variable:
   - `VITE_API_URL` = `https://your-backend.onrender.com`
5. Deploy

---

## Step 6 — Test Demo Mode

Visit your deployed frontend with `?demo=true`:

```
https://your-app.vercel.app?demo=true
```

This loads all 15 seed cases from cached data instantly without hitting the backend — perfect for demos and presentations.

---

## Step 7 — Verify Everything Works

### Backend health check:
```
GET https://your-backend.onrender.com/health
→ {"status": "ok", "service": "Legal Case Management API"}
```

### API docs:
```
https://your-backend.onrender.com/docs
```

### Frontend checklist:
- [ ] Login with `judge@court.in` / `Judge@123`
- [ ] All 15 cases visible on Cases page
- [ ] Cause List loads and shows today's schedule
- [ ] Upload a PDF — OCR text extracts (may take ~30s first time)
- [ ] Legal Research query returns AI answer
- [ ] Alerts show upcoming deadline cases
- [ ] Dark mode toggle works
- [ ] Hindi translation works (globe icon → हिंदी)
- [ ] Mobile layout works at 375px

---

## Local Development

### Backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # Fill in your values
python seed.py                 # Seed database
uvicorn main:app --reload --port 8000
```

### Frontend:
```bash
cd frontend
npm install
cp .env.example .env.local     # Set VITE_API_URL=http://localhost:8000
npm run dev
```

### Full stack with Docker:
```bash
# From project root
cp backend/.env.example backend/.env   # Fill OPENAI_API_KEY etc.
docker-compose up --build
# Then seed: docker-compose exec backend python seed.py
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vercel)                        │
│         React 18 + Vite + Tailwind CSS + shadcn/ui              │
│         JWT auth · Hindi i18n · Dark mode · Demo mode           │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS REST API
┌───────────────────────────▼─────────────────────────────────────┐
│                         BACKEND (Render)                          │
│              FastAPI + SQLAlchemy + Pydantic                      │
│    Routers: auth · cases · documents · research · cause-list     │
│    Services: EasyOCR · OpenAI GPT-4o-mini · Pinecone RAG        │
└──────┬─────────────────────────┬───────────────────────────────  ┘
       │                         │
┌──────▼──────┐          ┌───────▼──────────────────────────────  ┐
│  Supabase   │          │  Pinecone (Vector DB)                    │
│ PostgreSQL  │          │  1536-dim ada-002 embeddings            │
│  (primary)  │          │  Semantic search over court docs        │
└─────────────┘          └─────────────────────────────────────────┘
```

---

## Roles & Permissions

| Feature            | Judge | Lawyer | Clerk |
|--------------------|-------|--------|-------|
| View cases         | ✅    | ✅     | ✅    |
| Create cases       | ✅    | ✅     | ✅    |
| Edit cases         | ✅    | ✅     | ✅    |
| Delete cases       | ✅    | ✅     | ❌    |
| Upload documents   | ✅    | ✅     | ✅    |
| Legal research     | ✅    | ✅     | ✅    |
| Cause list         | ✅    | ✅     | ✅    |
| View alerts        | ✅    | ✅     | ✅    |

> Note: Role-based UI restrictions can be added by checking `user.role` in components. The backend currently allows all authenticated users full CRUD access — add role guards in routers as needed.

---

## Environment Variables Reference

### Backend (Render)
| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET_KEY` | ✅ | Min 32-char random string |
| `OPENAI_API_KEY` | ⚡ | GPT-4o-mini + embeddings |
| `PINECONE_API_KEY` | ⚡ | Vector similarity search |
| `PINECONE_INDEX` | ⚡ | Default: `legal-docs` |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated CORS origins |
| `UPLOAD_DIR` | ✅ | Default: `/tmp/legal_uploads` |

⚡ = Optional but needed for AI features. App works without them (fallback summaries used).

### Frontend (Vercel)
| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ | Backend base URL |

---

## Troubleshooting

**Backend 500 errors:** Check Render logs. Usually a missing env var or DB connection issue.

**CORS errors:** Ensure `ALLOWED_ORIGINS` includes your exact Vercel URL (no trailing slash).

**OCR slow on first upload:** EasyOCR downloads ~300MB model on cold start. Render free tier may need 2-3 minutes.

**Pinecone errors:** Index must be `1536` dimensions. Delete and recreate if dimension mismatch.

**Database migration:** If you update `models.py`, run `alembic` or drop/recreate tables in Supabase SQL editor.

**Demo mode not working:** Ensure `?demo=true` is in the URL and no API errors appear in the console.
