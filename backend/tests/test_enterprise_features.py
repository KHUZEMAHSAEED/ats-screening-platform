import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.webhook_service import sign_payload

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

def test_blind_screening_list(client, auth_headers):
    # Test normal listing
    res_normal = client.get("/api/v1/candidates?blind_mode=false", headers=auth_headers)
    assert res_normal.status_code == 200
    normal_data = res_normal.json()
    assert normal_data["total"] >= 1
    sample = normal_data["items"][0]
    assert sample["email"] is not None

    # Test blind screening listing
    res_blind = client.get("/api/v1/candidates?blind_mode=true", headers=auth_headers)
    assert res_blind.status_code == 200
    blind_data = res_blind.json()
    assert len(blind_data["items"]) >= 1
    blind_sample = blind_data["items"][0]
    assert "Candidate #" in blind_sample["candidate_name"]
    assert blind_sample["email"] is None
    assert blind_sample["phone"] is None

def test_blind_screening_detail(client, auth_headers):
    candidates = client.get("/api/v1/candidates", headers=auth_headers).json()["items"]
    app_id = candidates[0]["application_id"]

    # Blind mode detail
    res = client.get(f"/api/v1/candidates/{app_id}?blind_mode=true", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "Candidate #" in data["candidate_name"]
    assert "[REDACTED" in data["email"]
    assert "[REDACTED]" in data["phone"]
    assert "[REDACTED]" in data["location"]
    
    # Check education masking
    if data["parsed_data"] and data["parsed_data"]["education"]:
        for edu in data["parsed_data"]["education"]:
            assert edu["institution"] == "[REDACTED University/College]"

def test_compliance_metrics(client, auth_headers):
    res = client.get("/api/v1/compliance/metrics", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_evaluated" in data
    assert "selection_rate" in data
    assert "disparate_impact_ratio" in data
    assert data["four_fifths_rule_status"] in ["COMPLIANT", "POTENTIAL_DISPARATE_IMPACT"]
    assert "EEOC Uniform Guidelines" in data["regulatory_frameworks"][0]
    assert "EU AI Act" in data["regulatory_frameworks"][1]
    assert "recommendation_distribution" in data
    assert "decision_distribution" in data

def test_interview_guide_generation(client, auth_headers):
    candidates = client.get("/api/v1/candidates", headers=auth_headers).json()["items"]
    app_id = candidates[0]["application_id"]

    # Generate guide
    res = client.post(f"/api/v1/interviews/{app_id}/generate", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["application_id"] == app_id
    assert len(data["questions"]) >= 1
    q = data["questions"][0]
    assert "question" in q
    assert "target_gap" in q
    assert "category" in q
    assert "suggested_rubric" in q
    assert "Poor:" in q["suggested_rubric"] or "Score" in q["suggested_rubric"] or len(q["suggested_rubric"]) > 10

    # Fetch existing guide
    res_get = client.get(f"/api/v1/interviews/{app_id}", headers=auth_headers)
    assert res_get.status_code == 200
    assert len(res_get.json()["questions"]) == len(data["questions"])

def test_webhook_lifecycle_and_signing(client, auth_headers):
    # Test payload signing helper
    secret = "ats_super_secret_test_key"
    payload = '{"event": "candidate.screened", "candidate_id": "123"}'
    sig = sign_payload(payload, secret)
    assert len(sig) == 64  # SHA-256 hex length

    # Register webhook
    webhook_in = {
        "url": "https://example.com/api/ats-webhook",
        "description": "Enterprise HRIS integration",
        "event_types": ["candidate.screened", "hr.decision.committed"]
    }
    create_res = client.post("/api/v1/webhooks", json=webhook_in, headers=auth_headers)
    assert create_res.status_code == 201
    webhook_data = create_res.json()
    assert webhook_data["url"] == webhook_in["url"]
    assert webhook_data["is_active"] is True
    assert "secret" in webhook_data
    webhook_id = webhook_data["id"]

    # List webhooks
    list_res = client.get("/api/v1/webhooks", headers=auth_headers)
    assert list_res.status_code == 200
    matching = [w for w in list_res.json() if w["id"] == webhook_id]
    assert len(matching) == 1

    # Delete webhook
    del_res = client.delete(f"/api/v1/webhooks/{webhook_id}", headers=auth_headers)
    assert del_res.status_code == 204

    # Verify deletion
    list_after = client.get("/api/v1/webhooks", headers=auth_headers)
    matching_after = [w for w in list_after.json() if w["id"] == webhook_id]
    assert len(matching_after) == 0

def test_talent_rediscovery(client, auth_headers):
    jobs = client.get("/api/v1/jobs", headers=auth_headers).json()["items"]
    assert len(jobs) >= 1
    target_job = jobs[0]

    res = client.get(f"/api/v1/rediscovery/{target_job['id']}?min_score=0", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["job_id"] == target_job["id"]
    assert "candidates" in data
    assert isinstance(data["candidates"], list)

def test_candidate_comparison_matrix(client, auth_headers):
    candidates = client.get("/api/v1/candidates", headers=auth_headers).json()["items"]
    assert len(candidates) >= 2
    app_ids = [candidates[0]["application_id"], candidates[1]["application_id"]]

    # Normal comparison
    res = client.post("/api/v1/candidates/compare?blind_mode=false", json={"application_ids": app_ids}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["candidates"]) == 2
    assert "criteria_matrix" in data
    assert len(data["criteria_matrix"]) >= 1
    assert "executive_summary" in data
    assert len(data["executive_summary"]) > 20

    # Test blind mode comparison
    res_blind = client.post("/api/v1/candidates/compare?blind_mode=true", json={"application_ids": app_ids}, headers=auth_headers)
    assert res_blind.status_code == 200
    blind_data = res_blind.json()
    assert "Candidate #" in blind_data["candidates"][0]["candidate_name"]
    assert blind_data["candidates"][0]["email"] is None

    # Test validation: invalid candidate count
    res_invalid = client.post("/api/v1/candidates/compare", json={"application_ids": [app_ids[0]]}, headers=auth_headers)
    assert res_invalid.status_code == 422
