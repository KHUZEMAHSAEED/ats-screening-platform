from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import require_hr_role
from app.models import User
from app.schemas.communication import (
    EmailPreviewRequest,
    EmailPreviewResponse,
    SendEmailRequest,
    CommunicationLogResponse
)
from app.services.communication_service import (
    generate_email_preview,
    send_candidate_email,
    get_application_communications
)

router = APIRouter()

@router.post("/preview", response_model=EmailPreviewResponse)
def preview_candidate_email(
    req: EmailPreviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    """
    Renders a tailored email preview for a candidate application
    with dynamic variable substitution (name, job title, missing competencies).
    """
    return generate_email_preview(
        db=db,
        application_id=req.application_id,
        template_type=req.template_type.value,
        custom_note=req.custom_note
    )

@router.post("/send", response_model=CommunicationLogResponse)
def dispatch_candidate_email(
    req: SendEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    """
    Dispatches a candidate communication with mandatory Human-in-the-Loop recruiter confirmation,
    recording an immutable audit event and updating communication history.
    """
    return send_candidate_email(
        db=db,
        req=req,
        current_user=current_user
    )

@router.get("/{application_id}", response_model=List[CommunicationLogResponse])
def get_candidate_communications(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    """
    Lists the chronological communication history and delivery logs for a candidate.
    """
    return get_application_communications(db=db, application_id=application_id)
