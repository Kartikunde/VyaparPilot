import re
from difflib import SequenceMatcher
from typing import List, Tuple, Optional
from app.models.product import Product
from app.models.settings import BusinessSettings
from app.schemas.enquiry import ExtractedItem, MatchedEnquiryItem, ProductMatchCandidate

def normalize_text(text: str) -> str:
    """Normalize text by lowercasing, stripping punctuation and extra spaces."""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    return ' '.join(text.split())

def calculate_similarity(query: str, target: str) -> float:
    """Calculate normalized token-aware similarity score between 0.0 and 1.0."""
    norm_q = normalize_text(query)
    norm_t = normalize_text(target)
    
    if not norm_q or not norm_t:
        return 0.0
    
    # Exact match check
    if norm_q == norm_t:
        return 1.0
        
    # Substring / containment check
    if norm_q in norm_t or norm_t in norm_q:
        len_ratio = min(len(norm_q), len(norm_t)) / max(len(norm_q), len(norm_t))
        return max(0.85, len_ratio)

    # Word intersection overlap (Jaccard-like bonus)
    q_words = set(norm_q.split())
    t_words = set(norm_t.split())
    if q_words and t_words:
        intersection = q_words.intersection(t_words)
        overlap_score = len(intersection) / len(q_words)
        if overlap_score >= 0.75:
            return max(0.80, overlap_score)
            
    # Sequence matcher fallback
    return SequenceMatcher(None, norm_q, norm_t).ratio()

def match_enquiry_item_to_catalogue(
    item: ExtractedItem,
    catalogue_products: List[Product],
    settings: Optional[BusinessSettings] = None
) -> MatchedEnquiryItem:
    """
    Matches a single extracted enquiry item against the business catalogue.
    Returns matched item with confidence score, candidates list, stock and margin warnings.
    """
    candidates: List[ProductMatchCandidate] = []
    min_margin = settings.min_margin_threshold_pct if settings else 15.0

    raw_query = f"{item.product_query} {item.specifications or ''}".strip()
    norm_query = normalize_text(raw_query)

    for p in catalogue_products:
        if not p.is_active:
            continue

        # 1. Exact SKU check
        sku_norm = normalize_text(p.sku)
        if sku_norm and (sku_norm == norm_query or sku_norm in norm_query):
            score = 1.0
        else:
            # 2. Product Name and Description similarity
            name_score = calculate_similarity(raw_query, p.name)
            desc_score = calculate_similarity(raw_query, p.description or "") * 0.8
            sku_score = calculate_similarity(raw_query, p.sku) * 0.9
            score = max(name_score, desc_score, sku_score)

        if score >= 0.35:
            candidates.append(ProductMatchCandidate(
                product_id=p.id,
                sku=p.sku,
                name=p.name,
                category=p.category,
                unit=p.unit,
                unit_selling_price=p.unit_selling_price,
                unit_cost=p.unit_cost,
                stock_quantity=p.stock_quantity,
                match_score=round(score, 3)
            ))

    # Sort candidates by match_score descending
    candidates.sort(key=lambda x: x.match_score, reverse=True)

    # Determine best match
    best_product: Optional[Product] = None
    best_score = 0.0

    if candidates:
        top_cand = candidates[0]
        best_score = top_cand.match_score
        # Find product in list
        best_product = next((p for p in catalogue_products if p.id == top_cand.product_id), None)

    # Classification
    if best_score >= 0.88 and best_product:
        match_type = "VERIFIED_EXACT"
    elif best_score >= 0.50 and best_product:
        match_type = "SUGGESTED_MATCH"
    else:
        match_type = "UNMATCHED"
        best_product = None

    # Calculate item values
    unit_price = best_product.unit_selling_price if best_product else 0.0
    unit_cost = best_product.unit_cost if best_product else 0.0
    stock_avail = best_product.stock_quantity if best_product else 0
    sku = best_product.sku if best_product else None
    name = best_product.name if best_product else item.product_query
    desc = best_product.description if best_product else item.specifications
    unit = best_product.unit if best_product else item.unit

    line_total = item.quantity * unit_price

    # Check warnings
    has_stock_warn = False
    has_margin_warn = False
    warning_msgs = []

    if best_product:
        if item.quantity > best_product.stock_quantity:
            has_stock_warn = True
            warning_msgs.append(f"Insufficient stock: requested {item.quantity} {unit}, but only {best_product.stock_quantity} available.")
        
        if unit_price > 0 and unit_cost > 0:
            margin_pct = ((unit_price - unit_cost) / unit_price) * 100.0
            if margin_pct < min_margin:
                has_margin_warn = True
                warning_msgs.append(f"Low margin: item margin is {margin_pct:.1f}%, below target {min_margin}%.")
    else:
        warning_msgs.append("Item is not verified in product catalogue. Requires manual verification or product creation.")

    return MatchedEnquiryItem(
        original_item=item,
        match_type=match_type,
        match_confidence=round(best_score, 2),
        matched_product_id=best_product.id if best_product else None,
        sku=sku,
        name=name,
        description=desc,
        unit_selling_price=unit_price,
        unit_cost=unit_cost,
        stock_available=stock_avail,
        quantity=item.quantity,
        unit=unit,
        line_total=round(line_total, 2),
        has_stock_warning=has_stock_warn,
        has_margin_warning=has_margin_warn,
        warning_details=" | ".join(warning_msgs) if warning_msgs else None,
        candidates=candidates[:5]  # Top 5 candidates for manual review
    )
