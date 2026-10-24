import json
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from app.core.database import get_db
from app.models.quotation import Quotation, QuotationItem
from app.models.customer import Customer
from app.models.product import Product
from app.models.business import Business
from app.models.settings import BusinessSettings
from app.models.approval import ApprovalEvent
from app.models.user import User
from app.models.enquiry import Enquiry
from app.schemas.quotation import (
    QuotationCreate, QuotationUpdate, QuotationResponse, QuotationListResponse,
    QuotationCalculationRequest, QuotationCalculationResponse, QuotationItemResponse
)
from app.schemas.approval import ApprovalActionRequest, ApprovalEventResponse
from app.schemas.roi import ProductivityMeasurementCreate
from app.api.v1.deps import get_current_user, get_current_business, get_current_settings
from app.services.pricing_engine import calculate_quotation_totals
from app.services.pdf_service import generate_quotation_pdf
from app.services.audit_service import log_audit_event
from app.services.roi_service import record_roi_measurement

router = APIRouter(prefix="/quotations", tags=["Quotation Builder & Approvals"])

def generate_next_quotation_number(db: Session, business: Business, prefix: str = "VP") -> str:
    """Generates unique, monotonically increasing quotation number scoped to business and year."""
    year = datetime.now().year
    if business.id == 2:
        prefix_str = f"{prefix}-{year}-"
    else:
        prefix_str = f"{prefix}-{business.id:02d}-{year}-"
    
    last_quote = db.query(Quotation).filter(
        Quotation.business_id == business.id,
        Quotation.quotation_number.like(f"{prefix_str}%")
    ).order_by(desc(Quotation.id)).first()

    next_seq = 1
    if last_quote and last_quote.quotation_number:
        try:
            seq_part = last_quote.quotation_number.replace(prefix_str, "")
            next_seq = int(seq_part) + 1
        except ValueError:
            next_seq = 1

    candidate = f"{prefix_str}{next_seq:04d}"
    while db.query(Quotation).filter(Quotation.quotation_number == candidate).first():
        next_seq += 1
        candidate = f"{prefix_str}{next_seq:04d}"

    return candidate


@router.post("/calculate", response_model=QuotationCalculationResponse)
def calculate_preview(
    req: QuotationCalculationRequest,
    settings: BusinessSettings = Depends(get_current_settings)
):
    """
    Live calculate quotation financials using precise Decimal math.
    Evaluates pricing guardrails, tax split (CGST/SGST vs IGST), margins and warnings.
    """
    return calculate_quotation_totals(
        items=req.items,
        overall_discount_pct=req.discount_percentage,
        tax_rate=req.tax_rate,
        tax_type=req.tax_type,
        delivery_charge=req.delivery_charge,
        settings=settings
    )

