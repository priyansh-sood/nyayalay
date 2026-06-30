# ⚖️ Nyayalay — न्यायालय Legal Case Management System

A production-ready, full-stack Legal Case Management application built for Indian courts. Supports Hindi/English, AI-powered document analysis, RAG-based legal research, intelligent cause list scheduling, and real-time deadline alerts.

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **JWT Auth** | Role-based access: Judge, Advocate, Court Clerk |
| 📋 **Case CRUD** | Full case management with IPC sections, priority scoring, and status tracking |
| 📄 **Document Intelligence** | Drag-drop PDF upload → EasyOCR extraction → GPT-4o-mini summary → Pinecone indexing |
| 🔍 **Legal Research** | RAG query across case documents and 5 landmark Indian precedents |
| 📅 **Cause List** | Auto-schedules daily hearings 10:30–16:30 by priority, duration, conflict detection |
| 🚨 **Deadline Alerts** | Auto-flags cases within 7 days of next hearing date |
| 🌐 **Hindi + English** | Full i18n via react-i18next, toggleable in header |
| 🌙 **Dark Mode** | System-preference aware, persisted across sessions |
| 🎭 **Demo Mode** | `?demo=true` loads 15 cached Indian cases instantly — no backend needed |
| 📱 **Responsive** | Mobile-first, works at 375px (iPhone SE) |

## 🏗️ Tech Stack

**Frontend**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui design system
- react-router-dom v6
- react-i18next (Hindi + English)
- Recharts (dashboard charts)
- react-dropzone (file upload)
- Axios (API client)

**Backend**
- FastAPI (Python 3.11)
- SQLAlchemy 2.0 + PostgreSQL
- Pydantic v2
- python-jose (JWT)
- EasyOCR (Hindi + English OCR)
- OpenAI gpt-4o-mini + text-embedding-ada-002
- Pinecone v3 (vector similarity search)
- PyPDF2 (PDF text extraction)

**Infrastructure**
- Frontend → Vercel
- Backend → Render
- Database → Supabase (PostgreSQL)
- Vector DB → Pinecone (free tier)

## 🚀 Quick Start (Demo Mode)

No setup required — open in browser with demo data:

```
http://localhost:5173?demo=true
```

Or after deploying:
```
https://your-app.vercel.app?demo=true
```

## 🧑‍💻 Local Development

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/nyayalay.git
cd nyayalay

# 2. Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # Edit with your values
python seed.py         # Seeds 15 Indian cases + 3 demo users
uvicorn main:app --reload

# 3. Frontend (new terminal)
cd frontend
npm install
cp .env.example .env.local  # Set VITE_API_URL=http://localhost:8000
npm run dev
```

Open http://localhost:5173

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| Judge | judge@court.in | Judge@123 |
| Advocate | lawyer@court.in | Lawyer@123 |
| Court Clerk | clerk@court.in | Clerk@123 |

## 📦 Seed Data

15 realistic Indian cases including:
- **IPC §302** — Murder (Sessions Case, Saket Delhi)
- **IPC §304** — Culpable homicide (Mumbai)
- **IPC §307** — Attempt to murder with §120B (Lucknow)
- **IPC §324** — Hurt by dangerous weapon (Bengaluru)
- **IPC §34** — Common intention murder (Patna)
- **IPC §120B** — Bank fraud conspiracy (CBI Court, Delhi)
- **IPC §420** — Cheating / property fraud (Dwarka)
- **IPC §406** — Criminal breach of trust (Pune)
- **IPC §376** — POCSO rape case (Special Court, Chennai)
- **IPC §354** — Outraging modesty (Mumbai)
- Honour killing (Jaipur)
- Corporate fraud (Hyderabad)
- Dowry death §304B (Fast Track Court, Kanpur)
- NDPS drug trafficking (Amritsar)
- Disproportionate assets / corruption (Bhopal)

## 📋 API Endpoints

```
POST   /auth/register          Create account
POST   /auth/login             Get JWT token
GET    /auth/me                Current user

GET    /cases                  List cases (search, filter, paginate)
POST   /cases                  Create case
GET    /cases/{id}             Get case
PUT    /cases/{id}             Update case
DELETE /cases/{id}             Delete case
GET    /cases/stats/summary    Dashboard stats

POST   /documents/upload/{id}  Upload document (PDF/image)
GET    /documents/{id}/text    Get OCR text + AI summary

POST   /research/query         RAG legal research query
GET    /research/precedents    List landmark precedents

GET    /cause-list             Auto-generated daily hearing schedule
GET    /cause-list/week        Weekly hearing schedule

GET    /alerts                 List deadline alerts
POST   /alerts/{id}/read       Mark alert as read
POST   /alerts/read-all        Mark all read
GET    /alerts/count           Unread alert count
```

Interactive docs: `http://localhost:8000/docs`

## 🚢 Deployment

See [DEPLOY.md](./DEPLOY.md) for the complete step-by-step deployment guide.

## 📄 License

MIT — Free for court administration and legal technology projects.

---

*Built with ❤️ for the Indian Judiciary*
