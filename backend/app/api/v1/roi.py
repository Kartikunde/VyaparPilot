from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.business import Business
from app.models.settings import BusinessSettings
from app.models.user import User
from app.schemas.roi import (
    ROISummaryResponse, ProductivityMeasurementCreate, ProductivityMeasurementResponse
)
from app.api.v1.deps import get_current_user, get_current_business, get_current_settings
from app.services.roi_service import compute_business_roi_summary, record_roi_measurement

router = APIRouter(prefix="/roi", tags=["Verifiable ROI Analytics"])

@router.get("/summary", response_model=ROISummaryResponse)
def get_roi_analytics(
    filter_type: Optional[str] = Query(None, description="Optional filter: 'MEASURED', 'DEMO_SEEDED', or None for all"),
    business: Business = Depends(get_current_business),
    settings: BusinessSettings = Depends(get_current_settings),
    db: Session = Depends(get_db)
):
    """
    Returns authentic, calculated ROI metrics derived from actual database records.
    Clearly marks and separates measured results from seeded demo baselines.
    """
    return compute_business_roi_summary(
        db=db,
        business_id=business.id,
        settings=settings,
        filter_type=filter_type
    )

@router.post("/record", response_model=ProductivityMeasurementResponse, status_code=status.HTTP_201_CREATED)
def add_roi_measurement(
    req: ProductivityMeasurementCreate,
    business: Business = Depends(get_current_business),
    settings: BusinessSettings = Depends(get_current_settings),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Explicitly records a productivity or baseline measurement for time-motion audits."""
    m = record_roi_measurement(
        db=db,
        business_id=business.id,
        data=req,
        settings=settings
    )
    db.commit()
    db.refresh(m)
    return m
