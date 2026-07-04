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
        from google import genai
        client = genai.Client(api_key=GEMINI_API_KEY)
        result = client.models.embed_content(
            model="models/text-embedding-004",
            contents=text[:8000],
        )
        return result.embeddings[0].values
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
    embedding = _get_embedding(query)
    if embedding is None:
        return []
    try:
        filter_dict = {"case_id": {"": case_id}} if case_id is not None else None
        response = index.query(
            vector=embedding,
            top_k=top_k,
            include_metadata=True,
            filter=filter_dict,
        )
        return [
            {
                "score": round(m.score, 4),
                "doc_id": m.metadata.get("doc_id"),
                "case_id": m.metadata.get("case_id"),
                "filename": m.metadata.get("filename", "Unknown"),
                "text": m.metadata.get("text", ""),
                "chunk_index": m.metadata.get("chunk_index", 0),
            }
            for m in response.matches
        ]
    except Exception as e:
        logger.error(f"Pinecone query failed: {e}")
        return []


def generate_rag_answer(query: str, contexts: List[Dict[str, Any]], case_id: Optional[int] = None) -> str:
    if not GEMINI_API_KEY or not contexts:
        return _fallback_answer(query, contexts)
    context_text = "\n\n---\n\n".join(
        f"[{c['filename']} | Score: {c['score']}]\n{c['text']}" for c in contexts
    )
    prompt = (
        "You are an expert Indian legal assistant. Answer the following legal query based on "
        "the provided document context. Cite source filenames and relevant IPC sections.\n\n"
        f"Query: {query}\n\nContext:\n{context_text[:6000]}"
    )
    try:
        from google import genai
        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini RAG answer failed: {e}")
        return _fallback_answer(query, contexts)


def _fallback_answer(query: str, contexts: List[Dict[str, Any]]) -> str:
    if not contexts:
        return "No relevant context found. Please upload documents and index them first."
    top = contexts[0]
    return f"Based on '{top['filename']}' (relevance: {top['score']}):\n\n{top['text']}"