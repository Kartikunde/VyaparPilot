from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class BusinessSettingsBase(BaseModel):
    currency: str = "INR"
    currency_symbol: str = "₹"
    default_tax_rate: float = 18.0
    tax_label: str = "GST (CGST+SGST / IGST)"
    tax_note: Optional[str] = None
    default_validity_days: int = 30
    default_payment_terms: str
    default_delivery_terms: str
    quotation_prefix: str = "VP"
    labour_cost_per_hour: float = 350.0
    default_manual_prep_time_minutes: float = 35.0
    min_margin_threshold_pct: float = 15.0
    max_discount_threshold_pct: float = 20.0

class BusinessSettingsUpdate(BaseModel):
    currency: Optional[str] = None
    currency_symbol: Optional[str] = None
    default_tax_rate: Optional[float] = None
    tax_label: Optional[str] = None
    tax_note: Optional[str] = None
    default_validity_days: Optional[int] = None
    default_payment_terms: Optional[str] = None
    default_delivery_terms: Optional[str] = None
    quotation_prefix: Optional[str] = None
    labour_cost_per_hour: Optional[float] = None
    default_manual_prep_time_minutes: Optional[float] = None
    min_margin_threshold_pct: Optional[float] = None
    max_discount_threshold_pct: Optional[float] = None

class BusinessSettingsResponse(BusinessSettingsBase):
    id: int
    business_id: int
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class BusinessBase(BaseModel):
    name: str
    tagline: Optional[str] = None
    email: str
    phone: str
    address: str
    city: str
    state: str
    pincode: str
    gstin: Optional[str] = None
    pan: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_ifsc: Optional[str] = None

class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_ifsc: Optional[str] = None

class BusinessResponse(BusinessBase):
    id: int
    slug: str
    logo_url: Optional[str] = None
    created_at: datetime
    settings: Optional[BusinessSettingsResponse] = None

    class Config:
        from_attributes = True
