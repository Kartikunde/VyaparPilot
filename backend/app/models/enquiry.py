from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Enquiry(Base):
    __tablename__ = "enquiries"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    customer_name_raw = Column(String(255), nullable=True)
    customer_contact_raw = Column(String(255), nullable=True)
    title = Column(String(255), nullable=False)
    source = Column(String(50), default="email")  # email, whatsapp, phone, manual, rfq
    raw_text = Column(Text, nullable=False)
    ai_processed = Column(Boolean, default=False)
    ai_model_used = Column(String(100), nullable=True)
    extracted_data_json = Column(Text, nullable=True)  # JSON representation of extracted structure
    status = Column(String(50), default="extracted")  # new, extracted, quotation_created, closed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    business = relationship("Business", back_populates="enquiries")
    customer = relationship("Customer", back_populates="enquiries")
    quotations = relationship("Quotation", back_populates="enquiry")
