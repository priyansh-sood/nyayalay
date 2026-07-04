import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import ResearchQuery, ResearchResult
from routers.auth import get_current_user
from services.rag import query_documents, generate_rag_answer

router = APIRouter(prefix="/research", tags=["research"])


def _gemini_direct_answer(query: str) -> str:
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        return "Configure GEMINI_API_KEY for AI-powered legal research."
    try:
        from google import genai
        client = genai.Client(api_key=gemini_key)
        prompt = (
            "You are an expert Indian legal assistant specializing in the Indian Penal Code (IPC), "
            "CrPC, CPC, and landmark Supreme Court and High Court judgments. "
            "IMPORTANT: Only answer questions related to Indian law, legal procedures, court processes, "
            "IPC sections, or legal rights. If the question is not related to law or legal matters, "
            "politely decline and say this assistant is designed for Indian legal queries only.\n\n"
            "Answer the following legal query precisely. Cite relevant IPC sections and landmark cases.\n\n"
            f"Query: {query}"
        )
        response = client.models.generate_content(model="gemini-1.5-flash", contents=prompt)
        return response.text.strip()
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Gemini direct answer failed: {e}")
        return f"AI research temporarily unavailable. Error: {str(e)}"


@router.post("/query", response_model=ResearchResult)
def legal_research_query(
    payload: ResearchQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contexts = query_documents(
        query=payload.query,
        case_id=payload.case_id,
        top_k=payload.top_k,
    )

    if contexts:
        answer = generate_rag_answer(
            query=payload.query,
            contexts=contexts,
            case_id=payload.case_id,
        )
        sources = [
            {"filename": c["filename"], "score": c["score"], "snippet": c["text"][:300], "doc_id": c.get("doc_id")}
            for c in contexts
        ]
    else:
        answer = _gemini_direct_answer(payload.query)
        sources = [
            {"filename": "Gemini Legal Knowledge Base", "score": 1.0, "snippet": "Direct AI answer from Gemini", "doc_id": None}
        ]

    return ResearchResult(answer=answer, sources=sources, query=payload.query)


@router.get("/precedents")
def get_precedents(ipc_section: str = None, current_user: User = Depends(get_current_user)):
    precedents = [
        {"filename": "Bachan Singh v. State of Punjab (1980)", "score": 0.95, "text": "Rarest of rare doctrine for IPC Section 302 - death penalty."},
        {"filename": "State of Maharashtra v. Chandraprakash Jain (1990)", "score": 0.91, "text": "IPC Section 376 - prosecutrix testimony alone can sustain conviction."},
        {"filename": "K.M. Nanavati v. State of Maharashtra (1961)", "score": 0.88, "text": "IPC Section 302 - provocation must be grave and sudden."},
        {"filename": "Mohd. Ajmal Kasab v. State of Maharashtra (2012)", "score": 0.82, "text": "IPC Sections 302, 120B, 34 - common intention can form at spur of moment."},
    ]
    if ipc_section:
        return [p for p in precedents if ipc_section in p["text"]] or precedents[:2]
    return precedents