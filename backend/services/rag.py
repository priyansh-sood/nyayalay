import os
import logging
from typing import List, Optional, Dict, Any

logger = logging.getLogger(__name__)

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", "")
PINECONE_INDEX = os.getenv("PINECONE_INDEX", "legal-docs")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

_pinecone_index = None


def get_pinecone_index():
    global _pinecone_index
    if _pinecone_index is not None:
        return _pinecone_index
    if not PINECONE_API_KEY:
        return None
    try:
        from pinecone import Pinecone, ServerlessSpec
        pc = Pinecone(api_key=PINECONE_API_KEY)
        existing = [idx.name for idx in pc.list_indexes()]
        if PINECONE_INDEX not in existing:
            pc.create_index(
                name=PINECONE_INDEX,
                dimension=768,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1"),
            )
        _pinecone_index = pc.Index(PINECONE_INDEX)
        return _pinecone_index
    except Exception as e:
        logger.error(f"Pinecone init failed: {e}")
        return None


def _get_embedding(text: str) -> Optional[List[float]]:
    if not GEMINI_API_KEY:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text[:8000],
            task_type="retrieval_document",
        )
        return result["embedding"]
    except Exception as e:
        logger.error(f"Gemini embedding failed: {e}")
        return None


def _chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> List[str]:
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i: i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return chunks


def index_document(doc_id: int, case_id: int, text: str, metadata: dict) -> bool:
    index = get_pinecone_index()
    if index is None:
        logger.warning("Pinecone unavailable; skipping index")
        return False
    chunks = _chunk_text(text)
    vectors = []
    for i, chunk in enumerate(chunks[:50]):
        embedding = _get_embedding(chunk)
        if embedding is None:
            continue
        vector_id = f"doc-{doc_id}-chunk-{i}"
        meta = {**metadata, "doc_id": doc_id, "case_id": case_id, "chunk_index": i, "text": chunk[:1000]}
        vectors.append((vector_id, embedding, meta))
    if not vectors:
        return False
    try:
        for j in range(0, len(vectors), 100):
            batch = vectors[j: j + 100]
            index.upsert(vectors=[(v[0], v[1], v[2]) for v in batch])
        return True
    except Exception as e:
        logger.error(f"Pinecone upsert failed: {e}")
        return False


def query_documents(query: str, case_id: Optional[int] = None, top_k: int = 5) -> List[Dict[str, Any]]:
    index = get_pinecone_index()
    if index is None:
        return []
    embedding = None
    if GEMINI_API_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=query[:8000],
                task_type="retrieval_query",
            )
            embedding = result["embedding"]
        except Exception as e:
            logger.error(f"Gemini query embedding failed: {e}")
    if embedding is None:
        return []
    try:
        filter_dict = {}
        if case_id is not None:
            filter_dict["case_id"] = {"$eq": case_id}
        response = index.query(
            vector=embedding,
            top_k=top_k,
            include_metadata=True,
            filter=filter_dict if filter_dict else None,
        )
        results = []
        for match in response.matches:
            results.append({
                "score": round(match.score, 4),
                "doc_id": match.metadata.get("doc_id"),
                "case_id": match.metadata.get("case_id"),
                "filename": match.metadata.get("filename", "Unknown"),
                "text": match.metadata.get("text", ""),
                "chunk_index": match.metadata.get("chunk_index", 0),
            })
        return results
    except Exception as e:
        logger.error(f"Pinecone query failed: {e}")
        return []


def generate_rag_answer(query: str, contexts: List[Dict[str, Any]], case_id: Optional[int] = None) -> str:
    if not GEMINI_API_KEY:
        return _fallback_answer(query, contexts)
    if not contexts:
        return "No relevant documents found. Please upload case documents to enable legal research queries."
    context_text = "\n\n---\n\n".join(
        f"[{c['filename']} | Score: {c['score']}]\n{c['text']}" for c in contexts
    )
    prompt = (
        "You are an expert Indian legal assistant with deep knowledge of the Indian Penal Code, "
        "CrPC, CPC, and landmark judgments. Answer the following legal query based on the "
        "provided document context. Cite the source document filename when referencing specific "
        "passages. Be precise, cite relevant IPC sections if applicable, and format your answer clearly.\n\n"
        f"Query: {query}\n\nDocument Context:\n{context_text[:6000]}"
    )
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini RAG answer failed: {e}")
        return _fallback_answer(query, contexts)


def _fallback_answer(query: str, contexts: List[Dict[str, Any]]) -> str:
    if not contexts:
        return "No relevant context found. Please ensure documents are uploaded and indexed."
    top = contexts[0]
    return (
        f"Based on '{top['filename']}' (relevance: {top['score']}):\n\n"
        f"{top['text']}\n\n"
        f"[AI summary unavailable - configure GEMINI_API_KEY for full RAG answers]"
    )