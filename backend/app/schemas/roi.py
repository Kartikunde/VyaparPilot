from typing import List, Optional, Dict
from pydantic import BaseModel
from datetime import datetime

class ProductivityMeasurementCreate(BaseModel):
    quotation_id: Optional[int] = None
    enquiry_id: Optional[int] = None
    manual_baseline_seconds: Optional[float] = None
    ai_processing_seconds: float = 15.0
    human_review_seconds: float = 120.0
    correction_seconds: float = 30.0
    fields_corrected_count: int = 0
    validation_errors_caught_count: int = 0
    is_demo_data: bool = False
    measurement_type: str = "MEASURED"
    notes: Optional[str] = None

class ProductivityMeasurementResponse(BaseModel):
    id: int
    business_id: int
    quotation_id: Optional[int] = None
    enquiry_id: Optional[int] = None
    manual_baseline_seconds: float
    ai_processing_seconds: float
    human_review_seconds: float
    correction_seconds: float
    total_ai_assisted_seconds: float
    time_saved_seconds: float
    time_reduction_pct: float
    fields_corrected_count: int
    validation_errors_caught_count: int
    labour_cost_per_hour: float
    estimated_labour_value_saved: float
    ai_operating_cost: float
    net_benefit: float
    is_demo_data: bool
    measurement_type: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ROITrendPoint(BaseModel):
    date: str
    manual_time_mins: float
    ai_assisted_time_mins: float
    time_saved_mins: float
    quotations_count: int
    labour_value_saved: float

class ROISummaryResponse(BaseModel):
    total_quotations_processed: int
    measured_quotations_count: int
    demo_quotations_count: int
    baseline_estimate_count: int
    
    avg_manual_prep_time_minutes: float
    avg_ai_assisted_prep_time_minutes: float
    avg_time_saved_per_quotation_minutes: float
    total_time_saved_hours: float
    avg_time_reduction_percentage: float
    
    total_fields_corrected: int
    field_correction_rate_pct: float
    total_validation_errors_caught: int
    
    configured_labour_cost_per_hour: float
    currency_symbol: str = "₹"
    total_estimated_labour_value_saved: float
    total_ai_operating_costs: float
    net_productivity_benefit: float
    
    sample_size_info: Dict[str, int]
    trend_data: List[ROITrendPoint] = []
