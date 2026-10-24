from typing import Generator, Optional
from fastapi import Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.business import Business
from app.models.settings import BusinessSettings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def get_current_user(
    db: Session = Depends(get_db),
    token_header: Optional[str] = Depends(oauth2_scheme),
    token_query: Optional[str] = Query(None, alias="token")
) -> User:
    """Validates JWT bearer token from Authorization header or ?token= query parameter."""
    token = token_header or token_query
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None or not user.is_active:
        raise credentials_exception

    return user

def get_current_business(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Business:
    """Returns the Business entity associated with the current user."""
    business = db.query(Business).filter(Business.id == current_user.business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business workspace not found"
        )
    return business

def get_current_settings(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
) -> BusinessSettings:
    """Returns BusinessSettings for the current user's business."""
    settings = db.query(BusinessSettings).filter(BusinessSettings.business_id == business.id).first()
    if not settings:
        # Create default settings if not yet existing
        settings = BusinessSettings(
            business_id=business.id,
            currency="INR",
            currency_symbol="₹",
            default_tax_rate=18.0,
            default_payment_terms="50% advance, 50% on dispatch / delivery within 7 days",
            default_delivery_terms="Ex-works warehouse, freight extra at actuals",
            labour_cost_per_hour=350.0,
            default_manual_prep_time_minutes=35.0,
            min_margin_threshold_pct=15.0,
            max_discount_threshold_pct=20.0
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings
