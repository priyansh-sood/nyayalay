import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import ResearchQuery, ResearchResult
from routers.auth import get_current_user
from services.rag import query_documents

router = APIRouter(prefix="/research", tags=["research"])


def _gemini_direct_answer(query: str) -> str:
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        return _keyword_fallback(query)
    try:
        import google.generativeai as genai
        genai.configure(api_key=gemini_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = (
            "You are an expert Indian legal assistant with deep knowledge of the Indian Penal Code (IPC), "
            "Code of Criminal Procedure (CrPC), Code of Civil Procedure (CPC), and landmark Supreme Court "
            "and High Court judgments. Answer the following legal query precisely and clearly. "
            "Cite relevant IPC sections, landmark cases, and legal principles where applicable. "
            "Format your answer with clear headings and bullet points where appropriate.\n\n"
            f"Legal Query: {query}"
        )
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Gemini direct answer failed: {e}")
        return _keyword_fallback(query)


def _keyword_fallback(query: str) -> str:
    query_lower = query.lower()
    if any(k in query_lower for k in ["354", "modesty", "outraging"]):
        return "IPC Section 354 - Assault or criminal force to woman with intent to outrage her modesty.\n\nPunishment: Imprisonment of not less than 1 year, which may extend to 5 years, and fine."
    if any(k in query_lower for k in ["376", "rape"]):
        return "IPC Section 376 - Punishment for rape.\n\nPunishment: Rigorous imprisonment of not less than 10 years, extendable to life, and fine."
    if any(k in query_lower for k in ["304b", "dowry", "498a"]):
        return "IPC Section 304B - Dowry Death.\n\nKey elements: Death within 7 years of marriage after dowry harassment.\n\nPunishment: Imprisonment of not less than 7 years, extendable to life."
    if any(k in query_lower for k in ["120b", "conspiracy"]):
        return "IPC Section 120B - Criminal conspiracy.\n\nKey elements: Agreement between two or more persons to do an illegal act.\n\nThe agreement itself is the offence - Kehar Singh v. State (1988)."
    if any(k in query_lower for k in ["302", "murder"]):
        return "IPC Section 302 - Punishment for murder.\n\nPunishment: Death or imprisonment for life, and fine.\n\nRarest of rare doctrine - Bachan Singh v. State of Punjab (1980)."
    return f"Query: '{query}'\n\nUpload case documents to enable semantic search, or configure GEMINI_API_KEY for live AI answers."


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
        from services.rag import generate_rag_answer
        answer = generate_rag_answer(
            query=payload.query,
            contexts=contexts,
            case_id=payload.case_id,
        )
        sources = [
            {
                "filename": c["filename"],
                "score": c["score"],
                "snippet": c["text"][:300],
                "doc_id": c.get("doc_id"),
            }
            for c in contexts
        ]
    else:
        answer = _gemini_direct_answer(payload.query)
        sources = [
            {
                "filename": "Gemini Legal Knowledge Base",
                "score": 1.0,
                "snippet": "Answer generated from Gemini training on Indian legal corpus",
                "doc_id": None,
            }
        ]

    return ResearchResult(
        answer=answer,
        sources=sources,
        query=payload.query,
    )


@router.get("/precedents")
def get_precedents(
    ipc_section: str = None,
    current_user: User = Depends(get_current_user),
):
    from routers.research import DEMO_PRECEDENTS
    if ipc_section:
        filtered = [p for p in DEMO_PRECEDENTS if ipc_section in p["text"]]
        return filtered if filtered else DEMO_PRECEDENTS[:3]
    return DEMO_PRECEDENTS