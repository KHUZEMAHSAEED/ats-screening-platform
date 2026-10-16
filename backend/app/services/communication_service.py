from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime, timezone
from app.models import JobApplication, Candidate, Job, MatchResult, User, CommunicationLog
from app.schemas.communication import (
    TemplateType,
    EmailPreviewResponse,
    SendEmailRequest,
    CommunicationLogResponse
)
from app.services.audit_service import log_audit_event
from app.services.webhook_service import dispatch_webhook_event

def generate_email_preview(
    db: Session,
    application_id: str,
    template_type: str,
    custom_note: Optional[str] = None
) -> EmailPreviewResponse:
    app = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application record not found."
        )

    cand = app.candidate
    job = app.job
    match = app.match_result

    cand_name = cand.full_name or "Applicant"
    recipient_email = cand.email or "candidate@example.com"
    job_title = job.title
    missing_mand = match.missing_mandatory if match and match.missing_mandatory else []
    missing_text = "\n".join([f"• {m}" for m in missing_mand]) if missing_mand else "• Core technical competencies and recent projects"

    placeholders = {
        "candidate_name": cand_name,
        "recipient_email": recipient_email,
        "job_title": job_title,
        "job_department": job.department,
        "missing_skills": missing_text
    }

    if template_type == TemplateType.INTERVIEW_INVITATION.value:
        subject = f"Invitation to Interview: {job_title} at ATS Platform"
        body = (
            f"Dear {cand_name},\n\n"
            f"Thank you for your application for the {job_title} position. Our hiring team was very impressed by your background and competencies.\n\n"
            f"We would like to invite you for a 45-minute technical conversation with our engineering team to discuss your experience, technical projects, and role expectations.\n\n"
            f"Please select a time that suits your availability using our calendar booking link:\n"
            f"https://calendar.ats-platform.com/interview/{app.id[:8]}\n\n"
            f"If you require any accommodations or have questions ahead of our conversation, feel free to reply directly to this email.\n\n"
            f"Best regards,\n"
            f"Talent Acquisition Team\n"
            f"ATS Platform"
        )
    elif template_type == TemplateType.COMPETENCY_CLARIFICATION.value:
        subject = f"Update regarding your application for {job_title}"
        body = (
            f"Dear {cand_name},\n\n"
            f"Thank you for taking the time to apply for the {job_title} opening.\n\n"
            f"As part of our initial screening review, our engineering team would appreciate a brief clarification regarding your experience in the following areas:\n\n"
            f"{missing_text}\n\n"
            f"Could you please reply with a short summary or examples showcasing your familiarity, equivalent technologies, or production exposure in these areas?\n\n"
            f"We look forward to hearing from you.\n\n"
            f"Best regards,\n"
            f"Talent Acquisition Team"
        )
    elif template_type == TemplateType.RESPECTFUL_REJECTION.value:
        subject = f"Update regarding your application for {job_title}"
        body = (
            f"Dear {cand_name},\n\n"
            f"Thank you very much for your interest in the {job_title} role and for sharing your background with our team.\n\n"
            f"We received a significant number of strong applications for this position. After careful review, our hiring team has decided to advance other candidates whose current skill sets and specific experience more closely align with the immediate requirements of this role.\n\n"
            f"We truly appreciate the time and effort you invested in applying with us. We would love to keep your profile in our talent pool for future openings that match your background.\n\n"
            f"We wish you every success in your ongoing search and career endeavors.\n\n"
            f"Warm regards,\n"
            f"Hiring Team"
        )
    elif template_type == TemplateType.OFFER_OR_NEXT_STEPS.value:
        subject = f"Next Steps: {job_title} Assessment"
        note_text = custom_note.strip() if custom_note else "Please review the attached assessment instructions and return your submission within 5 business days."
        body = (
            f"Dear {cand_name},\n\n"
            f"Thank you for speaking with our team regarding the {job_title} position.\n\n"
            f"We are pleased to invite you to the next step of our selection process:\n\n"
            f"{note_text}\n\n"
            f"If you have any questions, do not hesitate to reach out.\n\n"
            f"Best regards,\n"
            f"Talent Acquisition Team"
        )
    else:  # CUSTOM
        subject = f"Regarding your application for {job_title}"
        note_text = custom_note.strip() if custom_note else "Thank you for connecting with our recruiting team."
        body = (
            f"Dear {cand_name},\n\n"
            f"{note_text}\n\n"
            f"Best regards,\n"
            f"Talent Team"
        )

    return EmailPreviewResponse(
        template_type=template_type,
        recipient_name=cand_name,
        recipient_email=recipient_email,
        subject=subject,
        body=body,
        placeholders=placeholders
    )

def send_candidate_email(
    db: Session,
    req: SendEmailRequest,
    current_user: User
) -> CommunicationLogResponse:
    if not req.confirmed_by_recruiter:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mandatory Human-in-the-Loop safeguard: Recruiter confirmation checkbox must be verified before dispatching communications."
        )

    app = db.query(JobApplication).filter(JobApplication.id == req.application_id).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application record not found."
        )

    # Record message in database
    log = CommunicationLog(
        application_id=app.id,
        user_id=current_user.id,
        recipient_email=req.recipient_email,
        recipient_name=req.recipient_name,
        template_type=req.template_type,
        subject=req.subject,
        body=req.body,
        status="SENT",
        sent_at=datetime.now(timezone.utc)
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    # Log audit event
    log_audit_event(
        db=db,
        action="EMAIL_DISPATCHED",
        entity_type="communication",
        entity_id=log.id,
        user=current_user,
        application_id=app.id,
        details={
            "recipient": req.recipient_email,
            "template_type": req.template_type,
            "subject": req.subject
        }
    )

    # Webhook broadcast
    dispatch_webhook_event(
        db=db,
        event_type="candidate.contacted",
        data={
            "communication_id": log.id,
            "application_id": app.id,
            "candidate_id": app.candidate_id,
            "template_type": req.template_type,
            "recipient_email": req.recipient_email
        }
    )

    return CommunicationLogResponse(
        id=log.id,
        application_id=log.application_id,
        recipient_name=log.recipient_name,
        recipient_email=log.recipient_email,
        template_type=log.template_type,
        subject=log.subject,
        body=log.body,
        status=log.status,
        sent_at=log.sent_at,
        sender_name=current_user.full_name or current_user.email
    )

def get_application_communications(
    db: Session,
    application_id: str
) -> List[CommunicationLogResponse]:
    logs = db.query(CommunicationLog).filter(
        CommunicationLog.application_id == application_id
    ).order_by(CommunicationLog.sent_at.desc()).all()

    results = []
    for log in logs:
        sender_name = log.sender.full_name if log.sender else "HR Recruiter"
        results.append(CommunicationLogResponse(
            id=log.id,
            application_id=log.application_id,
            recipient_name=log.recipient_name,
            recipient_email=log.recipient_email,
            template_type=log.template_type,
            subject=log.subject,
            body=log.body,
            status=log.status,
            sent_at=log.sent_at,
            sender_name=sender_name
        ))
    return results
