from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class ApprovalActionRequest(BaseModel):
    action: str  # APPROVE, REJECT, RETURN
    comments: Optional[str] = None
    review_time_seconds: Optional[float] = None
    corrections_made_count: Optional[int] = 0

class ApprovalEventResponse(BaseModel):
    id: int
    quotation_id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    action: str
    comments: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
