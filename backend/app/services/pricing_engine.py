from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any, Optional
from app.schemas.quotation import QuotationItemCreate, QuotationCalculationResponse, GuardrailWarning
from app.models.settings import BusinessSettings

def round_curr(val: Decimal) -> Decimal:
    """Rounds to 2 decimal places using standard financial ROUND_HALF_UP."""
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def calculate_quotation_totals(
    items: List[QuotationItemCreate],
    overall_discount_pct: float = 0.0,
    tax_rate: float = 18.0,
    tax_type: str = "INTRA_STATE_GST",
    delivery_charge: float = 0.0,
    settings: Optional[BusinessSettings] = None,
    customer_info: Optional[Dict[str, Any]] = None
) -> QuotationCalculationResponse:
    """
    Deterministic Decimal-based financial calculation engine.
    Calculates subtotal, line discounts, taxes (CGST/SGST or IGST), delivery,
    total costs, gross margin, and evaluates all pricing guardrails.
    """
    subtotal_d = Decimal("0.00")
    total_cost_d = Decimal("0.00")
    warnings: List[GuardrailWarning] = []

    min_margin = Decimal(str(settings.min_margin_threshold_pct if settings else 15.0))
    max_discount = Decimal(str(settings.max_discount_threshold_pct if settings else 20.0))

    # Evaluate line items
    for idx, item in enumerate(items):
        qty_d = Decimal(str(item.quantity))
        price_d = Decimal(str(item.unit_price))
        cost_d = Decimal(str(item.unit_cost))
        disc_pct_d = Decimal(str(item.discount_pct))

        # Line item subtotal
        gross_line_d = qty_d * price_d
        line_discount_d = gross_line_d * (disc_pct_d / Decimal("100.00"))
        net_line_d = gross_line_d - line_discount_d

        subtotal_d += net_line_d
        total_cost_d += (qty_d * cost_d)

        # Guardrail: Unmatched product
        if item.verification_status == "UNMATCHED":
            warnings.append(GuardrailWarning(
                code="UNMATCHED_PRODUCT",
                severity="CRITICAL",
                item_index=idx,
                item_name=item.name,
                message=f"Line item '{item.name}' is unmatched against the verified product catalogue.",
                data={"sku": item.sku, "status": item.verification_status}
            ))

        # Guardrail: Zero or missing price
        if price_d <= Decimal("0.00"):
            warnings.append(GuardrailWarning(
                code="MISSING_PRICE",
                severity="CRITICAL",
                item_index=idx,
                item_name=item.name,
                message=f"Line item '{item.name}' has zero or missing unit price.",
                data={"unit_price": float(price_d)}
            ))

        # Guardrail: Zero cost price check
        if cost_d <= Decimal("0.00"):
            warnings.append(GuardrailWarning(
                code="MISSING_COST",
                severity="WARNING",
                item_index=idx,
                item_name=item.name,
                message=f"Line item '{item.name}' has no unit cost defined; margin calculation may be distorted.",
                data={"unit_cost": float(cost_d)}
            ))

        # Guardrail: Line discount threshold
        if disc_pct_d > max_discount:
            warnings.append(GuardrailWarning(
                code="HIGH_DISCOUNT",
                severity="WARNING",
                item_index=idx,
                item_name=item.name,
                message=f"Discount of {disc_pct_d}% on '{item.name}' exceeds maximum allowed threshold ({max_discount}%).",
                data={"discount_pct": float(disc_pct_d), "max_allowed": float(max_discount)}
            ))

        # Guardrail: Line item margin check
        if price_d > 0 and cost_d > 0:
            effective_price = price_d * (Decimal("1.00") - (disc_pct_d / Decimal("100.00")))
            line_margin_pct = ((effective_price - cost_d) / effective_price) * Decimal("100.00")
            if line_margin_pct < min_margin:
                warnings.append(GuardrailWarning(
                    code="LOW_MARGIN",
                    severity="WARNING",
                    item_index=idx,
                    item_name=item.name,
                    message=f"Gross margin of {round_curr(line_margin_pct)}% on '{item.name}' is below the business minimum of {min_margin}%.",
                    data={"line_margin_pct": float(round_curr(line_margin_pct)), "threshold": float(min_margin)}
                ))

    # Overall discount
    overall_disc_pct_d = Decimal(str(overall_discount_pct))
    if overall_disc_pct_d > max_discount:
        warnings.append(GuardrailWarning(
            code="HIGH_OVERALL_DISCOUNT",
            severity="WARNING",
            item_name="Overall Quotation",
            message=f"Overall quotation discount of {overall_disc_pct_d}% exceeds policy limit ({max_discount}%).",
            data={"overall_discount_pct": float(overall_disc_pct_d)}
        ))

    overall_disc_amount_d = subtotal_d * (overall_disc_pct_d / Decimal("100.00"))
    taxable_amount_d = subtotal_d - overall_disc_amount_d

    # Taxes
    tax_rate_d = Decimal(str(tax_rate))
    tax_amount_d = taxable_amount_d * (tax_rate_d / Decimal("100.00"))

    cgst_d = Decimal("0.00")
    sgst_d = Decimal("0.00")
    igst_d = Decimal("0.00")

    if tax_type == "INTRA_STATE_GST":
        cgst_d = tax_amount_d / Decimal("2.00")
        sgst_d = tax_amount_d / Decimal("2.00")
    else:  # INTER_STATE_IGST
        igst_d = tax_amount_d

    delivery_charge_d = Decimal(str(delivery_charge))
    grand_total_d = taxable_amount_d + tax_amount_d + delivery_charge_d

    # Overall Margin calculation
    gross_profit_d = taxable_amount_d - total_cost_d
    if taxable_amount_d > Decimal("0.00"):
        gross_margin_pct_d = (gross_profit_d / taxable_amount_d) * Decimal("100.00")
    else:
        gross_margin_pct_d = Decimal("0.00")

    if gross_margin_pct_d < min_margin and taxable_amount_d > Decimal("0.00"):
        warnings.append(GuardrailWarning(
            code="LOW_OVERALL_MARGIN",
            severity="CRITICAL",
            item_name="Total Quotation",
            message=f"Overall gross margin {round_curr(gross_margin_pct_d)}% is below company target of {min_margin}%. Requires management sign-off.",
            data={"margin_pct": float(round_curr(gross_margin_pct_d)), "min_margin": float(min_margin)}
        ))

    # Customer info guardrail
    if customer_info:
        if not customer_info.get("phone") and not customer_info.get("email"):
            warnings.append(GuardrailWarning(
                code="INCOMPLETE_CUSTOMER_INFO",
                severity="WARNING",
                message="Customer record has neither a phone number nor an email address.",
                data=customer_info
            ))

    return QuotationCalculationResponse(
        subtotal=float(round_curr(subtotal_d)),
        discount_amount=float(round_curr(overall_disc_amount_d)),
        discount_percentage=float(round_curr(overall_disc_pct_d)),
        taxable_amount=float(round_curr(taxable_amount_d)),
        tax_rate=float(tax_rate_d),
        tax_amount=float(round_curr(tax_amount_d)),
        cgst_amount=float(round_curr(cgst_d)),
        sgst_amount=float(round_curr(sgst_d)),
        igst_amount=float(round_curr(igst_d)),
        delivery_charge=float(round_curr(delivery_charge_d)),
        grand_total=float(round_curr(grand_total_d)),
        total_cost=float(round_curr(total_cost_d)),
        estimated_gross_profit=float(round_curr(gross_profit_d)),
        estimated_gross_margin_pct=float(round_curr(gross_margin_pct_d)),
        warnings=warnings
    )
