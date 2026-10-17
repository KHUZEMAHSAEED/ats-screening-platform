import io
import uuid
import pytest
from fastapi.testclient import TestClient
import pymupdf as fitz
from app.main import app
from app.models import HRDecisionType, RecommendationStatus

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="module")
def auth_token(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "admin@example.com",
        "password": "AdminPass123!"
    })
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}

def create_synthetic_pdf(name: str, email: str, skills: list, experience_text: str) -> bytes:
    """Generate a clean synthetic PDF in memory with PyMuPDF."""
    doc = fitz.open()
    page = doc.new_page(width=595, height=842) # A4
    rect = fitz.Rect(50, 50, 545, 792)
    content = (
        f"{name}\n"
        f"Email: {email} | Phone: (555) 019-2834 | Location: Austin, TX\n\n"
        f"PROFESSIONAL SUMMARY\n"
        f"Experienced software engineer with expertise in {', '.join(skills)}.\n\n"
        f"WORK EXPERIENCE\n"
        f"Senior Software Engineer | TechCorp Inc.\n"
        f"2019 - 2024 (5 years)\n"
        f"- {experience_text}\n"
        f"- Implemented microservices using Python, FastAPI, and Docker.\n\n"
        f"EDUCATION\n"
        f"Bachelor of Science in Computer Science | University of Technology (2015 - 2019)\n"
    )
    page.insert_textbox(rect, content, fontsize=11, fontname="helv", color=(0.1, 0.1, 0.1))
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes

