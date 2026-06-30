import os
import io
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# EasyOCR is heavy; lazy-load it
_reader = None


def get_reader():
    global _reader
    if _reader is None:
        import easyocr
        _reader = easyocr.Reader(["en", "hi"], gpu=False)
    return _reader


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF using PyPDF2 first, then EasyOCR for image-based pages."""
    text_parts = []

    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        for page_num, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            text_parts.append(page_text.strip())
    except Exception as e:
        logger.warning(f"PyPDF2 extraction failed: {e}")

    combined = "\n\n".join(filter(None, text_parts))

    # If very little text extracted, try OCR on rendered pages
    if len(combined.strip()) < 100:
        try:
            combined = _ocr_pdf_pages(file_bytes)
        except Exception as e:
            logger.warning(f"OCR fallback failed: {e}")

    return combined or "Text extraction failed or document is empty."


def _ocr_pdf_pages(file_bytes: bytes) -> str:
    """Render PDF pages as images and run EasyOCR."""
    try:
        import fitz  # PyMuPDF, optional
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        texts = []
        for page in doc:
            pix = page.get_pixmap(dpi=150)
            img_bytes = pix.tobytes("png")
            texts.append(_ocr_image_bytes(img_bytes))
        return "\n\n".join(texts)
    except ImportError:
        logger.info("PyMuPDF not available, skipping page-level OCR")
        return ""


def _ocr_image_bytes(image_bytes: bytes) -> str:
    try:
        reader = get_reader()
        results = reader.readtext(image_bytes, detail=0, paragraph=True)
        return " ".join(results)
    except Exception as e:
        logger.error(f"EasyOCR failed: {e}")
        return ""


def extract_text_from_image(file_bytes: bytes) -> str:
    """Run EasyOCR on an image file."""
    return _ocr_image_bytes(file_bytes)


def generate_ai_summary(text: str, case_context: Optional[str] = None) -> str:
    """Use OpenAI to summarise extracted text in Indian legal context."""
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        return _fallback_summary(text)

    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_key)

        context_hint = f"\nCase context: {case_context}" if case_context else ""
        prompt = (
            "You are a senior Indian legal assistant. Summarise the following legal document "
            "in 3–5 concise bullet points. Focus on: parties involved, relevant IPC sections, "
            "key facts, legal arguments, and any orders or directions given. "
            f"Use plain language suitable for a cause-list summary.{context_hint}\n\n"
            f"Document text:\n{text[:8000]}"
        )

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600,
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"OpenAI summary failed: {e}")
        return _fallback_summary(text)


def _fallback_summary(text: str) -> str:
    """Simple extractive fallback when OpenAI is unavailable."""
    sentences = [s.strip() for s in text.replace("\n", " ").split(".") if len(s.strip()) > 40]
    top = sentences[:5]
    if not top:
        return "Summary not available. Please review the document manually."
    return "• " + "\n• ".join(top)
