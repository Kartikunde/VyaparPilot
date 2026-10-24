from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class AuditEventResponse(BaseModel):
    id: int
    business_id: int
    quotation_id: Optional[int] = None
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    event_type: str
    description: str
    metadata_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AuditListResponse(BaseModel):
    items: list[AuditEventResponse]
    total: int
