import io
import csv
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from app.core.database import get_db
from app.models.product import Product
from app.models.business import Business
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, ProductListResponse
from app.api.v1.deps import get_current_user, get_current_business
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/products", tags=["Product Catalogue & Inventory"])

@router.get("/", response_model=ProductListResponse)
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    low_stock_only: bool = False,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    query = db.query(Product).filter(Product.business_id == business.id)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Product.name.ilike(term),
                Product.sku.ilike(term),
                Product.description.ilike(term),
                Product.category.ilike(term)
            )
        )

    if category:
        query = query.filter(Product.category == category)

    if low_stock_only:
        query = query.filter(Product.stock_quantity <= Product.reorder_threshold)

    total = query.count()
    items = query.order_by(Product.name.asc()).offset((page - 1) * page_size).limit(page_size).all()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return ProductListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    req: ProductCreate,
    business: Business = Depends(get_current_business),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify SKU uniqueness within this business
    existing = db.query(Product).filter(
        Product.business_id == business.id,
        Product.sku == req.sku.strip()
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with SKU '{req.sku}' already exists in your catalogue."
        )

    product = Product(
        business_id=business.id,
        sku=req.sku.strip(),
        name=req.name.strip(),
        description=req.description,
        category=req.category.strip(),
        unit=req.unit.strip().upper(),
        hsn_code=req.hsn_code,
        unit_selling_price=req.unit_selling_price,
        unit_cost=req.unit_cost,
        stock_quantity=req.stock_quantity,
        reorder_threshold=req.reorder_threshold,
        is_active=req.is_active
    )
    db.add(product)
    db.flush()

    log_audit_event(
        db=db,
        business_id=business.id,
        user_id=current_user.id,
        user_email=current_user.email,
        event_type="PRODUCT_CREATED",
        description=f"Added catalogue product '{product.name}' [SKU: {product.sku}].",
        metadata={"sku": product.sku, "price": product.unit_selling_price, "stock": product.stock_quantity}
    )
    db.commit()
    db.refresh(product)
    return product

@router.get("/{id}", response_model=ProductResponse)
def get_product(
    id: int,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == id, Product.business_id == business.id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found in this business catalogue.")
    return product

@router.put("/{id}", response_model=ProductResponse)
def update_product(
    id: int,
    req: ProductUpdate,
    business: Business = Depends(get_current_business),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == id, Product.business_id == business.id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found in this business catalogue.")

    update_dict = req.model_dump(exclude_unset=True)

    if "sku" in update_dict and update_dict["sku"]:
        sku_clean = update_dict["sku"].strip()
        existing = db.query(Product).filter(
            Product.business_id == business.id,
            Product.sku == sku_clean,
            Product.id != id
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Another product with SKU '{sku_clean}' already exists.")
        update_dict["sku"] = sku_clean

    for k, v in update_dict.items():
        setattr(product, k, v)

    log_audit_event(
        db=db,
        business_id=business.id,
        user_id=current_user.id,
        user_email=current_user.email,
        event_type="PRODUCT_UPDATED",
        description=f"Updated product '{product.name}' [SKU: {product.sku}].",
        metadata={"fields_updated": list(update_dict.keys())}
    )
    db.commit()
    db.refresh(product)
    return product

@router.delete("/{id}")
def delete_product(
    id: int,
    business: Business = Depends(get_current_business),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == id, Product.business_id == business.id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found in this business catalogue.")

    db.delete(product)
    log_audit_event(
        db=db,
        business_id=business.id,
        user_id=current_user.id,
        user_email=current_user.email,
        event_type="PRODUCT_DELETED",
        description=f"Deleted catalogue product '{product.name}' [SKU: {product.sku}]."
    )
    db.commit()
    return {"message": "Product deleted successfully", "id": id}

@router.post("/import-csv")
async def import_products_csv(
    file: UploadFile = File(...),
    business: Business = Depends(get_current_business),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are accepted for import.")

    content = await file.read()
    try:
        csv_text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        csv_text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(csv_text))
    created_count = 0
    updated_count = 0
    errors = []

    for row_idx, row in enumerate(reader, start=2):
        try:
            sku = row.get("sku") or row.get("SKU")
            name = row.get("name") or row.get("Product Name") or row.get("Name")
            if not sku or not name:
                errors.append(f"Row {row_idx}: Missing required SKU or Name.")
                continue

            category = row.get("category") or row.get("Category") or "General"
            unit = (row.get("unit") or row.get("Unit") or "PCS").strip().upper()
            selling_price = float(row.get("unit_selling_price") or row.get("Selling Price") or row.get("Price") or 0.0)
            cost_price = float(row.get("unit_cost") or row.get("Cost Price") or row.get("Cost") or 0.0)
            stock = int(float(row.get("stock_quantity") or row.get("Stock") or row.get("Quantity") or 0))
            reorder = int(float(row.get("reorder_threshold") or row.get("Reorder") or 5))
            desc = row.get("description") or row.get("Description") or ""
            hsn = row.get("hsn_code") or row.get("HSN") or ""

            product = db.query(Product).filter(
                Product.business_id == business.id,
                Product.sku == sku.strip()
            ).first()

            if product:
                product.name = name.strip()
                product.category = category.strip()
                product.unit = unit
                product.unit_selling_price = max(0.0, selling_price)
                product.unit_cost = max(0.0, cost_price)
                product.stock_quantity = max(0, stock)
                product.reorder_threshold = max(0, reorder)
                if desc:
                    product.description = desc
                if hsn:
                    product.hsn_code = hsn
                updated_count += 1
            else:
                new_prod = Product(
                    business_id=business.id,
                    sku=sku.strip(),
                    name=name.strip(),
                    category=category.strip(),
                    unit=unit,
                    unit_selling_price=max(0.0, selling_price),
                    unit_cost=max(0.0, cost_price),
                    stock_quantity=max(0, stock),
                    reorder_threshold=max(0, reorder),
                    description=desc,
                    hsn_code=hsn,
                    is_active=True
                )
                db.add(new_prod)
                created_count += 1
        except Exception as e:
            errors.append(f"Row {row_idx}: {str(e)}")

    db.commit()

    log_audit_event(
        db=db,
        business_id=business.id,
        user_id=current_user.id,
        user_email=current_user.email,
        event_type="PRODUCTS_CSV_IMPORTED",
        description=f"CSV catalogue imported: {created_count} created, {updated_count} updated, {len(errors)} errors.",
        metadata={"created": created_count, "updated": updated_count, "error_count": len(errors)}
    )

    return {
        "success": True,
        "created_count": created_count,
        "updated_count": updated_count,
        "errors": errors
    }

@router.get("/export-csv")
def export_products_csv(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    products = db.query(Product).filter(Product.business_id == business.id).order_by(Product.name.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "sku", "name", "category", "unit", "hsn_code", "unit_selling_price",
        "unit_cost", "stock_quantity", "reorder_threshold", "is_active", "description"
    ])

    for p in products:
        writer.writerow([
            p.sku, p.name, p.category, p.unit, p.hsn_code or "", p.unit_selling_price,
            p.unit_cost, p.stock_quantity, p.reorder_threshold, p.is_active, p.description or ""
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=products_{business.slug}.csv"}
    )
