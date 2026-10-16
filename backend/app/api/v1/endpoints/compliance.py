from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_hr_role
from app.schemas.compliance import ComplianceMetricsResponse
from app.services.compliance_service import calculate_eeoc_compliance_metrics
from app.models import User

router = APIRouter()

@router.get("/metrics", response_model=ComplianceMetricsResponse)
def get_compliance_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    """
    Returns automated statistical audit metrics evaluating:
    - EEOC Four-Fifths (80%) Rule for Disparate Impact
    - EU AI Act Annex III (Point 4: High-Risk Employment Systems)
    """
    return calculate_eeoc_compliance_metrics(db)
