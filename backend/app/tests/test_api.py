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
    assert res.json()["total"] == 0  # Brand new tenant has 0 products

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


