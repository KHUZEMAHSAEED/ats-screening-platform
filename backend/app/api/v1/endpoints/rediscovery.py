from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_hr_role
from app.models import User
from app.schemas.rediscovery import RediscoveryResponse
from app.services.rediscovery_service import rediscover_candidates_for_job

router = APIRouter()

@router.get("/{job_id}", response_model=RediscoveryResponse)
def get_job_rediscovery(
    job_id: str,
    min_score: float = Query(50.0, ge=0.0, le=100.0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    """
    Talent Pool Rediscovery:
    Queries historical candidates screened across other job openings
    and matches them against the target job criteria to identify transferable talent.
    """
    return rediscover_candidates_for_job(db=db, job_id=job_id, min_match_score=min_score)
