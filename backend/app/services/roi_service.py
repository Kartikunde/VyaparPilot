from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.roi import ProductivityMeasurement
from app.models.settings import BusinessSettings
from app.schemas.roi import (
    ProductivityMeasurementCreate, ProductivityMeasurementResponse,
    ROISummaryResponse, ROITrendPoint
)

def record_roi_measurement(
    db: Session,
    business_id: int,
    data: ProductivityMeasurementCreate,
    settings: Optional[BusinessSettings] = None
) -> ProductivityMeasurement:
    """
    Records a precise productivity measurement for a quotation workflow.
    Applies deterministic formulas for time saved, percentage reduction,
    labour value, and net benefit after operating costs.
    """
    manual_baseline = data.manual_baseline_seconds
    if manual_baseline is None or manual_baseline <= 0:
        if settings and settings.default_manual_prep_time_minutes:
            manual_baseline = settings.default_manual_prep_time_minutes * 60.0
        else:
            manual_baseline = 2100.0  # 35 min default

    ai_time = max(0.0, data.ai_processing_seconds)
    review_time = max(0.0, data.human_review_seconds)
    corr_time = max(0.0, data.correction_seconds)

    total_ai_assisted = ai_time + review_time + corr_time
    time_saved = max(0.0, manual_baseline - total_ai_assisted)

    if manual_baseline > 0:
        reduction_pct = (time_saved / manual_baseline) * 100.0
    else:
        reduction_pct = 0.0

    labour_rate = settings.labour_cost_per_hour if settings else 350.0
    labour_val_saved = (time_saved / 3600.0) * labour_rate
    ai_cost = 0.50 if not data.is_demo_data else 0.0  # ~0.50 INR per extraction call
    net_benefit = labour_val_saved - ai_cost

    measurement = ProductivityMeasurement(
        business_id=business_id,
        quotation_id=data.quotation_id,
        enquiry_id=data.enquiry_id,
        manual_baseline_seconds=round(manual_baseline, 1),
        ai_processing_seconds=round(ai_time, 1),
        human_review_seconds=round(review_time, 1),
        correction_seconds=round(corr_time, 1),
        total_ai_assisted_seconds=round(total_ai_assisted, 1),
        time_saved_seconds=round(time_saved, 1),
        time_reduction_pct=round(reduction_pct, 1),
        fields_corrected_count=data.fields_corrected_count,
        validation_errors_caught_count=data.validation_errors_caught_count,
        labour_cost_per_hour=round(labour_rate, 2),
        estimated_labour_value_saved=round(labour_val_saved, 2),
        ai_operating_cost=round(ai_cost, 2),
        net_benefit=round(net_benefit, 2),
        is_demo_data=data.is_demo_data,
        measurement_type=data.measurement_type,
        notes=data.notes
    )

    db.add(measurement)
    db.flush()
    return measurement

