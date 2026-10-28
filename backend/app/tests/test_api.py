import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.business import Business
from app.models.user import User
from app.models.settings import BusinessSettings
from app.services.pricing_engine import calculate_quotation_totals
from app.schemas.quotation import QuotationItemCreate
from app.services.matching_engine import match_enquiry_item_to_catalogue
from app.schemas.enquiry import ExtractedItem
from app.services.roi_service import compute_business_roi_summary, record_roi_measurement
from app.schemas.roi import ProductivityMeasurementCreate

client = TestClient(app)

def test_health_check():
    response = client.get("/api/v1/health/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database_connected"] is True
    assert "ai_engine_mode" in data

def test_auth_login():
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "demo@vyaparpilot.in", "password": "demoPassword123!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_auth_demo_login():
    response = client.post("/api/v1/auth/demo-login")
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data

def test_get_current_user_profile():
    # Login first
    login_res = client.post("/api/v1/auth/demo-login")
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/auth/me", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "demo@vyaparpilot.in"
    assert data["role"] == "owner"

def test_product_catalogue_listing():
    login_res = client.post("/api/v1/auth/demo-login")
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/products/?page=1&page_size=10", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 18
    assert len(data["items"]) <= 10

def test_deterministic_pricing_engine():
    items = [
        QuotationItemCreate(
            product_id=1,
            sku="IND-MTR-001",
            name="Test Motor",
            quantity=2.0,
            unit="PCS",
            unit_price=10000.0,
            unit_cost=8000.0,
            discount_pct=5.0
        )
    ]
    calc = calculate_quotation_totals(
        items=items,
        overall_discount_pct=0.0,
        tax_rate=18.0,
        tax_type="INTRA_STATE_GST",
        delivery_charge=500.0
    )
    # Line subtotal = 2 * 10,000 = 20,000 - 5% = 19,000
    assert calc.subtotal == 19000.0
    # Tax = 19,000 * 18% = 3,420 (CGST 1710, SGST 1710)
    assert calc.tax_amount == 3420.0
    assert calc.cgst_amount == 1710.0
    assert calc.sgst_amount == 1710.0
    # Grand total = 19,000 + 3,420 + 500 = 22,920
    assert calc.grand_total == 22920.0
    # Cost = 2 * 8000 = 16,000
    assert calc.total_cost == 16000.0
    # Gross profit = 19,000 - 16,000 = 3,000
    assert calc.estimated_gross_profit == 3000.0
    # Margin % = 3000 / 19000 = 15.79%
    assert round(calc.estimated_gross_margin_pct, 2) == 15.79

def test_pricing_guardrail_low_margin_warning():
    # Item sold below cost or with low margin
    items = [
        QuotationItemCreate(
            product_id=1,
            sku="IND-MTR-001",
            name="Discounted Motor",
            quantity=1.0,
            unit="PCS",
            unit_price=10000.0,
            unit_cost=9500.0,  # 5% margin, below 15% threshold!
            discount_pct=0.0
        )
    ]
    calc = calculate_quotation_totals(items=items)
    codes = [w.code for w in calc.warnings]
    assert "LOW_MARGIN" in codes or "LOW_OVERALL_MARGIN" in codes

def test_pricing_guardrail_unmatched_product():
    items = [
        QuotationItemCreate(
            product_id=None,
            sku=None,
            name="Unregistered Custom Sensor",
            quantity=1.0,
            unit="PCS",
            unit_price=5000.0,
            unit_cost=4000.0,
            verification_status="UNMATCHED"
        )
    ]
    calc = calculate_quotation_totals(items=items)
    codes = [w.code for w in calc.warnings]
    assert "UNMATCHED_PRODUCT" in codes

