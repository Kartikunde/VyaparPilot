from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_email = Column(String(255), nullable=True)
    event_type = Column(String(100), nullable=False, index=True)
    # ENQUIRY_CREATED, AI_EXTRACTION_COMPLETED, PRODUCT_MATCHED, GUARDRAIL_TRIGGERED,
    # QUOTATION_CREATED, QUOTATION_EDITED, APPROVAL_REQUESTED, QUOTATION_APPROVED,
    # QUOTATION_REJECTED, PDF_GENERATED, ROI_RECORDED
    description = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=True)  # Safe structured payload, no secrets or passwords
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    business = relationship("Business", back_populates="audit_events")
    quotation = relationship("Quotation", back_populates="audit_events")
    user = relationship("User")
