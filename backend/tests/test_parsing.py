import pytest
import io
from pathlib import Path
from app.services.parsing.base import parse_resume_document
from app.services.parsing.extractor import (
    extract_email, extract_phone, extract_candidate_name, extract_skills,
    extract_experience_and_tenure, extract_education
)
from app.core.file_validator import validate_resume_file
from fastapi import UploadFile, HTTPException

def test_extract_email_and_phone():
    sample_text = "Contact Alex at alex.doe@subdomain.example.com or mobile (555) 432-1098."
    assert extract_email(sample_text) == "alex.doe@subdomain.example.com"
    assert extract_phone(sample_text) == "(555) 432-1098"

def test_extract_candidate_name():
    sample_text = "Jane Doe\nPrincipal Software Architect\nemail: jane@example.com"
    name = extract_candidate_name(sample_text, email="jane@example.com")
    assert name == "Jane Doe"

def test_extract_skills_boundary_safety():
    # Make sure 'Java' does not false match inside 'JavaScript'
    sample_text = "Proficient in JavaScript and FastAPI."
    skills = extract_skills(sample_text)
    assert "JavaScript" in skills
    assert "FastAPI" in skills
    assert "Java" not in skills

def test_extract_experience_duration():
    sample_text = "Software Engineer at Acme Corp (2018 - 2022). Prior Role (2016 - 2018)."
    items, total = extract_experience_and_tenure(sample_text)
    assert total >= 6.0

def test_file_validation_empty_file():
    empty_file = UploadFile(filename="empty.pdf", file=io.BytesIO(b""))
    with pytest.raises(HTTPException) as exc:
        validate_resume_file(empty_file, b"")
    assert exc.value.status_code == 400

def test_file_validation_fake_pdf():
    fake_file = UploadFile(filename="malicious.pdf", file=io.BytesIO(b"NOT_A_REAL_PDF_HEADER"))
    with pytest.raises(HTTPException) as exc:
        validate_resume_file(fake_file, b"NOT_A_REAL_PDF_HEADER")
    assert "invalid PDF magic header" in exc.value.detail
