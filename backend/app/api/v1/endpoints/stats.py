from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.security import get_current_user
from app.models import (
    ResumeDocument, JobApplication, User,
    RecommendationStatus, HRDecisionType, ProcessingStatus
)

router = APIRouter()

@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total_resumes = db.query(func.count(ResumeDocument.id)).scalar() or 0
    resumes_processed = db.query(func.count(JobApplication.id)).filter(
        JobApplication.processing_status == ProcessingStatus.COMPLETED.value
    ).scalar() or 0

    recommended = db.query(func.count(JobApplication.id)).filter(
        JobApplication.recommendation_status == RecommendationStatus.RECOMMENDED_FOR_SHORTLISTING.value
    ).scalar() or 0

    awaiting_review = db.query(func.count(JobApplication.id)).filter(
        JobApplication.hr_decision == HRDecisionType.PENDING_REVIEW.value
    ).scalar() or 0

    shortlisted = db.query(func.count(JobApplication.id)).filter(
        JobApplication.hr_decision == HRDecisionType.SHORTLISTED.value
    ).scalar() or 0

    rejected = db.query(func.count(JobApplication.id)).filter(
        JobApplication.hr_decision == HRDecisionType.REJECTED.value
    ).scalar() or 0

    on_hold = db.query(func.count(JobApplication.id)).filter(
        JobApplication.hr_decision == HRDecisionType.ON_HOLD.value
    ).scalar() or 0

    failures = db.query(func.count(ResumeDocument.id)).filter(
        ResumeDocument.upload_status == ProcessingStatus.FAILED.value
    ).scalar() or 0

    return {
        "total_uploaded_resumes": total_resumes,
        "resumes_processed": resumes_processed,
        "recommended_for_shortlisting": recommended,
        "awaiting_hr_review": awaiting_review,
        "shortlisted_by_hr": shortlisted,
        "rejected_by_hr": rejected,
        "on_hold_by_hr": on_hold,
        "processing_failures": failures
    }
