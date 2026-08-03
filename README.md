Nyayalay – Legal Case Management System

Nyayalay is a full-stack Legal Case Management System built for Indian courts. The project helps manage court cases, upload legal documents, schedule hearings, and keep track of important deadlines. It also includes AI features like document summarization and legal research using Retrieval Augmented Generation (RAG).

The main goal of this project was to explore how AI can improve the workflow of judges, advocates, and court staff while keeping the application simple and easy to use.


Features
User authentication with JWT
Role-based login (Judge, Advocate and Court Clerk)
Create, update, delete and manage legal cases
Store IPC sections, case status and priority
Upload court documents in PDF format
OCR-based text extraction from scanned documents
AI-generated summaries of uploaded documents
RAG-based legal research using case documents and landmark judgments
Automatic daily cause list generation
Deadline reminders for upcoming hearings
Hindi and English language support
Dark mode
Demo mode with sample cases
Responsive interface for desktop and mobile devices



Tech Stack

Frontend

React
TypeScript
Vite
Tailwind CSS
shadcn/ui
React Router
React i18next
Axios
Recharts

Backend


FastAPI
Python
PostgreSQL
SQLAlchemy
Pydantic
JWT Authentication
EasyOCR
OpenAI API
Pinecone
PyPDF2


Deployment


Frontend – Vercel
Backend – Render
Database – Supabase PostgreSQL
Vector Database – Pinecone



Running the Project

Clone the repository
git clone https://github.com/YOUR_USERNAME/nyayalay.git
cd nyayalay

Backend
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt

cp .env.example .env

python seed.py

uvicorn main:app --reload

Frontend
cd frontend

npm install

cp .env.example .env.local

npm run dev
http://localhost:5173


Sample Data

The project comes with sample Indian legal cases covering different IPC sections, including:

Murder (IPC 302)
Attempt to Murder (IPC 307)
Cheating (IPC 420)
Criminal Breach of Trust (IPC 406)
Dowry Death (IPC 304B)
POCSO Cases
NDPS Cases
Bank Fraud
Corruption Cases

These records are only for demonstration purposes.


POST   /auth/login
POST   /auth/register
GET    /auth/me

GET    /cases
POST   /cases
PUT    /cases/{id}
DELETE /cases/{id}

POST   /documents/upload/{id}

POST   /research/query

GET    /cause-list

GET    /alerts

Future Improvements

Some features that can be added in future versions include:

E-signature support
Video hearing integration
Email and SMS notifications
Calendar synchronization
Multi-court support
Advanced analytics dashboard

