import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.user import User
from app.models.business import Business
from app.models.settings import BusinessSettings
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
