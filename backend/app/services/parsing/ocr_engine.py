import pymupdf as fitz
from PIL import Image
import io
import shutil
from typing import Tuple, List
from app.core.config import settings

def run_ocr_on_pdf(file_path: str) -> Tuple[str, List[str]]:
    """
    Renders pages of a PDF to images and executes OCR.
    Handles missing Tesseract binary gracefully.
    """
    warnings: List[str] = []
    text_parts: List[str] = []

    if not settings.ENABLE_OCR:
        warnings.append("OCR processing is disabled in configuration.")
        return "", warnings

    # Check if tesseract is available
    tesseract_available = False
    try:
        import pytesseract
        if settings.TESSERACT_CMD:
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
        elif shutil.which("tesseract"):
            tesseract_available = True
        
        # Test call
        try:
            pytesseract.get_tesseract_version()
            tesseract_available = True
        except Exception:
            tesseract_available = False
    except ImportError:
        warnings.append("pytesseract package not installed.")
        return "", warnings

    if not tesseract_available:
        warnings.append("OCR binary (tesseract) not found on host system. Scanned document flagged for manual HR review.")
        return "", warnings

    try:
        import pytesseract
        doc = fitz.open(file_path)
        for page_num in range(len(doc)):
            page = doc[page_num]
            pix = page.get_pixmap(dpi=200)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            page_text = pytesseract.image_to_string(img)
            if page_text and page_text.strip():
                text_parts.append(page_text.strip())
        doc.close()

        full_text = "\n\n".join(text_parts).strip()
        if not full_text:
            warnings.append("OCR ran but was unable to identify legible text on the scanned pages.")
        return full_text, warnings
    except Exception as e:
        warnings.append(f"OCR execution encountered an error: {str(e)}")
        return "", warnings