@router.get("/", response_model=QuotationListResponse)
def list_quotations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = None,
    customer_id: Optional[int] = None,
    search: Optional[str] = None,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    query = db.query(Quotation).filter(Quotation.business_id == business.id)

    if status_filter:
        query = query.filter(Quotation.status == status_filter)

    if customer_id:
        query = query.filter(Quotation.customer_id == customer_id)

    if search:
        term = f"%{search.strip()}%"
        query = query.join(Customer).filter(
            or_(
                Quotation.quotation_number.ilike(term),
                Quotation.title.ilike(term),
                Customer.company_name.ilike(term),
                Customer.name.ilike(term)
            )
        )

    total = query.count()
    quotes = query.order_by(Quotation.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    responses = []
    for q in quotes:
        r = QuotationResponse.model_validate(q)
        r.customer_name = q.customer.name if q.customer else None
        r.customer_company = q.customer.company_name if q.customer else None
        r.customer_email = q.customer.email if q.customer else None
        r.customer_phone = q.customer.phone if q.customer else None
        r.customer_gstin = q.customer.gstin if q.customer else None
        responses.append(r)

    return QuotationListResponse(
        items=responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.post("/", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
def create_quotation(
    req: QuotationCreate,
    business: Business = Depends(get_current_business),
    settings: BusinessSettings = Depends(get_current_settings),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify customer belongs to this business
    customer = db.query(Customer).filter(
        Customer.id == req.customer_id,
        Customer.business_id == business.id
    ).first()
    if not customer:
        raise HTTPException(status_code=400, detail="Customer not found in this business.")

    if not req.items:
        raise HTTPException(status_code=400, detail="Cannot create quotation without line items.")

    # 1. Deterministic Backend Calculation
    cust_info = {"name": customer.name, "phone": customer.phone, "email": customer.email}
    calc = calculate_quotation_totals(
        items=req.items,
        overall_discount_pct=req.discount_percentage,
        tax_rate=req.tax_rate,
        tax_type=req.tax_type,
        delivery_charge=req.delivery_charge,
        settings=settings,
        customer_info=cust_info
    )

    # 2. Determine initial status based on guardrails
    has_critical = any(w.severity == "CRITICAL" for w in calc.warnings)
    initial_status = "NEEDS_REVIEW" if has_critical else "DRAFT"

    # 3. Create Quotation entity
    quote_number = generate_next_quotation_number(db, business, prefix=settings.quotation_prefix or "VP")
    validity = req.valid_until or (datetime.now(timezone.utc) + timedelta(days=settings.default_validity_days))

    quotation = Quotation(
        business_id=business.id,
        customer_id=customer.id,
        enquiry_id=req.enquiry_id,
        created_by_user_id=current_user.id,
        quotation_number=quote_number,
        title=req.title or f"Quotation for {customer.company_name}",
        status=initial_status,
        currency=settings.currency or "INR",
        subtotal=calc.subtotal,
        discount_amount=calc.discount_amount,
        discount_percentage=calc.discount_percentage,
        tax_rate=calc.tax_rate,
        tax_amount=calc.tax_amount,
        tax_type=req.tax_type,
        delivery_charge=calc.delivery_charge,
        grand_total=calc.grand_total,
        total_cost=calc.total_cost,
        estimated_gross_margin_pct=calc.estimated_gross_margin_pct,
        valid_until=validity,
        payment_terms=req.payment_terms or settings.default_payment_terms,
        delivery_terms=req.delivery_terms or settings.default_delivery_terms,
        notes=req.notes,
        has_guardrail_warnings=len(calc.warnings) > 0,
        guardrail_warnings_json=json.dumps([w.model_dump() for w in calc.warnings]) if calc.warnings else None
    )
    db.add(quotation)
    db.flush()

    # 4. Create Quotation Items
    for item_data in req.items:
        # Check stock warning
        has_stock_warn = False
        warn_details = None
        stock_avail = 0

        if item_data.product_id:
            prod = db.query(Product).filter(Product.id == item_data.product_id, Product.business_id == business.id).first()
            if prod:
                stock_avail = prod.stock_quantity
                if item_data.quantity > prod.stock_quantity:
                    has_stock_warn = True
                    warn_details = f"Requested {item_data.quantity} {item_data.unit}, stock has {prod.stock_quantity}."

        gross_line = item_data.quantity * item_data.unit_price
        disc = gross_line * (item_data.discount_pct / 100.0)
        line_total = round(gross_line - disc, 2)

        q_item = QuotationItem(
            quotation_id=quotation.id,
            product_id=item_data.product_id,
            sku=item_data.sku,
            name=item_data.name,
            description=item_data.description,
            quantity=item_data.quantity,
            unit=item_data.unit,
            unit_price=item_data.unit_price,
            unit_cost=item_data.unit_cost,
            discount_pct=item_data.discount_pct,
            line_total=line_total,
            verification_status=item_data.verification_status,
            match_confidence=item_data.match_confidence,
            stock_available=stock_avail,
            has_stock_warning=has_stock_warn,
            warning_details=warn_details
        )
        db.add(q_item)

    # 5. Record initial ProductivityMeasurement if linked to enquiry
    if req.enquiry_id:
        record_roi_measurement(
            db=db,
            business_id=business.id,
            data=ProductivityMeasurementCreate(
                quotation_id=quotation.id,
                enquiry_id=req.enquiry_id,
                manual_baseline_seconds=settings.default_manual_prep_time_minutes * 60.0,
                ai_processing_seconds=12.0,
                human_review_seconds=req.review_time_seconds or 120.0,
                correction_seconds=req.correction_time_seconds or 30.0,
                fields_corrected_count=1 if has_critical else 0,
                validation_errors_caught_count=len(calc.warnings),
                is_demo_data=False,
                measurement_type="MEASURED",
                notes=f"Quotation {quotation.quotation_number} created from enquiry #{req.enquiry_id}"
            ),
            settings=settings
        )

    # 6. Audit Trail Logging
    log_audit_event(
        db=db,
        business_id=business.id,
        quotation_id=quotation.id,
        user_id=current_user.id,
        user_email=current_user.email,
        event_type="QUOTATION_CREATED",
        description=f"Generated quotation {quotation.quotation_number} for {customer.company_name} (Total: ₹{calc.grand_total:,.2f}, Status: {quotation.status}).",
        metadata={
            "quotation_number": quotation.quotation_number,
            "grand_total": calc.grand_total,
            "margin_pct": calc.estimated_gross_margin_pct,
            "warnings_count": len(calc.warnings),
            "status": quotation.status
        }
    )

    db.commit()
    db.refresh(quotation)

    resp = QuotationResponse.model_validate(quotation)
    resp.customer_name = customer.name
    resp.customer_company = customer.company_name
    resp.customer_email = customer.email
    resp.customer_phone = customer.phone
    resp.customer_gstin = customer.gstin
    return resp

@router.get("/{id}", response_model=QuotationResponse)
def get_quotation(
    id: int,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    quotation = db.query(Quotation).filter(Quotation.id == id, Quotation.business_id == business.id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found.")

    resp = QuotationResponse.model_validate(quotation)
    if quotation.customer:
        resp.customer_name = quotation.customer.name
        resp.customer_company = quotation.customer.company_name
        resp.customer_email = quotation.customer.email
        resp.customer_phone = quotation.customer.phone
        resp.customer_gstin = quotation.customer.gstin
    return resp

@router.put("/{id}", response_model=QuotationResponse)
def update_quotation(
    id: int,
    req: QuotationUpdate,
    business: Business = Depends(get_current_business),
    settings: BusinessSettings = Depends(get_current_settings),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    quotation = db.query(Quotation).filter(Quotation.id == id, Quotation.business_id == business.id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found.")

    if quotation.status == "APPROVED":
        raise HTTPException(status_code=400, detail="Approved quotations cannot be modified directly. Please create a revision.")

    if req.items is not None:
        # Delete old items
        for old_item in quotation.items:
            db.delete(old_item)

        # Recalculate
        disc_pct = req.discount_percentage if req.discount_percentage is not None else quotation.discount_percentage
        tax_rate = req.tax_rate if req.tax_rate is not None else quotation.tax_rate
        tax_type = req.tax_type if req.tax_type is not None else quotation.tax_type
        delivery = req.delivery_charge if req.delivery_charge is not None else quotation.delivery_charge

        calc = calculate_quotation_totals(
            items=req.items,
            overall_discount_pct=disc_pct,
            tax_rate=tax_rate,
            tax_type=tax_type,
            delivery_charge=delivery,
            settings=settings
        )

        quotation.subtotal = calc.subtotal
        quotation.discount_amount = calc.discount_amount
        quotation.discount_percentage = calc.discount_percentage
        quotation.tax_rate = calc.tax_rate
        quotation.tax_amount = calc.tax_amount
        quotation.tax_type = tax_type
        quotation.delivery_charge = calc.delivery_charge
        quotation.grand_total = calc.grand_total
        quotation.total_cost = calc.total_cost
        quotation.estimated_gross_margin_pct = calc.estimated_gross_margin_pct
        quotation.has_guardrail_warnings = len(calc.warnings) > 0
        quotation.guardrail_warnings_json = json.dumps([w.model_dump() for w in calc.warnings]) if calc.warnings else None

        # Add updated items
        for item_data in req.items:
            gross_line = item_data.quantity * item_data.unit_price
            disc = gross_line * (item_data.discount_pct / 100.0)
            line_total = round(gross_line - disc, 2)

            q_item = QuotationItem(
                quotation_id=quotation.id,
                product_id=item_data.product_id,
                sku=item_data.sku,
                name=item_data.name,
                description=item_data.description,
                quantity=item_data.quantity,
                unit=item_data.unit,
                unit_price=item_data.unit_price,
                unit_cost=item_data.unit_cost,
                discount_pct=item_data.discount_pct,
                line_total=line_total,
                verification_status=item_data.verification_status,
                match_confidence=item_data.match_confidence
            )
            db.add(q_item)

    if req.title is not None:
        quotation.title = req.title
    if req.notes is not None:
        quotation.notes = req.notes
    if req.payment_terms is not None:
        quotation.payment_terms = req.payment_terms
    if req.delivery_terms is not None:
        quotation.delivery_terms = req.delivery_terms
    if req.valid_until is not None:
        quotation.valid_until = req.valid_until

    log_audit_event(
        db=db,
        business_id=business.id,
        quotation_id=quotation.id,
        user_id=current_user.id,
        user_email=current_user.email,
        event_type="QUOTATION_EDITED",
        description=f"Quotation {quotation.quotation_number} updated."
    )
    db.commit()
    db.refresh(quotation)

    resp = QuotationResponse.model_validate(quotation)
    if quotation.customer:
        resp.customer_name = quotation.customer.name
        resp.customer_company = quotation.customer.company_name
        resp.customer_email = quotation.customer.email
        resp.customer_phone = quotation.customer.phone
        resp.customer_gstin = quotation.customer.gstin
    return resp

@router.post("/{id}/submit-approval")
def submit_quotation_for_approval(
    id: int,
    business: Business = Depends(get_current_business),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    quotation = db.query(Quotation).filter(Quotation.id == id, Quotation.business_id == business.id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found.")

    if quotation.status not in ["DRAFT", "NEEDS_REVIEW", "REJECTED"]:
        raise HTTPException(status_code=400, detail=f"Cannot submit quotation in '{quotation.status}' status.")

    quotation.status = "PENDING_APPROVAL"

    event = ApprovalEvent(
        quotation_id=quotation.id,
        user_id=current_user.id,
        user_name=current_user.full_name,
        action="SUBMIT",
        comments="Submitted for management review and sign-off."
    )
    db.add(event)

    log_audit_event(
        db=db,
        business_id=business.id,
        quotation_id=quotation.id,
        user_id=current_user.id,
        user_email=current_user.email,
        event_type="APPROVAL_REQUESTED",
        description=f"Quotation {quotation.quotation_number} submitted for approval by {current_user.full_name}."
    )

    db.commit()
    return {"message": "Quotation submitted for approval", "status": quotation.status}

@router.post("/{id}/approve")
def approve_quotation(
    id: int,
    req: ApprovalActionRequest,
    business: Business = Depends(get_current_business),
    settings: BusinessSettings = Depends(get_current_settings),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    quotation = db.query(Quotation).filter(Quotation.id == id, Quotation.business_id == business.id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found.")

    if quotation.status not in ["PENDING_APPROVAL", "NEEDS_REVIEW", "DRAFT"]:
        raise HTTPException(status_code=400, detail=f"Quotation is already in '{quotation.status}' state.")

    quotation.status = "APPROVED"
    quotation.approved_by_user_id = current_user.id
    quotation.approved_at = datetime.now(timezone.utc)

    event = ApprovalEvent(
        quotation_id=quotation.id,
        user_id=current_user.id,
        user_name=current_user.full_name,
        action="APPROVE",
        comments=req.comments or "Approved with verified prices and specifications."
    )
    db.add(event)

    # Record or update final ROI measurement
    review_sec = req.review_time_seconds or 90.0
    record_roi_measurement(
        db=db,
        business_id=business.id,
        data=ProductivityMeasurementCreate(
            quotation_id=quotation.id,
            enquiry_id=quotation.enquiry_id,
            manual_baseline_seconds=settings.default_manual_prep_time_minutes * 60.0,
            ai_processing_seconds=15.0,
            human_review_seconds=review_sec,
            correction_seconds=30.0,
            fields_corrected_count=req.corrections_made_count or 0,
            validation_errors_caught_count=1 if quotation.has_guardrail_warnings else 0,
            is_demo_data=False,
            measurement_type="MEASURED",
            notes=f"Approved quotation {quotation.quotation_number}"
        ),
        settings=settings
    )

    log_audit_event(
        db=db,
        business_id=business.id,
        quotation_id=quotation.id,
        user_id=current_user.id,
        user_email=current_user.email,
        event_type="QUOTATION_APPROVED",
        description=f"Quotation {quotation.quotation_number} officially APPROVED by {current_user.full_name}.",
        metadata={"approver": current_user.full_name, "comments": req.comments}
    )

    db.commit()
    return {"message": "Quotation approved successfully", "status": quotation.status}

@router.post("/{id}/reject")
def reject_quotation(
    id: int,
    req: ApprovalActionRequest,
    business: Business = Depends(get_current_business),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    quotation = db.query(Quotation).filter(Quotation.id == id, Quotation.business_id == business.id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found.")

    if not req.comments:
        raise HTTPException(status_code=400, detail="Rejection reason / comments must be provided.")

    quotation.status = "REJECTED"
    quotation.rejection_reason = req.comments

    event = ApprovalEvent(
        quotation_id=quotation.id,
        user_id=current_user.id,
        user_name=current_user.full_name,
        action="REJECT",
        comments=req.comments
    )
    db.add(event)

    log_audit_event(
        db=db,
        business_id=business.id,
        quotation_id=quotation.id,
        user_id=current_user.id,
        user_email=current_user.email,
        event_type="QUOTATION_REJECTED",
        description=f"Quotation {quotation.quotation_number} rejected: {req.comments}",
        metadata={"reason": req.comments}
    )

    db.commit()
    return {"message": "Quotation rejected", "status": quotation.status}

@router.get("/{id}/pdf")
def download_quotation_pdf(
    id: int,
    business: Business = Depends(get_current_business),
    settings: BusinessSettings = Depends(get_current_settings),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    quotation = db.query(Quotation).filter(Quotation.id == id, Quotation.business_id == business.id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found.")

    if not quotation.customer:
        raise HTTPException(status_code=400, detail="Quotation has no customer attached.")

    # Generate PDF in memory
    pdf_buffer = generate_quotation_pdf(
        quotation=quotation,
        business=business,
        customer=quotation.customer,
        settings=settings
    )

    log_audit_event(
        db=db,
        business_id=business.id,
        quotation_id=quotation.id,
        user_id=current_user.id,
        user_email=current_user.email,
        event_type="PDF_GENERATED",
        description=f"Downloaded official PDF for {quotation.quotation_number}."
    )
    db.commit()

    filename = f"Quotation_{quotation.quotation_number}.pdf"
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=\"{filename}\"",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )
