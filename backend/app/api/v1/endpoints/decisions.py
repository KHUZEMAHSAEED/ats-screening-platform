from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_hr_role
from app.models import JobApplication, HRDecision, User, HRDecisionType, RecommendationStatus
from app.schemas.decision import HRDecisionCreate, HRDecisionResponse
from app.services.audit_service import log_audit_event

router = APIRouter()

@router.post("/{application_id}/decide", response_model=HRDecisionResponse)
def commit_hr_decision(
    application_id: str,
    decision_in: HRDecisionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    """
    Mandatory Human-in-the-Loop Screening Endpoint.
    Only an authenticated HR user can finalize a candidate decision.
    """
    app = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application record not found.")

    # Guardrail 1: Confirmation required
    if not decision_in.confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Explicit user confirmation is mandatory before recording a final candidate decision."
        )

    # Guardrail 2: For rejection, enforce a valid explanation
    if decision_in.decision == HRDecisionType.REJECTED and (not decision_in.reason or len(decision_in.reason.strip()) < 5):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A substantive reason (at least 5 characters) is required when recording a candidate rejection."
        )

    # Detect if HR decision overrides automated recommendation
    is_override = False
    if app.recommendation_status == RecommendationStatus.RECOMMENDED_FOR_SHORTLISTING.value and decision_in.decision == HRDecisionType.REJECTED:
        is_override = True
    elif app.recommendation_status == RecommendationStatus.DOES_NOT_MEET_CRITERIA.value and decision_in.decision == HRDecisionType.SHORTLISTED:
        is_override = True

    # Record Decision
    decision_record = HRDecision(
        application_id=app.id,
        user_id=current_user.id,
        decision=decision_in.decision.value,
        reason=decision_in.reason,
        is_override=is_override
    )
    db.add(decision_record)

    # Update JobApplication final state
    app.hr_decision = decision_in.decision.value
    db.commit()
    db.refresh(decision_record)

    # Immutable Audit Logging
    log_audit_event(
        db=db,
        action=f"HR_DECISION_{decision_in.decision.value}",
        entity_type="job_application",
        entity_id=app.id,
        user=current_user,
        application_id=app.id,
        details={
            "decision": decision_in.decision.value,
            "reason": decision_in.reason,
            "is_override": is_override,
            "previous_recommendation": app.recommendation_status
        }
    )

    return HRDecisionResponse(
        id=decision_record.id,
        application_id=decision_record.application_id,
        user_id=decision_record.user_id,
        reviewer_name=current_user.full_name,
        decision=decision_record.decision,
        reason=decision_record.reason,
        is_override=decision_record.is_override,
        created_at=decision_record.created_at
    )
