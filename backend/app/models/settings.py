from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class BusinessSettings(Base):
    __tablename__ = "business_settings"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    currency = Column(String(10), default="INR")
    currency_symbol = Column(String(10), default="₹")
    default_tax_rate = Column(Float, default=18.0)  # GST rate: 18% standard for industrial products
    tax_label = Column(String(50), default="GST (CGST+SGST / IGST)")
    tax_note = Column(String(255), default="Taxes calculated according to GST regulations: 9% CGST + 9% SGST for intra-state, 18% IGST for inter-state.")
    
    default_validity_days = Column(Integer, default=30)
    default_payment_terms = Column(Text, default="50% advance along with confirmed Purchase Order, balance 50% against proforma invoice before dispatch. Delivery within 7-10 business days from PO receipt.")
    default_delivery_terms = Column(Text, default="Ex-works warehouse. Freight and transit insurance extra at actuals unless specifically waived.")
    quotation_prefix = Column(String(10), default="VP")
    
    # Financial guardrails
    labour_cost_per_hour = Column(Float, default=350.0)  # INR/hour for MSME admin/sales staff
    default_manual_prep_time_minutes = Column(Float, default=35.0)  # Typical manual preparation baseline
    min_margin_threshold_pct = Column(Float, default=15.0)  # Minimum gross profit margin threshold
    max_discount_threshold_pct = Column(Float, default=20.0)  # Alert if discount exceeds 20%
    
    # Audit & Updated
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    business = relationship("Business", back_populates="settings")
