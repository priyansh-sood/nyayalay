from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import ResearchQuery, ResearchResult
from routers.auth import get_current_user
from services.rag import query_documents, generate_rag_answer

router = APIRouter(prefix="/research", tags=["research"])

# Pre-seeded legal precedents for demo mode
DEMO_PRECEDENTS = [
    {
        "score": 0.95,
        "doc_id": None,
        "case_id": None,
        "filename": "Bachan Singh v. State of Punjab (1980)",
        "text": "The Supreme Court upheld the constitutional validity of the death penalty under IPC Section 302. "
                "The 'rarest of rare' doctrine was established – capital punishment should be awarded only in the "
                "most exceptional circumstances where the alternative option of life imprisonment is unquestionably "
                "foreclosed.",
        "chunk_index": 0,
    },
    {
        "score": 0.91,
        "doc_id": None,
        "case_id": None,
        "filename": "State of Maharashtra v. Chandraprakash Kewalchand Jain (1990)",
        "text": "The Supreme Court held that in cases under IPC Section 376 (rape), the testimony of the prosecutrix, "
                "if found credible, can be the sole basis of conviction without corroboration. The court emphasised "
                "the need for sensitivity in examining victims of sexual offences.",
        "chunk_index": 0,
    },
    {
        "score": 0.88,
        "doc_id": None,
        "case_id": None,
        "filename": "K.M. Nanavati v. State of Maharashtra (1961)",
        "text": "Landmark case under IPC Section 302. The Supreme Court overruled the jury verdict and convicted the "
                "accused of murder. Established that provocation must be grave and sudden and the accused must have "
                "acted in the heat of passion without time to cool down.",
        "chunk_index": 0,
    },
    {
        "score": 0.85,
        "doc_id": None,
        "case_id": None,
        "filename": "Shreya Singhal v. Union of India (2015)",
        "text": "The Supreme Court struck down Section 66A of the IT Act. Discussed the boundaries of free speech "
                "under Article 19. Cases involving IPC Section 120B (criminal conspiracy) must show clear evidence "
                "of agreement to commit an unlawful act.",
        "chunk_index": 0,
    },
    {
        "score": 0.82,
        "doc_id": None,
        "case_id": None,
        "filename": "Mohd. Ajmal Kasab v. State of Maharashtra (2012)",
        "text": "The Supreme Court upheld conviction under IPC Sections 302, 307, 120B, and 34. The court held that "
                "common intention under Section 34 requires prior concert and meeting of minds, but this can be formed "
                "at the spur of the moment immediately before the act is committed.",
        "chunk_index": 0,
    },
]


@router.post("/query", response_model=ResearchResult)
def legal_research_query(
    payload: ResearchQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Try vector search first
    contexts = query_documents(
        query=payload.query,
        case_id=payload.case_id,
        top_k=payload.top_k,
    )

    # Supplement with demo precedents if no indexed docs found
    if not contexts:
        query_lower = payload.query.lower()
        relevant_precedents = [
            p for p in DEMO_PRECEDENTS
            if any(
                kw in query_lower or kw in p["text"].lower()
                for kw in ["302", "376", "120b", "307", "34", "murder", "rape", "conspiracy", "attempt"]
            )
        ]
        contexts = relevant_precedents[:payload.top_k] if relevant_precedents else DEMO_PRECEDENTS[:2]

    answer = generate_rag_answer(
        query=payload.query,
        contexts=contexts,
        case_id=payload.case_id,
    )

    return ResearchResult(
        answer=answer,
        sources=[
            {
                "filename": c["filename"],
                "score": c["score"],
                "snippet": c["text"][:300],
                "doc_id": c.get("doc_id"),
            }
            for c in contexts
        ],
        query=payload.query,
    )


@router.get("/precedents")
def get_precedents(
    ipc_section: str = None,
    current_user: User = Depends(get_current_user),
):
    """Return known precedents, optionally filtered by IPC section."""
    if ipc_section:
        filtered = [p for p in DEMO_PRECEDENTS if ipc_section in p["text"]]
        return filtered if filtered else DEMO_PRECEDENTS[:3]
    return DEMO_PRECEDENTS