def test_full_critical_screening_workflow(client, auth_headers):
    """
    End-to-End Critical Workflow Test:
    1. Create a new Job Requisition with explicit criteria & dynamic weights.
    2. Upload synthetic candidate resume and verify parsing & validation.
    3. Verify deterministic scoring, explainability evidence, and advisory status.
    4. Verify Blind Screening redaction on candidate dossier.
    5. Attempt automated/unconfirmed rejection (verify HITL guard blocks it).
    6. Commit authorized human decision with required reason.
    7. Verify immutable audit log trail captures reviewer identity and action.
    8. Preview transactional candidate communication with HITL template interpolation.
    9. Send communication and verify communication history logging.
    """
    unique_suffix = uuid.uuid4().hex[:8]

    # Step 1: Create Job Requisition
    job_payload = {
        "title": f"Staff Infrastructure Engineer {unique_suffix}",
        "department": "Platform Engineering",
        "description": "Looking for a cloud infrastructure engineer with strong Python, FastAPI, and Docker skills.",
        "location": "Remote",
        "work_arrangement": "Remote",
        "criteria": {
            "mandatory_skills": [
                {"name": "Python", "min_years": 3.0, "synonyms": ["py", "python3"]},
                {"name": "Docker", "min_years": 2.0, "synonyms": ["containerization"]}
            ],
            "preferred_skills": [
                {"name": "FastAPI", "weight": 1.0, "synonyms": ["fast-api"]},
                {"name": "Kubernetes", "weight": 1.0, "synonyms": ["k8s"]}
            ],
            "min_experience_years": 4.0,
            "required_qualifications": [
                {"degree": "Bachelor", "field": "Computer Science"}
            ],
            "weights": {
                "mandatory": 50,
                "preferred": 25,
                "experience": 15,
                "qualifications": 10
            }
        }
    }

    job_res = client.post("/api/v1/jobs", json=job_payload, headers=auth_headers)
    assert job_res.status_code == 201, f"Job creation failed: {job_res.text}"
    job_data = job_res.json()
    job_id = job_data["id"]
    assert job_data["title"] == job_payload["title"]

    # Step 2: Upload Synthetic Resume
    candidate_name = "Taylor Jordan"
    candidate_email = f"taylor.jordan.{unique_suffix}@example-enterprise.com"
    pdf_bytes = create_synthetic_pdf(
        name=candidate_name,
        email=candidate_email,
        skills=["Python", "FastAPI", "Docker"],
        experience_text="Designed resilient backend APIs in Python and containerized workloads in Docker."
    )

    file_tuple = ("files", (f"resume_{unique_suffix}.pdf", io.BytesIO(pdf_bytes), "application/pdf"))
    upload_res = client.post(
        "/api/v1/resumes/upload",
        data={"job_id": job_id},
        files=[file_tuple],
        headers=auth_headers
    )
    assert upload_res.status_code == 200, f"Resume upload failed: {upload_res.text}"
    upload_data = upload_res.json()
    assert upload_data["total_files"] == 1
    assert upload_data["failed_files"] == 0
    application_id = upload_data["items"][0]["application_id"]
    assert application_id is not None

    # Step 3: Verify Deterministic Scoring & Explainability
    import time
    dossier = None
    candidate_json = {}
    for i in range(50):
        dossier_res = client.get(f"/api/v1/candidates/{application_id}", headers=auth_headers)
        assert dossier_res.status_code == 200, f"Candidate dossier fetch failed: {dossier_res.text}"
        candidate_json = dossier_res.json()
        if candidate_json.get("match_result") is not None:
            dossier = candidate_json
            break
        time.sleep(0.1)

    assert dossier is not None, f"Async worker did not complete resume processing in time. Last state: {candidate_json}"
    assert dossier["candidate_name"] == candidate_name
    assert dossier["email"] == candidate_email
    assert dossier["recommendation_status"] in [
        RecommendationStatus.RECOMMENDED_FOR_SHORTLISTING.value,
        RecommendationStatus.NEEDS_HR_REVIEW.value
    ]
    # Human decision must be strictly PENDING_REVIEW initially
    assert dossier["hr_decision"] == HRDecisionType.PENDING_REVIEW.value

    # Verify score breakdown & evidence grounding
    match_result = dossier["match_result"]
    assert match_result is not None
    assert match_result["overall_score"] > 50.0
    assert "score_breakdown" in match_result
    assert len(match_result["matched_mandatory"]) >= 1
    assert "explanation" in match_result
    assert "HUMAN OVERSIGHT NOTICE" in match_result["explanation"]

    # Step 4: Verify Blind Screening Mode
    blind_res = client.get(f"/api/v1/candidates/{application_id}?blind_mode=true", headers=auth_headers)
    assert blind_res.status_code == 200
    blind_dossier = blind_res.json()
    assert "Candidate #" in blind_dossier["candidate_name"]
    assert blind_dossier["email"] == "[REDACTED (Blind Review Mode)]"
    assert blind_dossier["phone"] == "[REDACTED]"
    assert blind_dossier["location"] == "[REDACTED]"
    if blind_dossier.get("parsed_resume") and blind_dossier["parsed_resume"].get("education"):
        for edu in blind_dossier["parsed_resume"]["education"]:
            assert edu["institution"] == "[REDACTED University/College]"

    # Step 5: Verify HITL Guardrail Blocks Unconfirmed or Reason-less Decisions
    invalid_decide_res = client.post(
        f"/api/v1/applications/{application_id}/decide",
        json={
            "decision": HRDecisionType.REJECTED.value,
            "reason": "", # Missing required reason
            "confirmed": False # Unconfirmed
        },
        headers=auth_headers
    )
    assert invalid_decide_res.status_code == 400
    assert "confirmation is mandatory" in invalid_decide_res.json()["detail"]

    # Step 6: Commit Authorized Human Decision
    valid_decide_res = client.post(
        f"/api/v1/applications/{application_id}/decide",
        json={
            "decision": HRDecisionType.SHORTLISTED.value,
            "reason": "Strong Python/FastAPI production background and containerization experience.",
            "confirmed": True
        },
        headers=auth_headers
    )
    assert valid_decide_res.status_code == 200
    decision_data = valid_decide_res.json()
    assert decision_data["decision"] == HRDecisionType.SHORTLISTED.value
    assert decision_data["reviewer_name"] == "HR Operations Lead"

    # Step 7: Verify Audit Log captures Reviewer and Action
    audit_res = client.get(f"/api/v1/audit?application_id={application_id}", headers=auth_headers)
    assert audit_res.status_code == 200
    audit_entries = audit_res.json()["items"]
    actions = [entry["action"] for entry in audit_entries]
    assert "RESUME_UPLOADED" in actions
    assert "HR_DECISION_SHORTLISTED" in actions
    shortlist_entry = next(e for e in audit_entries if e["action"] == "HR_DECISION_SHORTLISTED")
    assert shortlist_entry["user_email"] == "admin@example.com"
    assert shortlist_entry["details"]["decision"] == "SHORTLISTED"

    # Step 8: Preview Candidate Communication with Variable Interpolation
    preview_res = client.post(
        "/api/v1/communications/preview",
        json={
            "application_id": application_id,
            "template_type": "INTERVIEW_INVITATION"
        },
        headers=auth_headers
    )
    assert preview_res.status_code == 200
    preview_data = preview_res.json()
    assert candidate_name in preview_data["body"]
    assert job_payload["title"] in preview_data["body"]
    assert preview_data["recipient_email"] == candidate_email

    # Step 9: Send Candidate Email & Verify Log
    send_res = client.post(
        "/api/v1/communications/send",
        json={
            "application_id": application_id,
            "template_type": "INTERVIEW_INVITATION",
            "subject": preview_data["subject"],
            "body": preview_data["body"],
            "recipient_email": candidate_email,
            "recipient_name": candidate_name,
            "confirmed_by_recruiter": True
        },
        headers=auth_headers
    )
    assert send_res.status_code == 200
    send_data = send_res.json()
    assert send_data["status"] == "SENT"
    assert send_data["recipient_email"] == candidate_email

    # Step 10: Verify Communication History
    comm_history_res = client.get(f"/api/v1/communications/{application_id}", headers=auth_headers)
    assert comm_history_res.status_code == 200
    comm_list = comm_history_res.json()
    assert len(comm_list) >= 1
    assert comm_list[0]["template_type"] == "INTERVIEW_INVITATION"