def compute_business_roi_summary(
    db: Session,
    business_id: int,
    settings: Optional[BusinessSettings] = None,
    filter_type: Optional[str] = None  # None (all), "MEASURED", "DEMO_SEEDED"
) -> ROISummaryResponse:
    """
    Calculates verifiable ROI metrics from actual database records.
    Clearly distinguishes measured production records from seeded demo entries.
    """
    query = db.query(ProductivityMeasurement).filter(ProductivityMeasurement.business_id == business_id)
    if filter_type:
        query = query.filter(ProductivityMeasurement.measurement_type == filter_type)

    records = query.order_by(ProductivityMeasurement.created_at.asc()).all()

    total_count = len(records)
    measured_count = sum(1 for r in records if r.measurement_type == "MEASURED")
    demo_count = sum(1 for r in records if r.is_demo_data or r.measurement_type == "DEMO_SEEDED")
    baseline_count = sum(1 for r in records if r.measurement_type == "BASELINE_ESTIMATE")

    if total_count == 0:
        return ROISummaryResponse(
            total_quotations_processed=0,
            measured_quotations_count=0,
            demo_quotations_count=0,
            baseline_estimate_count=0,
            avg_manual_prep_time_minutes=0.0,
            avg_ai_assisted_prep_time_minutes=0.0,
            avg_time_saved_per_quotation_minutes=0.0,
            total_time_saved_hours=0.0,
            avg_time_reduction_percentage=0.0,
            total_fields_corrected=0,
            field_correction_rate_pct=0.0,
            total_validation_errors_caught=0,
            configured_labour_cost_per_hour=settings.labour_cost_per_hour if settings else 350.0,
            currency_symbol="₹",
            total_estimated_labour_value_saved=0.0,
            total_ai_operating_costs=0.0,
            net_productivity_benefit=0.0,
            sample_size_info={
                "total": 0,
                "measured": 0,
                "demo": 0,
                "baseline_estimates": 0
            },
            trend_data=[]
        )

    sum_manual = sum(r.manual_baseline_seconds for r in records)
    sum_assisted = sum(r.total_ai_assisted_seconds for r in records)
    sum_saved = sum(r.time_saved_seconds for r in records)
    sum_labour_val = sum(r.estimated_labour_value_saved for r in records)
    sum_ai_costs = sum(r.ai_operating_cost for r in records)
    sum_net = sum(r.net_benefit for r in records)
    sum_errors = sum(r.validation_errors_caught_count for r in records)
    sum_corrections = sum(r.fields_corrected_count for r in records)

    avg_manual_mins = (sum_manual / total_count) / 60.0
    avg_assisted_mins = (sum_assisted / total_count) / 60.0
    avg_saved_mins = (sum_saved / total_count) / 60.0
    total_saved_hours = sum_saved / 3600.0

    avg_reduction_pct = (sum_saved / sum_manual * 100.0) if sum_manual > 0 else 0.0
    correction_rate = (sum_corrections / total_count) if total_count > 0 else 0.0

    # Trend aggregation by day/record
    trend_data: List[ROITrendPoint] = []
    daily_buckets: Dict[str, Dict] = {}

    for r in records:
        day_key = r.created_at.strftime("%d %b")
        if day_key not in daily_buckets:
            daily_buckets[day_key] = {
                "manual_mins": 0.0,
                "assisted_mins": 0.0,
                "saved_mins": 0.0,
                "count": 0,
                "labour_val": 0.0
            }
        b = daily_buckets[day_key]
        b["manual_mins"] += r.manual_baseline_seconds / 60.0
        b["assisted_mins"] += r.total_ai_assisted_seconds / 60.0
        b["saved_mins"] += r.time_saved_seconds / 60.0
        b["count"] += 1
        b["labour_val"] += r.estimated_labour_value_saved

    for d_str, b in daily_buckets.items():
        cnt = b["count"]
        trend_data.append(ROITrendPoint(
            date=d_str,
            manual_time_mins=round(b["manual_mins"] / cnt, 1),
            ai_assisted_time_mins=round(b["assisted_mins"] / cnt, 1),
            time_saved_mins=round(b["saved_mins"] / cnt, 1),
            quotations_count=cnt,
            labour_value_saved=round(b["labour_val"], 2)
        ))

    return ROISummaryResponse(
        total_quotations_processed=total_count,
        measured_quotations_count=measured_count,
        demo_quotations_count=demo_count,
        baseline_estimate_count=baseline_count,
        avg_manual_prep_time_minutes=round(avg_manual_mins, 1),
        avg_ai_assisted_prep_time_minutes=round(avg_assisted_mins, 1),
        avg_time_saved_per_quotation_minutes=round(avg_saved_mins, 1),
        total_time_saved_hours=round(total_saved_hours, 1),
        avg_time_reduction_percentage=round(avg_reduction_pct, 1),
        total_fields_corrected=sum_corrections,
        field_correction_rate_pct=round(correction_rate * 100.0, 1),
        total_validation_errors_caught=sum_errors,
        configured_labour_cost_per_hour=settings.labour_cost_per_hour if settings else 350.0,
        currency_symbol="₹",
        total_estimated_labour_value_saved=round(sum_labour_val, 2),
        total_ai_operating_costs=round(sum_ai_costs, 2),
        net_productivity_benefit=round(sum_net, 2),
        sample_size_info={
            "total": total_count,
            "measured": measured_count,
            "demo": demo_count,
            "baseline_estimates": baseline_count
        },
        trend_data=trend_data
    )
