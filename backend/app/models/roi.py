from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class ProductivityMeasurement(Base):
    __tablename__ = "productivity_measurements"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id", ondelete="SET NULL"), nullable=True, index=True)
    enquiry_id = Column(Integer, ForeignKey("enquiries.id", ondelete="SET NULL"), nullable=True)

    manual_baseline_seconds = Column(Float, nullable=False, default=2100.0)  # 35 min default
    ai_processing_seconds = Column(Float, nullable=False, default=15.0)
    human_review_seconds = Column(Float, nullable=False, default=120.0)
    correction_seconds = Column(Float, nullable=False, default=30.0)
    total_ai_assisted_seconds = Column(Float, nullable=False, default=165.0)

    time_saved_seconds = Column(Float, nullable=False, default=1935.0)
    time_reduction_pct = Column(Float, nullable=False, default=92.1)

    fields_corrected_count = Column(Integer, default=0)
    validation_errors_caught_count = Column(Integer, default=0)

    labour_cost_per_hour = Column(Float, nullable=False, default=350.0)
    estimated_labour_value_saved = Column(Float, nullable=False, default=188.1)
    ai_operating_cost = Column(Float, default=0.50)  # API token cost in INR
    net_benefit = Column(Float, nullable=False, default=187.6)

    is_demo_data = Column(Boolean, default=False)
    measurement_type = Column(String(50), default="MEASURED")  # MEASURED, BASELINE_ESTIMATE, DEMO_SEEDED
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    business = relationship("Business", back_populates="roi_measurements")
    quotation = relationship("Quotation", back_populates="roi_measurements")
