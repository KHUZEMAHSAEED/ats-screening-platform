import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models import HRDecisionType

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

def test_rejection_requires_confirmation(client, auth_headers):
    # Fetch an application
    apps = client.get("/api/v1/candidates", headers=auth_headers).json()["items"]
    if not apps:
        pytest.skip("No candidate applications present")

    app_id = apps[0]["application_id"]

    # Attempt rejection with confirmed=False
    payload = {
        "decision": HRDecisionType.REJECTED.value,
        "reason": "Does not possess needed qualifications",
        "confirmed": False
    }
    res = client.post(f"/api/v1/applications/{app_id}/decide", json=payload, headers=auth_headers)
    assert res.status_code == 400
    assert "Explicit user confirmation is mandatory" in res.json()["detail"]

def test_rejection_requires_reason(client, auth_headers):
    apps = client.get("/api/v1/candidates", headers=auth_headers).json()["items"]
    if not apps:
        pytest.skip("No candidate applications present")

    app_id = apps[0]["application_id"]

    # Attempt rejection with empty reason
    payload = {
        "decision": HRDecisionType.REJECTED.value,
        "reason": "",
        "confirmed": True
    }
    res = client.post(f"/api/v1/applications/{app_id}/decide", json=payload, headers=auth_headers)
    assert res.status_code == 400
    assert "reason" in res.json()["detail"]

def test_successful_human_decision_and_audit(client, auth_headers):
    apps = client.get("/api/v1/candidates", headers=auth_headers).json()["items"]
    if not apps:
        pytest.skip("No candidate applications present")

    app_id = apps[0]["application_id"]

    payload = {
        "decision": HRDecisionType.ON_HOLD.value,
        "reason": "Awaiting second technical panel interview schedule",
        "confirmed": True
    }
    res = client.post(f"/api/v1/applications/{app_id}/decide", json=payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["decision"] == HRDecisionType.ON_HOLD.value
    assert data["reviewer_name"] == "HR Operations Lead"

    # Verify audit log recorded
    audit_res = client.get(f"/api/v1/audit?application_id={app_id}", headers=auth_headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()["items"]
    assert any("HR_DECISION_ON_HOLD" in l["action"] for l in logs)
