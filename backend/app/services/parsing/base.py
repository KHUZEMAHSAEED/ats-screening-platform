from typing import Dict, Any, List
from app.services.parsing.pdf_parser import extract_text_from_pdf
from app.services.parsing.docx_parser import extract_text_from_docx
from app.services.parsing.ocr_engine import run_ocr_on_pdf
from app.services.parsing.extractor import parse_raw_text_heuristics
from app.services.parsing.llm_parser import enrich_with_llm

def parse_resume_document(file_path: str, mime_type: str) -> Dict[str, Any]:
    """
    Modular resume parsing pipeline.
    Routes to PDF, DOCX, or OCR fallback and extracts structured data.
    """
    raw_text = ""
    warnings: List[str] = []
    parsing_method = "Deterministic Parser"

    if mime_type == "application/pdf":
        raw_text, pdf_warnings, is_scanned = extract_text_from_pdf(file_path)
        warnings.extend(pdf_warnings)
        parsing_method = "PyMuPDF"

        if is_scanned or len(raw_text.strip()) < 50:
            ocr_text, ocr_warnings = run_ocr_on_pdf(file_path)
            warnings.extend(ocr_warnings)
            if ocr_text:
                raw_text = ocr_text
                parsing_method = "PyMuPDF+OCR"

    elif "wordprocessingml" in mime_type or file_path.lower().endswith(".docx"):
        raw_text, docx_warnings = extract_text_from_docx(file_path)
        warnings.extend(docx_warnings)
        parsing_method = "python-docx"

    else:
        warnings.append(f"Unrecognized MIME type: {mime_type}")

    # Extract structured candidate information
    parsed_info = parse_raw_text_heuristics(raw_text)
    parsed_info["extracted_text"] = raw_text
    parsed_info["parsing_method"] = parsing_method
    parsed_info["warnings"].extend(warnings)

    # Optional LLM enrichment if configured
    final_parsed = enrich_with_llm(raw_text, parsed_info)
    return final_parsed
