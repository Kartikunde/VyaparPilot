import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from datetime import datetime, timezone, timedelta
from app.models.user import User
from app.models.business import Business
from app.models.settings import BusinessSettings
from app.models.product import Product
from app.models.customer import Customer
from app.models.quotation import Quotation, QuotationItem
from app.schemas.auth import LoginRequest, UserRegisterRequest, Token, UserResponse
from app.api.v1.deps import get_current_user
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication"])


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    return re.sub(r'[-\s]+', '-', text)

@router.post("/register", response_model=Token)
def register_user_and_business(req: UserRegisterRequest, db: Session = Depends(get_db)):
    # Check if user already exists
    existing = db.query(User).filter(User.email == req.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # Create business
    base_slug = slugify(req.business_name)
    slug = base_slug
    idx = 1
    while db.query(Business).filter(Business.slug == slug).first():
        slug = f"{base_slug}-{idx}"
        idx += 1

    business = Business(
        name=req.business_name,
        slug=slug,
        email=req.email.lower(),
        phone=req.phone,
        address=req.address or "Industrial Area Phase 2",
        city=req.city or "Pune",
        state=req.state or "Maharashtra",
        pincode=req.pincode or "411019",
        gstin=req.gstin
    )
    db.add(business)
    db.flush()

    # Create business settings
    settings = BusinessSettings(
        business_id=business.id,
        currency="INR",
        currency_symbol="₹",
        default_tax_rate=18.0,
        default_payment_terms="50% advance along with PO, balance against proforma invoice before dispatch.",
        default_delivery_terms="Ex-works warehouse, freight and transit insurance extra at actuals.",
        labour_cost_per_hour=350.0,
        default_manual_prep_time_minutes=35.0,
        min_margin_threshold_pct=15.0,
        max_discount_threshold_pct=20.0
    )
    db.add(settings)

    # Create user
    user = User(
        business_id=business.id,
        email=req.email.lower(),
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name,
        role="owner",
        is_active=True
    )
    db.add(user)
    db.flush()

    # Seed starter catalogue, customer, and sample quotation for immediate productivity
    p1 = Product(business_id=business.id, sku='IND-MTR-001', name='Three-Phase Induction Motor 5HP 1440 RPM', category='Electric Motors', unit='PCS', hsn_code='85015210', unit_cost=9200.0, unit_selling_price=12500.0, stock_quantity=18, reorder_threshold=5, is_active=True)
    p2 = Product(business_id=business.id, sku='PNEU-CYL-020', name='Heavy Duty Pneumatic Cylinder 50mm Bore', category='Pneumatics', unit='PCS', hsn_code='84123100', unit_cost=2800.0, unit_selling_price=3950.0, stock_quantity=45, reorder_threshold=10, is_active=True)
    p3 = Product(business_id=business.id, sku='ELEC-CAB-003', name='4-Core Copper Armoured Power Cable 4 sq mm', category='Cables & Wiring', unit='METERS', hsn_code='85444990', unit_cost=145.0, unit_selling_price=198.0, stock_quantity=450, reorder_threshold=100, is_active=True)
    p4 = Product(business_id=business.id, sku='VALV-BAL-010', name='Stainless Steel Ball Valve 1-inch Class 150', category='Valves', unit='PCS', hsn_code='84818030', unit_cost=780.0, unit_selling_price=1150.0, stock_quantity=60, reorder_threshold=15, is_active=True)
    db.add_all([p1, p2, p3, p4])
    
    cust1 = Customer(business_id=business.id, name='Rajesh Sharma', company_name='Precision Engineering Works', email='rajesh@precisioneng.com', phone='+91 98220 12345', billing_address='Plot 14, MIDC Bhosari', shipping_address='Plot 14, MIDC Bhosari', city='Pune', state='Maharashtra', pincode='411026', gstin='27AABCP8841F1ZV')
    cust2 = Customer(business_id=business.id, name='Amit Patil', company_name='Kirloskar Ferrous Industries', email='amit.patil@kirloskar.com', phone='+91 94220 88771', billing_address='132 Shivaji Nagar', shipping_address='132 Shivaji Nagar', city='Pune', state='Maharashtra', pincode='411005', gstin='27AAACK1104D1ZN')
    db.add_all([cust1, cust2])
    db.flush()
    
    quote_num = f"VP-{business.id:02d}-2026-0001"
    starter_quote = Quotation(
        business_id=business.id,
        customer_id=cust1.id,
        quotation_number=quote_num,
        title='Supply of Three Phase Motors and Cylinders',
        status='DRAFT',
        currency='INR',
        subtotal=77000.0,
        discount_amount=3850.0,
        discount_percentage=5.0,
        tax_rate=18.0,
        tax_amount=13167.0,
        tax_type='INTRA_STATE_GST',
        delivery_charge=1500.0,
        grand_total=87817.0,
        total_cost=56600.0,
        estimated_gross_margin_pct=22.6,
        valid_until=datetime.now(timezone.utc) + timedelta(days=30),
        payment_terms='50% advance, balance against proforma invoice.',
        delivery_terms='Ex-works warehouse.',
        has_guardrail_warnings=False
    )
    db.add(starter_quote)
    db.flush()
    
    q_item = QuotationItem(
        quotation_id=starter_quote.id,
        sku='IND-MTR-001',
        name='Three-Phase Induction Motor 5HP 1440 RPM',
        description='5HP 1440 RPM Foot Mounted 415V',
        quantity=5.0,
        unit='PCS',
        unit_price=12500.0,
        unit_cost=9200.0,
        discount_pct=5.0,
        line_total=59375.0,
        verification_status='VERIFIED_EXACT',
        match_confidence=1.0,
        stock_available=18,
        has_stock_warning=False
    )
    db.add(q_item)

    # Audit log
    log_audit_event(
        db=db,
        business_id=business.id,
        user_id=user.id,
        user_email=user.email,
        event_type="BUSINESS_REGISTERED",
        description=f"Workspace registered for '{business.name}' with owner {user.full_name}.",
        metadata={"email": user.email, "business_slug": business.slug}
    )

    db.commit()


    token = create_access_token(subject=user.id)
    return Token(access_token=token, token_type="bearer")

@router.post("/login", response_model=Token)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive. Please contact support."
        )

    token = create_access_token(subject=user.id)
    return Token(access_token=token, token_type="bearer")

@router.post("/demo-login", response_model=Token)
def demo_login(db: Session = Depends(get_db)):
    """Convenience single-click login into the seeded demo business workspace for hackathon evaluation."""
    demo_user = db.query(User).filter(User.email == "demo@vyaparpilot.in").first()
    if not demo_user:
        # Fallback to any user
        demo_user = db.query(User).first()
        
    if not demo_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo database is not yet seeded. Please run the seed command."
        )

    token = create_access_token(subject=demo_user.id)
    return Token(access_token=token, token_type="bearer")

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    business = db.query(Business).filter(Business.id == current_user.business_id).first()
    return UserResponse(
        id=current_user.id,
        business_id=current_user.business_id,
        business_name=business.name if business else "Workspace",
        business_slug=business.slug if business else "workspace",
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at
    )
