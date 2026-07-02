import os
import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)

_reader = None


def get_reader():
    global _reader
    if _reader is None:
        import easyocr
        _reader = easyocr.Reader(["en", "hi"], gpu=False)
    return _reader


def extract_text_from_pdf(file_bytes: bytes) -> str:
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
    if len(combined.strip()) < 100:
        try:
            combined = _ocr_pdf_pages(file_bytes)
        except Exception as e:
            logger.warning(f"OCR fallback failed: {e}")
    return combined or "Text extraction failed or document is empty."


def _ocr_pdf_pages(file_bytes: bytes) -> str:
    try:
        import fitz
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
    return _ocr_image_bytes(file_bytes)


def generate_ai_summary(text: str, case_context=None) -> str:
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        return _fallback_summary(text)
    try:
        import google.generativeai as genai
        genai.configure(api_key=gemini_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        context_hint = f"\nCase context: {case_context}" if case_context else ""
        prompt = (
            "You are a senior Indian legal assistant. Summarise the following legal document "
            "in 3-5 concise bullet points. Focus on: parties involved, relevant IPC sections, "
            "key facts, legal arguments, and any orders or directions given. "
            f"Use plain language suitable for a cause-list summary.{context_hint}\n\n"
            f"Document text:\n{text[:8000]}"
        )
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini summary failed: {e}")
        return _fallback_summary(text)


def _fallback_summary(text: str) -> str:
    sentences = [s.strip() for s in text.replace("\n", " ").split(".") if len(s.strip()) > 40]
    top = sentences[:5]
    if not top:
        return "Summary not available. Please review the document manually."
    return "- " + "\n- ".join(top)