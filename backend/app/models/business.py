from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Business(Base):
    __tablename__ = "businesses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    tagline = Column(String(255), nullable=True)
    logo_url = Column(String(500), nullable=True)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    pincode = Column(String(20), nullable=False)
    gstin = Column(String(30), nullable=True)  # Goods and Services Tax Identification Number
    pan = Column(String(20), nullable=True)
    bank_name = Column(String(100), nullable=True)
    bank_account_no = Column(String(50), nullable=True)
    bank_ifsc = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    users = relationship("User", back_populates="business", cascade="all, delete-orphan")
    settings = relationship("BusinessSettings", back_populates="business", uselist=False, cascade="all, delete-orphan")
    products = relationship("Product", back_populates="business", cascade="all, delete-orphan")
    customers = relationship("Customer", back_populates="business", cascade="all, delete-orphan")
    enquiries = relationship("Enquiry", back_populates="business", cascade="all, delete-orphan")
    quotations = relationship("Quotation", back_populates="business", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="business", cascade="all, delete-orphan")
    roi_measurements = relationship("ProductivityMeasurement", back_populates="business", cascade="all, delete-orphan")
