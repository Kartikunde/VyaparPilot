import json
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models.audit import AuditEvent

def log_audit_event(
    db: Session,
    business_id: int,
    event_type: str,
    description: str,
    quotation_id: Optional[int] = None,
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None
) -> AuditEvent:
    """
    Append-only audit trail logger.
    Ensures immutable logging of all critical business actions.
    Filters out any potential secrets from metadata.
    """
    safe_metadata = None
    if metadata:
        # Sanitize metadata to never include password or sensitive keys
        sanitized = {
            k: v for k, v in metadata.items()
            if not any(secret in k.lower() for secret in ["password", "secret", "token", "key"])
        }
        safe_metadata = json.dumps(sanitized)

    event = AuditEvent(
        business_id=business_id,
        quotation_id=quotation_id,
        user_id=user_id,
        user_email=user_email,
        event_type=event_type,
        description=description,
        metadata_json=safe_metadata
    )
    db.add(event)
    db.flush()
    return event
