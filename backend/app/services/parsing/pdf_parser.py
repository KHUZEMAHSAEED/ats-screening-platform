import pymupdf as fitz
from typing import Tuple, List
import io
from app.core.config import settings

def extract_text_from_pdf(file_path: str) -> Tuple[str, List[str], bool]:
    """
    Extracts text from a PDF file using PyMuPDF.
    Returns: (extracted_text, warnings, is_scanned)
    """
    warnings: List[str] = []
    text_parts: List[str] = []
    is_scanned = False

    try:
        doc = fitz.open(file_path)
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text")
            if text:
                text_parts.append(text.strip())

        full_text = "\n\n".join(text_parts).strip()

        # If very little or no text extracted from a multi-page document, likely scanned
        if len(full_text) < 60 and len(doc) > 0:
            is_scanned = True
            warnings.append("Document appears to be scanned or contains image-only pages. Attempting OCR fallback.")

        doc.close()
        return full_text, warnings, is_scanned

    except Exception as e:
        warnings.append(f"PyMuPDF error reading document: {str(e)}")
        return "", warnings, False
