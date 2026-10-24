from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class ExtractedItem(BaseModel):
    product_query: str = Field(..., description="Raw item name or specification mentioned by the customer")
    quantity: float = Field(default=1.0, description="Requested quantity")
    unit: str = Field(default="PCS", description="Unit of measurement requested e.g. PCS, METERS, BOXES")
    specifications: Optional[str] = Field(None, description="Technical specifications, dimensions, power, or brand")
    urgency_or_notes: Optional[str] = None

class ExtractedEnquiryStructure(BaseModel):
    customer_name: Optional[str] = None
    company_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    delivery_location: Optional[str] = None
    requested_delivery_date: Optional[str] = None
    requested_items: List[ExtractedItem] = []
    special_requirements: List[str] = []
    missing_information: List[str] = []
    ambiguities: List[str] = []
    ai_confidence_score: float = 0.95
    ai_model_name: str = "VyaparPilot-AI-Engine"

class EnquiryCreate(BaseModel):
    customer_id: Optional[int] = None
    customer_name_raw: Optional[str] = None
    customer_contact_raw: Optional[str] = None
    title: str = Field(..., min_length=2, max_length=255)
    source: str = "email"
    raw_text: str = Field(..., min_length=5)
    force_demo_mode: bool = False

class ProductMatchCandidate(BaseModel):
    product_id: int
    sku: str
    name: str
    category: str
    unit: str
    unit_selling_price: float
    unit_cost: float
    stock_quantity: int
    match_score: float

class MatchedEnquiryItem(BaseModel):
    original_item: ExtractedItem
    match_type: str  # VERIFIED_EXACT, SUGGESTED_MATCH, UNMATCHED
    match_confidence: float
    matched_product_id: Optional[int] = None
    sku: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    unit_selling_price: float = 0.0
    unit_cost: float = 0.0
    stock_available: int = 0
    quantity: float = 1.0
    unit: str = "PCS"
    line_total: float = 0.0
    has_stock_warning: bool = False
    has_margin_warning: bool = False
    warning_details: Optional[str] = None
    candidates: List[ProductMatchCandidate] = []

class EnquiryMatchingResponse(BaseModel):
    enquiry_id: int
    extracted_structure: ExtractedEnquiryStructure
    matched_items: List[MatchedEnquiryItem]
    total_estimated_subtotal: float
    processing_time_seconds: float
    ai_mode_used: str  # "GEMINI_LIVE_API" or "VERIFIED_DEMO_ENGINE"

class EnquiryResponse(BaseModel):
    id: int
    business_id: int
    customer_id: Optional[int] = None
    customer_name_raw: Optional[str] = None
    customer_contact_raw: Optional[str] = None
    title: str
    source: str
    raw_text: str
    ai_processed: bool
    ai_model_used: Optional[str] = None
    extracted_data_json: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