def test_roi_calculation_formulas():
    db = SessionLocal()
    biz = db.query(Business).filter(Business.slug == "apex-industrial-solutions").first()
    settings = db.query(BusinessSettings).filter(BusinessSettings.business_id == biz.id).first()

    meas = record_roi_measurement(
        db=db,
        business_id=biz.id,
        data=ProductivityMeasurementCreate(
            manual_baseline_seconds=2100.0,  # 35 min
            ai_processing_seconds=15.0,
            human_review_seconds=120.0,
            correction_seconds=30.0,
            fields_corrected_count=1,
            validation_errors_caught_count=1,
            is_demo_data=False,
            measurement_type="MEASURED"
        ),
        settings=settings
    )
    db.commit()

    # Time saved = 2100 - (15 + 120 + 30) = 1935 seconds
    assert meas.time_saved_seconds == 1935.0
    # % reduction = 1935 / 2100 * 100 = 92.14%
    assert round(meas.time_reduction_pct, 1) == 92.1
    # Labour value = 1935 / 3600 * 350 = 188.125
    assert round(meas.estimated_labour_value_saved, 1) == 188.1

    # Check summary calculation
    summary = compute_business_roi_summary(db, biz.id, settings)
    assert summary.total_quotations_processed >= 5
    assert summary.avg_manual_prep_time_minutes > 0
    assert summary.avg_ai_assisted_prep_time_minutes > 0
    assert summary.total_time_saved_hours > 0
    db.close()

