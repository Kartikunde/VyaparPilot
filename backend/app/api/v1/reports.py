import io
import csv
from typing import Optional
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.quotation import Quotation, QuotationItem
from app.models.business import Business
from app.models.customer import Customer
from app.api.v1.deps import get_current_user, get_current_business

router = APIRouter(prefix="/reports", tags=["Business Reports & Analytics"])

@router.get("/summary")
def get_business_report_summary(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    """Aggregates executive business health, quotation pipeline and product volume stats."""
    quotes = db.query(Quotation).filter(Quotation.business_id == business.id).all()

    total_quotes = len(quotes)
    status_counts = {
        "DRAFT": 0,
        "NEEDS_REVIEW": 0,
        "PENDING_APPROVAL": 0,
        "APPROVED": 0,
        "REJECTED": 0,
        "CANCELLED": 0
    }
    approved_revenue = 0.0
    total_pipeline_val = 0.0
    sum_margin = 0.0

    for q in quotes:
        status_counts[q.status] = status_counts.get(q.status, 0) + 1
        total_pipeline_val += q.grand_total
        sum_margin += q.estimated_gross_margin_pct
        if q.status == "APPROVED":
            approved_revenue += q.grand_total

    avg_margin = (sum_margin / total_quotes) if total_quotes > 0 else 0.0
    avg_quote_val = (total_pipeline_val / total_quotes) if total_quotes > 0 else 0.0

    # Top products by frequency in quotation items
    top_items_query = (
        db.query(QuotationItem.name, func.count(QuotationItem.id).label("freq"), func.sum(QuotationItem.quantity).label("total_qty"))
        .join(Quotation)
        .filter(Quotation.business_id == business.id)
        .group_by(QuotationItem.name)
        .order_by(func.count(QuotationItem.id).desc())
        .limit(5)
        .all()
    )

    top_items = [
        {"name": row[0], "quotation_count": row[1], "total_quantity": float(row[2] or 0)}
        for row in top_items_query
    ]

    return {
        "total_quotations": total_quotes,
        "status_distribution": status_counts,
        "approved_revenue": round(approved_revenue, 2),
        "total_pipeline_value": round(total_pipeline_val, 2),
        "average_quotation_value": round(avg_quote_val, 2),
        "average_gross_margin_pct": round(avg_margin, 1),
        "top_quoted_products": top_items
    }

@router.get("/export-csv")
def export_quotations_csv(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    quotes = db.query(Quotation).filter(Quotation.business_id == business.id).order_by(Quotation.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "quotation_number", "date", "customer_company", "customer_name", "status",
        "subtotal", "discount_amount", "tax_amount", "delivery_charge",
        "grand_total", "estimated_margin_pct"
    ])

    for q in quotes:
        writer.writerow([
            q.quotation_number,
            q.created_at.strftime("%Y-%m-%d"),
            q.customer.company_name if q.customer else "",
            q.customer.name if q.customer else "",
            q.status,
            q.subtotal,
            q.discount_amount,
            q.tax_amount,
            q.delivery_charge,
            q.grand_total,
            q.estimated_gross_margin_pct
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=quotations_{business.slug}.csv"}
    )
