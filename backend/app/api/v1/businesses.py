from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.business import Business
from app.models.settings import BusinessSettings
from app.models.user import User
from app.schemas.business import BusinessResponse, BusinessUpdate, BusinessSettingsResponse, BusinessSettingsUpdate
from app.api.v1.deps import get_current_user, get_current_business, get_current_settings
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/business", tags=["Business Workspace"])

@router.get("/profile", response_model=BusinessResponse)
def get_business_profile(
    business: Business = Depends(get_current_business),
    settings: BusinessSettings = Depends(get_current_settings)
):
    res = BusinessResponse.model_validate(business)
    res.settings = BusinessSettingsResponse.model_validate(settings)
    return res

@router.put("/profile", response_model=BusinessResponse)
def update_business_profile(
    req: BusinessUpdate,
    business: Business = Depends(get_current_business),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    update_data = req.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(business, field, val)
    
    log_audit_event(
        db=db,
        business_id=business.id,
        user_id=current_user.id,
        user_email=current_user.email,
        event_type="BUSINESS_PROFILE_UPDATED",
        description="Business profile information updated.",
        metadata={"fields_updated": list(update_data.keys())}
    )
    db.commit()
    db.refresh(business)
    
    settings = db.query(BusinessSettings).filter(BusinessSettings.business_id == business.id).first()
    res = BusinessResponse.model_validate(business)
    if settings:
        res.settings = BusinessSettingsResponse.model_validate(settings)
    return res

@router.get("/settings", response_model=BusinessSettingsResponse)
def get_business_settings(settings: BusinessSettings = Depends(get_current_settings)):
    return settings

@router.put("/settings", response_model=BusinessSettingsResponse)
def update_business_settings(
    req: BusinessSettingsUpdate,
    settings: BusinessSettings = Depends(get_current_settings),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    update_data = req.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(settings, field, val)

    log_audit_event(
        db=db,
        business_id=settings.business_id,
        user_id=current_user.id,
        user_email=current_user.email,
        event_type="BUSINESS_SETTINGS_UPDATED",
        description="Business pricing guardrails and ROI parameters updated.",
        metadata={"settings_updated": list(update_data.keys())}
    )
    db.commit()
    db.refresh(settings)
    return settings
