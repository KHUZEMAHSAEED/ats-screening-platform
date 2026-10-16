import pytest
import io
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.models import Job, ScreeningCriteria

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="module")
def auth_headers(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "admin@example.com",
        "password": "AdminPass123!"
    })
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_duplicate_resume_detection(client, auth_headers):
    jobs = client.get("/api/v1/jobs", headers=auth_headers).json()["items"]
    job_id = jobs[0]["id"]
    
    # Create synthetic test PDF
    pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
    file_tuple = ("files", ("test_candidate_dup.pdf", io.BytesIO(pdf_content), "application/pdf"))

    # Upload first time
    res1 = client.post("/api/v1/resumes/upload", data={"job_id": job_id}, files=[file_tuple], headers=auth_headers)
    assert res1.status_code == 200

    # Upload exact same bytes again for the same job
    file_tuple2 = ("files", ("test_candidate_dup.pdf", io.BytesIO(pdf_content), "application/pdf"))
    res2 = client.post("/api/v1/resumes/upload", data={"job_id": job_id}, files=[file_tuple2], headers=auth_headers)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["duplicates_detected"] == 1
    assert data2["items"][0]["status"] == "duplicate"

def test_corrupted_document_handling(client, auth_headers):
    jobs = client.get("/api/v1/jobs", headers=auth_headers).json()["items"]
    job_id = jobs[0]["id"]

    # File with invalid header
    corrupt_content = b"THIS IS NOT A VALID PDF OR DOCX DOCUMENT"
    file_tuple = ("files", ("corrupt.pdf", io.BytesIO(corrupt_content), "application/pdf"))

    res = client.post("/api/v1/resumes/upload", data={"job_id": job_id}, files=[file_tuple], headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["failed_files"] == 1
    assert "invalid PDF magic header" in data["items"][0]["error"]

def test_csv_export_endpoint(client, auth_headers):
    res = client.get("/api/v1/export/candidates.csv", headers=auth_headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "Application ID,Job Title,Job Department" in res.text
