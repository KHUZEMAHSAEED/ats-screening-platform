import hashlib
import io
import re
import zipfile
from typing import Tuple
from fastapi import HTTPException, UploadFile, status
from app.core.config import settings

PDF_MAGIC = b"%PDF-"
ZIP_MAGIC = b"PK\x03\x04"

def sanitize_filename(filename: str) -> str:
    # Remove directory paths and problematic characters
    clean_name = re.sub(r"[^\w\s\.-]", "", filename).strip()
    return clean_name or "resume_document"

def compute_file_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()

def validate_resume_file(file: UploadFile, content: bytes) -> Tuple[str, str]:
    """
    Validates file size, file extension, and magic bytes.
    Returns: (sanitized_filename, mime_type)
    """
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File '{file.filename}' is empty."
        )

    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum limit of {settings.MAX_FILE_SIZE_MB}MB."
        )

    orig_name = file.filename or "unknown"
    clean_name = sanitize_filename(orig_name)
    lower_name = clean_name.lower()

    if lower_name.endswith(".pdf"):
        if not content.startswith(PDF_MAGIC):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{clean_name}' has .pdf extension but invalid PDF magic header."
            )
        return clean_name, "application/pdf"

    elif lower_name.endswith(".docx"):
        if not content.startswith(ZIP_MAGIC):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{clean_name}' has .docx extension but invalid ZIP/DOCX header."
            )
        # Deep inspection of docx archive
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as zf:
                namelist = zf.namelist()
                if "word/document.xml" not in namelist and "[Content_Types].xml" not in namelist:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"File '{clean_name}' is not a valid Microsoft Word .docx document structure."
                    )
        except zipfile.BadZipFile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{clean_name}' is corrupted or not a valid .docx document."
            )
        return clean_name, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Only PDF and DOCX files are allowed."
        )
