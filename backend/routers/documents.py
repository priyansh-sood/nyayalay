import os
import uuid
import aiofiles
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session

from database import get_db
from models import Document, Case, User
from schemas import DocumentOut
from routers.auth import get_current_user
from services.ocr import extract_text_from_pdf, extract_text_from_image, generate_ai_summary
from services.rag import index_document

router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/tmp/legal_uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_MIME = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/webp",
}

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


def _process_document_background(doc_id: int, file_bytes: bytes, mime_type: str, db_session):
    """Run OCR + AI summary + Pinecone indexing in background."""
    from database import SessionLocal
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            return

        # OCR
        if mime_type == "application/pdf":
            text = extract_text_from_pdf(file_bytes)
        else:
            text = extract_text_from_image(file_bytes)

        doc.ocr_text = text

        # AI Summary
        case = db.query(Case).filter(Case.id == doc.case_id).first()
        case_ctx = f"{case.case_number} – {case.petitioner} vs {case.respondent}" if case else None
        doc.ai_summary = generate_ai_summary(text, case_ctx)

        # Pinecone
        if text and len(text.strip()) > 50:
            success = index_document(
                doc_id=doc_id,
                case_id=doc.case_id,
                text=text,
                metadata={
                    "filename": doc.original_filename,
                    "case_id": doc.case_id,
                    "doc_id": doc_id,
                },
            )
            doc.pinecone_indexed = success

        db.commit()
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Background doc processing failed: {e}")
    finally:
        db.close()


@router.post("/upload/{case_id}", response_model=DocumentOut, status_code=201)
async def upload_document(
    case_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate case exists
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Validate mime type
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{content_type}' not supported. Allowed: PDF, JPEG, PNG, TIFF, WEBP",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 20MB limit")

    # Save to disk
    ext = Path(file.filename or "upload").suffix or ".bin"
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / unique_name

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(file_bytes)

    # Create DB record
    doc = Document(
        case_id=case_id,
        filename=unique_name,
        original_filename=file.filename or unique_name,
        file_path=str(file_path),
        file_size=len(file_bytes),
        mime_type=content_type,
        uploaded_by_id=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Process in background
    background_tasks.add_task(
        _process_document_background, doc.id, file_bytes, content_type, db
    )

    return DocumentOut.model_validate(doc)


@router.get("/{doc_id}", response_model=DocumentOut)
def get_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentOut.model_validate(doc)


@router.delete("/{doc_id}", status_code=204)
def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove from disk
    try:
        Path(doc.file_path).unlink(missing_ok=True)
    except Exception:
        pass

    db.delete(doc)
    db.commit()


@router.get("/{doc_id}/text")
def get_document_text(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "doc_id": doc_id,
        "ocr_text": doc.ocr_text,
        "ai_summary": doc.ai_summary,
        "pinecone_indexed": doc.pinecone_indexed,
    }
