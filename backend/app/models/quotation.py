from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    enquiry_id = Column(Integer, ForeignKey("enquiries.id", ondelete="SET NULL"), nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    quotation_number = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=True)
    status = Column(String(50), default="DRAFT", index=True, nullable=False)
    # Statuses: DRAFT, NEEDS_REVIEW, PENDING_APPROVAL, APPROVED, REJECTED, CANCELLED

    currency = Column(String(10), default="INR")
    subtotal = Column(Float, nullable=False, default=0.0)
    discount_amount = Column(Float, nullable=False, default=0.0)
    discount_percentage = Column(Float, nullable=False, default=0.0)
    tax_rate = Column(Float, nullable=False, default=18.0)
    tax_amount = Column(Float, nullable=False, default=0.0)
    tax_type = Column(String(50), default="INTRA_STATE_GST")  # INTRA_STATE_GST (CGST+SGST) or INTER_STATE_IGST
    delivery_charge = Column(Float, nullable=False, default=0.0)
    grand_total = Column(Float, nullable=False, default=0.0)
    
    total_cost = Column(Float, nullable=False, default=0.0)
    estimated_gross_margin_pct = Column(Float, nullable=False, default=0.0)

    # Business Terms & Validity
    valid_until = Column(DateTime, nullable=True)
    payment_terms = Column(Text, nullable=True)
    delivery_terms = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    approved_at = Column(DateTime, nullable=True)

    # Guardrails flags
    has_guardrail_warnings = Column(Boolean, default=False)
    guardrail_warnings_json = Column(Text, nullable=True)

    # 24-Hour Quotation Acceptance Deadline & Expiry Tracking
    sent_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True, index=True)
    responded_at = Column(DateTime, nullable=True)
    customer_response = Column(String(50), nullable=True)  # ACCEPTED, REJECTED, EXPIRED
    response_notes = Column(Text, nullable=True)
    public_token = Column(String(100), unique=True, index=True, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    business = relationship("Business", back_populates="quotations")
    customer = relationship("Customer", back_populates="quotations")
    enquiry = relationship("Enquiry", back_populates="quotations")
    items = relationship("QuotationItem", back_populates="quotation", cascade="all, delete-orphan")
    approval_events = relationship("ApprovalEvent", back_populates="quotation", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="quotation")
    roi_measurements = relationship("ProductivityMeasurement", back_populates="quotation")

class QuotationItem(Base):
    __tablename__ = "quotation_items"

    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)

    sku = Column(String(50), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    quantity = Column(Float, nullable=False, default=1.0)
    unit = Column(String(20), nullable=False, default="PCS")
    unit_price = Column(Float, nullable=False, default=0.0)
    unit_cost = Column(Float, nullable=False, default=0.0)
    discount_pct = Column(Float, nullable=False, default=0.0)
    line_total = Column(Float, nullable=False, default=0.0)

    # Verification and matching details
    verification_status = Column(String(50), default="VERIFIED_EXACT")
    # VERIFIED_EXACT, SUGGESTED_MATCH, UNMATCHED, MANUAL
    match_confidence = Column(Float, default=1.0)
    stock_available = Column(Integer, default=0)
    has_stock_warning = Column(Boolean, default=False)
    has_margin_warning = Column(Boolean, default=False)
    warning_details = Column(Text, nullable=True)

    quotation = relationship("Quotation", back_populates="items")
    product = relationship("Product")
