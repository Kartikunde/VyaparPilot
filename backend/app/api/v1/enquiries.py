import time
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.enquiry import Enquiry
from app.models.customer import Customer
from app.models.product import Product
from app.models.business import Business
from app.models.settings import BusinessSettings
from app.models.user import User
from app.schemas.enquiry import (
    EnquiryCreate, EnquiryResponse, EnquiryMatchingResponse,
    ExtractedEnquiryStructure, MatchedEnquiryItem
)
from app.api.v1.deps import get_current_user, get_current_business, get_current_settings
from app.services.ai_service import extract_enquiry_details
from app.services.matching_engine import match_enquiry_item_to_catalogue
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/enquiries", tags=["AI Customer Enquiry Processing"])

@router.get("/", response_model=List[EnquiryResponse])
def list_enquiries(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    return db.query(Enquiry).filter(Enquiry.business_id == business.id).order_by(Enquiry.created_at.desc()).all()

@router.post("/process", response_model=EnquiryMatchingResponse)
async def process_enquiry(
    req: EnquiryCreate,
    business: Business = Depends(get_current_business),
    settings: BusinessSettings = Depends(get_current_settings),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Core AI Extraction & Catalogue Matching workflow:
    1. Extracts structured fields (items, quantities, units, customer info, missing info)
    2. Runs catalogue matching with exact SKU, normalized similarity, and fuzzy suggestions
    3. Detects stock & margin warnings
    4. Records audit trail and returns verified preview for human review
    """
    start_timer = time.time()

    # 1. AI Extraction (Gemini API or Verified Demo Engine)
    extracted_structure, ai_mode = await extract_enquiry_details(
        raw_text=req.raw_text,
        force_demo_mode=req.force_demo_mode
    )
    ai_duration = time.time() - start_timer

    # 2. Match customer or create placeholder if necessary
    customer_id = req.customer_id
    if not customer_id and (extracted_structure.company_name or extracted_structure.customer_name):
        # Look for existing customer
        cust_match = db.query(Customer).filter(
            Customer.business_id == business.id,
            (Customer.company_name.ilike(f"%{extracted_structure.company_name or ''}%")) |
            (Customer.name.ilike(f"%{extracted_structure.customer_name or ''}%"))
        ).first()
        if cust_match:
            customer_id = cust_match.id

    # 3. Fetch catalogue products for matching
    catalogue_products = db.query(Product).filter(
        Product.business_id == business.id,
        Product.is_active == True
    ).all()

    # 4. Run matching engine on all requested items
    matched_items: List[MatchedEnquiryItem] = []
    total_est_subtotal = 0.0

    for extracted_item in extracted_structure.requested_items:
        matched = match_enquiry_item_to_catalogue(
            item=extracted_item,
            catalogue_products=catalogue_products,
            settings=settings
        )
        matched_items.append(matched)
        total_est_subtotal += matched.line_total

    # 5. Save Enquiry entity
    enquiry = Enquiry(
        business_id=business.id,
        customer_id=customer_id,
        customer_name_raw=req.customer_name_raw or extracted_structure.customer_name,
        customer_contact_raw=req.customer_contact_raw or extracted_structure.contact_phone or extracted_structure.contact_email,
        title=req.title,
        source=req.source,
        raw_text=req.raw_text,
        ai_processed=True,
        ai_model_used=f"{extracted_structure.ai_model_name} ({ai_mode})",
        extracted_data_json=extracted_structure.model_dump_json(),
        status="extracted"
    )
    db.add(enquiry)
    db.flush()

    # 6. Audit logging
    log_audit_event(
        db=db,
        business_id=business.id,
        user_id=current_user.id,
        user_email=current_user.email,
        event_type="AI_EXTRACTION_COMPLETED",
        description=f"AI extracted {len(matched_items)} items from enquiry '{enquiry.title}' using {ai_mode}.",
        metadata={
            "enquiry_id": enquiry.id,
            "items_count": len(matched_items),
            "ai_mode": ai_mode,
            "processing_seconds": round(ai_duration, 2),
            "missing_info": extracted_structure.missing_information
        }
    )
    db.commit()

    return EnquiryMatchingResponse(
        enquiry_id=enquiry.id,
        extracted_structure=extracted_structure,
        matched_items=matched_items,
        total_estimated_subtotal=round(total_est_subtotal, 2),
        processing_time_seconds=round(ai_duration, 2),
        ai_mode_used=ai_mode
    )

@router.get("/{id}", response_model=EnquiryResponse)
def get_enquiry(
    id: int,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    enquiry = db.query(Enquiry).filter(Enquiry.id == id, Enquiry.business_id == business.id).first()
    if not enquiry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enquiry not found.")
    return enquiry
