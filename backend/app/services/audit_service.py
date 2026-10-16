from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import AuditLog, User
from datetime import datetime, timezone

def log_audit_event(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: str,
    user: Optional[User] = None,
    application_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
) -> AuditLog:
    """
    Creates an immutable audit log entry for compliance and tracking.
    """
    log_entry = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user.id if user else None,
        user_email=user.email if user else "SYSTEM",
        application_id=application_id,
        details=details or {},
        ip_address=ip_address,
        created_at=datetime.now(timezone.utc)
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