def test_quotation_pdf_generation_endpoint():
    login_res = client.post("/api/v1/auth/demo-login")
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch first quotation
    quotes_res = client.get("/api/v1/quotations/", headers=headers)
    quote_id = quotes_res.json()["items"][0]["id"]

    pdf_res = client.get(f"/api/v1/quotations/{quote_id}/pdf", headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000  # Non-empty binary PDF stream
    assert pdf_res.content[:4] == b"%PDF"

def test_tenant_data_isolation():
    import uuid
    uid = uuid.uuid4().hex[:6]
    # Register a second business
    reg_res = client.post("/api/v1/auth/register", json={
        "business_name": f"Second Tenant {uid}",
        "full_name": "Second Tenant Owner",
        "email": f"owner_{uid}@secondtenant.com",
        "password": "SecretPassword123!",
        "phone": "9811122233"
    })
    assert reg_res.status_code == 200, f"Registration failed: {reg_res.text}"
    token_tenant_2 = reg_res.json()["access_token"]
    headers_tenant_2 = {"Authorization": f"Bearer {token_tenant_2}"}

    # Tenant 2 tries to access Tenant 1's products or quotations
    res = client.get("/api/v1/products/", headers=headers_tenant_2)
    assert res.status_code == 200
    assert res.json()["total"] == 4  # Brand new tenant has 4 starter products


    # Tenant 2 tries to fetch Tenant 1's quotation ID 1
    quote_res = client.get("/api/v1/quotations/1", headers=headers_tenant_2)
    assert quote_res.status_code == 404  # Scoped isolation returns 404!

def test_customer_and_product_creation():
    import uuid
    uid = uuid.uuid4().hex[:6]
    login_res = client.post("/api/v1/auth/demo-login")
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Create a customer
    cust_res = client.post("/api/v1/customers/", headers=headers, json={
        "name": f"Test Customer {uid}",
        "company_name": f"Enterprise Systems {uid}",
        "email": f"contact_{uid}@enterprisesys.com",
        "phone": "9876543210",
        "billing_address": "Plot 45, Industrial Zone",
        "shipping_address": "Plot 45, Industrial Zone",
        "gstin": "27AABCT3518Q1ZP",
        "state_code": "27"
    })
    assert cust_res.status_code == 201
    cust_data = cust_res.json()
    assert cust_data["name"] == f"Test Customer {uid}"
    
    # 2. Create a product
    prod_res = client.post("/api/v1/products/", headers=headers, json={
        "sku": f"TST-{uid.upper()}",
        "name": f"High Precision Servo Motor {uid}",
        "category": "Motors & Drives",
        "unit": "PCS",
        "unit_cost": 4200.0,
        "unit_selling_price": 5800.0,
        "stock_quantity": 25,
        "low_stock_threshold": 5,
        "tax_rate_percent": 18.0
    })
    assert prod_res.status_code == 201
    prod_data = prod_res.json()
    assert prod_data["sku"] == f"TST-{uid.upper()}"
    assert prod_data["stock_quantity"] == 25

def test_enquiry_ai_processing_workflow():
    login_res = client.post("/api/v1/auth/demo-login")
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Process an enquiry via the AI Extraction & Matching pipeline
    enquiry_payload = {
        "title": "Urgent Requirement - Motors and Cylinders",
        "source": "email",
        "raw_text": """
        Dear Apex Industrial,
        Please quote urgently for:
        1. 3 nos Three Phase Induction Motor 5HP 1440 RPM
        2. 10 pcs Pneumatic Cylinder 50mm Bore
        Delivery required at Pune MIDC site within 5 days.
        Thanks,
        Rajesh Sharma
        Precision Engineering Works
        Contact: 9822012345, rajesh@precisioneng.com
        """,
        "force_demo_mode": False
    }
    
    res = client.post("/api/v1/enquiries/process", headers=headers, json=enquiry_payload)
    assert res.status_code == 200
    data = res.json()
    assert "enquiry_id" in data
    assert "extracted_structure" in data
    assert "matched_items" in data
    assert len(data["matched_items"]) >= 1
    assert data["total_estimated_subtotal"] > 0
    assert data["ai_mode_used"] in ["OPENAI_LIVE_API", "GEMINI_LIVE_API", "VERIFIED_DEMO_ENGINE"]

def test_quotation_24h_acceptance_deadline_and_expiry():
    """
    Tests the complete 24-Hour Quotation Acceptance Deadline & Automatic Expiry workflow:
    1. Newly sent quotation receives 24h deadline & token.
    2. Retailer acceptance before deadline.
    3. Rejection before deadline.
    4. Auto-expiry after deadline passes.
    5. Rejection/Acceptance blocked after expiry.
    6. Multiple conflicting responses prevented.
    """
    from datetime import datetime, timezone, timedelta
    login_res = client.post("/api/v1/auth/demo-login")
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create quotation to test
    create_res = client.post("/api/v1/quotations/", headers=headers, json={
        "customer_id": 1,
        "title": "24h Proposal Test",
        "items": [{
            "name": "Heavy Duty Industrial Motor",
            "quantity": 2,
            "unit": "PCS",
            "unit_price": 10000.0,
            "unit_cost": 8000.0,
            "discount_pct": 0.0
        }]
    })
    assert create_res.status_code == 201
    quote = create_res.json()
    q_id = quote["id"]
    assert quote["status"] in ["DRAFT", "NEEDS_REVIEW"]

    # 1. Send quotation to retailer with 24-hour deadline
    send_res = client.post(f"/api/v1/quotations/{q_id}/send-to-retailer", headers=headers, json={
        "deadline_hours": 24.0
    })
    assert send_res.status_code == 200
    sent_quote = send_res.json()
    assert sent_quote["status"] == "PENDING_RESPONSE"
    assert sent_quote["sent_at"] is not None
    assert sent_quote["expires_at"] is not None
    assert sent_quote["public_token"] is not None
    assert sent_quote["seconds_remaining"] is not None
    assert sent_quote["seconds_remaining"] > 86000  # ~24 hours
    assert not sent_quote["is_expired"]

    # 2. Public portal endpoint access without auth
    portal_token = sent_quote["public_token"]
    portal_res = client.get(f"/api/v1/quotations/public/portal/{portal_token}")
    assert portal_res.status_code == 200
    portal_data = portal_res.json()
    assert "quotation" in portal_data
    assert "business" in portal_data
    assert portal_data["quotation"]["status"] == "PENDING_RESPONSE"
    assert portal_data["quotation"]["seconds_remaining"] > 0

    # 3. Create a second quotation to test rejection
    q2_res = client.post("/api/v1/quotations/", headers=headers, json={
        "customer_id": 1,
        "title": "Rejection Test Quote",
        "items": [{"name": "Test Item", "quantity": 1, "unit": "PCS", "unit_price": 5000.0, "unit_cost": 4000.0}]
    })
    q2_id = q2_res.json()["id"]
    client.post(f"/api/v1/quotations/{q2_id}/send-to-retailer", headers=headers, json={"deadline_hours": 24.0})
    q2_token = client.get(f"/api/v1/quotations/{q2_id}", headers=headers).json()["public_token"]

    reject_res = client.post(f"/api/v1/quotations/public/portal/{q2_token}/respond", json={
        "action": "REJECT",
        "notes": "Price is too high compared to competing supplier."
    })
    assert reject_res.status_code == 200
    assert reject_res.json()["status"] == "REJECTED"
    assert reject_res.json()["customer_response"] == "REJECTED"

    # Conflicting second response blocked
    conflict_res = client.post(f"/api/v1/quotations/public/portal/{q2_token}/respond", json={
        "action": "ACCEPT"
    })
    assert conflict_res.status_code == 400

    # 4. Accept quotation 1 before deadline
    accept_res = client.post(f"/api/v1/quotations/public/portal/{portal_token}/respond", json={
        "action": "ACCEPT",
        "notes": "PO confirmed. Please dispatch by Friday."
    })
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "ACCEPTED"
    assert accept_res.json()["customer_response"] == "ACCEPTED"

    # 5. Create a third quotation and test auto-expiry with past deadline
    q3_res = client.post("/api/v1/quotations/", headers=headers, json={
        "customer_id": 1,
        "title": "Expiry Test Quote",
        "items": [{"name": "Pneumatic Valves", "quantity": 5, "unit": "PCS", "unit_price": 2000.0, "unit_cost": 1500.0}]
    })
    q3_id = q3_res.json()["id"]
    # Send with a mock past deadline
    client.post(f"/api/v1/quotations/{q3_id}/send-to-retailer", headers=headers, json={"deadline_hours": 24.0})
    
    # Directly set expires_at in DB to 1 hour in the past to simulate deadline elapsed
    from app.core.database import SessionLocal
    from app.models.quotation import Quotation
    db = SessionLocal()
    try:
        q_db = db.query(Quotation).filter(Quotation.id == q3_id).first()
        q_db.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        db.commit()
    finally:
        db.close()

    # Query the quotation - must auto-expire on access
    q3_check = client.get(f"/api/v1/quotations/{q3_id}", headers=headers).json()
    assert q3_check["status"] == "EXPIRED"
    assert q3_check["is_expired"] is True
    assert q3_check["seconds_remaining"] == 0.0

    # Retailer attempt to respond to expired quotation must return 410 Gone / error
    q3_token = q3_check["public_token"]
    expired_respond_res = client.post(f"/api/v1/quotations/public/portal/{q3_token}/respond", json={
        "action": "ACCEPT"
    })
    assert expired_respond_res.status_code == 410
    assert "expired" in expired_respond_res.json()["detail"].lower()


def test_consistent_quotation_status_counts():
    """
    Verifies that quotation status counts are:
    1. Authoritative and database-backed (exact match with DB rows).
    2. Partitioned strictly: each quotation belongs to exactly ONE status, and sum == total.
    3. Differentiating internal approval (APPROVED) and retailer acceptance (ACCEPTED).
    4. Accurately counting expired quotations after 24h deadline lapse.
    5. Isolated per tenant (Business A cannot see Business B's counts).
    6. Independent of pagination (page_size does not truncate counts).
    7. Cleanly returning zero counts for an empty business dataset.
    """
    # Login as primary demo user
    login_res = client.post("/api/v1/auth/demo-login")
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Fetch status counts from dedicated endpoint
    counts_res = client.get("/api/v1/quotations/status-counts", headers=headers)
    assert counts_res.status_code == 200
    counts = counts_res.json()

    # 2. Verify all required status keys exist
    for key in ["total", "draft", "pending_approval", "approved", "pending_response", "accepted", "rejected", "expired"]:
        assert key in counts, f"Missing key '{key}' in status counts"
        assert isinstance(counts[key], int)
        assert counts[key] >= 0

    # 3. Verify partitioning: sum of all mutually exclusive statuses must equal total
    status_sum = (
        counts["draft"] +
        counts["needs_review"] +
        counts["pending_approval"] +
        counts["approved"] +
        counts["pending_response"] +
        counts["accepted"] +
        counts["rejected"] +
        counts["expired"] +
        counts["cancelled"]
    )
    assert status_sum == counts["total"], f"Sum of status counts ({status_sum}) != total ({counts['total']})"

    # 4. Verify pagination independence: list with page_size=2 should return total == counts['total']
    list_page1 = client.get("/api/v1/quotations/?page=1&page_size=2", headers=headers).json()
    assert list_page1["total"] == counts["total"], "Pagination total does not match status-counts total"
    assert len(list_page1["items"]) <= 2

    # 5. Verify individual status filters match status-counts
    for st_key, st_val in [
        ("draft", "DRAFT"),
        ("pending_approval", "PENDING_APPROVAL"),
        ("approved", "APPROVED"),
        ("pending_response", "PENDING_RESPONSE"),
        ("accepted", "ACCEPTED"),
        ("rejected", "REJECTED"),
        ("expired", "EXPIRED")
    ]:
        filter_res = client.get(f"/api/v1/quotations/?status_filter={st_val}", headers=headers).json()
        assert filter_res["total"] == counts[st_key], f"Filter for {st_val} returned {filter_res['total']}, expected {counts[st_key]}"

    # 6. Tenant isolation test: create a new isolated business
    import uuid
    uniq = uuid.uuid4().hex[:8]
    reg_res = client.post("/api/v1/auth/register", json={
        "email": f"tenant_{uniq}@isolatedmsme.in",
        "password": "Password123!",
        "full_name": "Tenant Manager",
        "business_name": f"Isolated MSME {uniq}",
        "phone": "+91 98888 77777"
    })
    assert reg_res.status_code == 200
    tenant_token = reg_res.json()["access_token"]
    tenant_headers = {"Authorization": f"Bearer {tenant_token}"}

    tenant_counts = client.get("/api/v1/quotations/status-counts", headers=tenant_headers).json()
    # The starter quote in registration is 1 DRAFT quotation
    assert tenant_counts["total"] == 1
    assert tenant_counts["draft"] == 1
    assert tenant_counts["approved"] == 0
    assert tenant_counts["accepted"] == 0
    assert tenant_counts["expired"] == 0

    # Ensure Tenant cannot see primary demo business quotations
    assert tenant_counts["total"] != counts["total"]

    # 7. Empty business test: create business with zero quotations
    from app.core.database import SessionLocal
    from app.models.quotation import Quotation
    db = SessionLocal()
    try:
        from app.models.user import User
        t_user = db.query(User).filter(User.email == f"tenant_{uniq}@isolatedmsme.in").first()
        db.query(Quotation).filter(Quotation.business_id == t_user.business_id).delete()
        db.commit()
    finally:
        db.close()

    empty_counts = client.get("/api/v1/quotations/status-counts", headers=tenant_headers).json()
    assert empty_counts["total"] == 0
    assert empty_counts["draft"] == 0
    assert empty_counts["approved"] == 0
    assert empty_counts["accepted"] == 0
    assert empty_counts["expired"] == 0
    assert empty_counts["rejected"] == 0
    assert empty_counts["pending_response"] == 0
    assert empty_counts["pending_approval"] == 0




