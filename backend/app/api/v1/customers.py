from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.models.customer import Customer
from app.models.business import Business
from app.models.user import User
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse
from app.api.v1.deps import get_current_user, get_current_business
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("/", response_model=List[CustomerResponse])
def list_customers(
    search: Optional[str] = None,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    query = db.query(Customer).filter(Customer.business_id == business.id)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Customer.name.ilike(term),
                Customer.company_name.ilike(term),
                Customer.phone.ilike(term),
                Customer.email.ilike(term)
            )
        )
    return query.order_by(Customer.company_name.asc()).all()

@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    req: CustomerCreate,
    business: Business = Depends(get_current_business),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    customer = Customer(
        business_id=business.id,
        name=req.name.strip(),
        company_name=req.company_name.strip(),
        email=req.email.strip() if req.email else None,
        phone=req.phone.strip(),
        gstin=req.gstin.strip() if req.gstin else None,
        billing_address=req.billing_address,
        shipping_address=req.shipping_address or req.billing_address,
        city=req.city,
        state=req.state,
        pincode=req.pincode
    )
    db.add(customer)
    db.flush()

    log_audit_event(
        db=db,
        business_id=business.id,
        user_id=current_user.id,
        user_email=current_user.email,
        event_type="CUSTOMER_CREATED",
        description=f"Created customer '{customer.name}' ({customer.company_name}).",
        metadata={"customer_id": customer.id, "company": customer.company_name}
    )
    db.commit()
    db.refresh(customer)
    return customer

@router.get("/{id}", response_model=CustomerResponse)
def get_customer(
    id: int,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.id == id, Customer.business_id == business.id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found.")
    return customer

@router.put("/{id}", response_model=CustomerResponse)
def update_customer(
    id: int,
    req: CustomerUpdate,
    business: Business = Depends(get_current_business),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.id == id, Customer.business_id == business.id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found.")

    update_dict = req.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(customer, k, v)

    db.commit()
    db.refresh(customer)
    return customer
