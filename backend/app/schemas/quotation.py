from typing import List, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime

class GuardrailWarning(BaseModel):
    code: str  # INSUFFICIENT_STOCK, LOW_MARGIN, HIGH_DISCOUNT, UNMATCHED_PRODUCT, MISSING_CUSTOMER_INFO
    severity: str  # "WARNING", "CRITICAL", "INFO"
    item_index: Optional[int] = None
    item_name: Optional[str] = None
    message: str
    data: Optional[dict[str, Any]] = None

class QuotationItemBase(BaseModel):
    product_id: Optional[int] = None
    sku: Optional[str] = None
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    quantity: float = Field(..., gt=0)
    unit: str = "PCS"
    unit_price: float = Field(..., ge=0)
    unit_cost: float = Field(default=0.0, ge=0)
    discount_pct: float = Field(default=0.0, ge=0, le=100)
    verification_status: str = "VERIFIED_EXACT"
    match_confidence: float = 1.0

class QuotationItemCreate(QuotationItemBase):
    pass

class QuotationItemResponse(QuotationItemBase):
    id: int
    quotation_id: int
    line_total: float
    stock_available: int = 0
    has_stock_warning: bool = False
    has_margin_warning: bool = False
    warning_details: Optional[str] = None

    class Config:
        from_attributes = True

class QuotationCalculationRequest(BaseModel):
    items: List[QuotationItemCreate]
    discount_percentage: float = 0.0
    tax_rate: float = 18.0
    tax_type: str = "INTRA_STATE_GST"  # INTRA_STATE_GST or INTER_STATE_IGST
    delivery_charge: float = 0.0

class QuotationCalculationResponse(BaseModel):
    subtotal: float
    discount_amount: float
    discount_percentage: float
    taxable_amount: float
    tax_rate: float
    tax_amount: float
    cgst_amount: float = 0.0
    sgst_amount: float = 0.0
    igst_amount: float = 0.0
    delivery_charge: float
    grand_total: float
    total_cost: float
    estimated_gross_profit: float
    estimated_gross_margin_pct: float
    warnings: List[GuardrailWarning] = []

class QuotationCreate(BaseModel):
    customer_id: int
    enquiry_id: Optional[int] = None
    title: Optional[str] = None
    items: List[QuotationItemCreate]
    discount_percentage: float = 0.0
    tax_rate: float = 18.0
    tax_type: str = "INTRA_STATE_GST"
    delivery_charge: float = 0.0
    valid_until: Optional[datetime] = None
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None
    notes: Optional[str] = None
    # For initial time tracking if converting from enquiry
    review_time_seconds: Optional[float] = 120.0
    correction_time_seconds: Optional[float] = 30.0

class QuotationUpdate(BaseModel):
    customer_id: Optional[int] = None
    title: Optional[str] = None
    items: Optional[List[QuotationItemCreate]] = None
    discount_percentage: Optional[float] = None
    tax_rate: Optional[float] = None
    tax_type: Optional[str] = None
    delivery_charge: Optional[float] = None
    valid_until: Optional[datetime] = None
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class QuotationSendRequest(BaseModel):
    deadline_hours: Optional[float] = Field(default=24.0, gt=0, le=720, description="Acceptance deadline in hours (default 24.0)")
    notes: Optional[str] = None

class RetailerResponseRequest(BaseModel):
    action: str = Field(..., description="'ACCEPT' or 'REJECT'")
    notes: Optional[str] = None
    retailer_name: Optional[str] = None

class QuotationResponse(BaseModel):
    id: int
    business_id: int
    customer_id: int
    customer_name: Optional[str] = None
    customer_company: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_gstin: Optional[str] = None
    enquiry_id: Optional[int] = None
    quotation_number: str
    title: Optional[str] = None
    status: str
    currency: str
    subtotal: float
    discount_amount: float
    discount_percentage: float
    tax_rate: float
    tax_amount: float
    tax_type: str
    delivery_charge: float
    grand_total: float
    total_cost: float
    estimated_gross_margin_pct: float
    valid_until: Optional[datetime] = None
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    approved_at: Optional[datetime] = None
    approved_by_user_id: Optional[int] = None
    has_guardrail_warnings: bool = False
    guardrail_warnings_json: Optional[str] = None
    
    # 24-Hour Acceptance Deadline fields
    sent_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    responded_at: Optional[datetime] = None
    customer_response: Optional[str] = None
    response_notes: Optional[str] = None
    public_token: Optional[str] = None
    seconds_remaining: Optional[float] = None
    is_expired: Optional[bool] = False

    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[QuotationItemResponse] = []

    class Config:
        from_attributes = True

class QuotationListResponse(BaseModel):
    items: List[QuotationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class QuotationStatusCounts(BaseModel):
    total: int = 0
    draft: int = 0
    needs_review: int = 0
    pending_approval: int = 0
    approved: int = 0
    pending_response: int = 0
    accepted: int = 0
    rejected: int = 0
    expired: int = 0
    cancelled: int = 0

    class Config:
        from_attributes = True
