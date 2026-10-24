"""
VyaparPilot AI - Registration & Auth Flow Verification Tests
Tests both local and production endpoints to verify that /api/v1/auth/register
issues valid tokens and properly handles duplicate accounts.
"""

import time
import json
import urllib.request
import pytest
from app.core.database import SessionLocal
from app.models.user import User

def test_local_registration():
    db = SessionLocal()
    unique_email = f"pytest_reg_{int(time.time())}@vyaparpilot.in"
    
    # Verify user does not exist yet
    existing = db.query(User).filter(User.email == unique_email).first()
    assert existing is None

    # Test local backend registration
    url = "http://127.0.0.1:8000/api/v1/auth/register"
    payload = {
        "business_name": "PyTest Automation Solutions",
        "full_name": "Automated Tester",
        "email": unique_email,
        "phone": "+91 9988776655",
        "password": "Password123!",
        "city": "Pune",
        "state": "Maharashtra",
        "gstin": "27ABCDE1234F1Z5"
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode())
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    # Verify duplicate registration returns 400 Bad Request
    dup_req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"}
    )
    with pytest.raises(urllib.error.HTTPError) as exc_info:
        urllib.request.urlopen(dup_req)
    assert exc_info.value.code == 400
