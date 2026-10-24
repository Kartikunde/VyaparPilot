from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.audit import AuditEvent
from app.models.business import Business
from app.schemas.audit import AuditEventResponse, AuditListResponse
from app.api.v1.deps import get_current_user, get_current_business

router = APIRouter(prefix="/audit", tags=["Audit Trail & Explainability"])

@router.get("/", response_model=AuditListResponse)
def get_audit_trail(
    quotation_id: Optional[int] = None,
    event_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    """
    Returns immutable audit events for the business workspace.
    Guarantees tenant isolation: users can never see another business's logs.
    """
    query = db.query(AuditEvent).filter(AuditEvent.business_id == business.id)

    if quotation_id:
        query = query.filter(AuditEvent.quotation_id == quotation_id)

    if event_type:
        query = query.filter(AuditEvent.event_type == event_type)

    total = query.count()
    items = query.order_by(AuditEvent.created_at.desc()).offset(offset).limit(limit).all()

    return AuditListResponse(
        items=items,
        total=total
    )
