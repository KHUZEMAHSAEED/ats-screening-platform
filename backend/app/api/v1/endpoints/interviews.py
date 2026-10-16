from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_hr_role
from app.models import JobApplication, InterviewGuide, User, CandidateNote
from app.schemas.interview import InterviewGuideResponse, InterviewQuestionItem
from app.services.interview_service import generate_interview_questions_for_candidate
from app.services.audit_service import log_audit_event

router = APIRouter()

@router.post("/{application_id}/generate", response_model=InterviewGuideResponse)
def generate_interview_guide(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    app = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application record not found.")

    cand = app.candidate
    job = app.job
    match = app.match_result
    parsed = app.resume.parsed_resume if app.resume else None

    matched_mand = match.matched_mandatory if match else []
    missing_mand = match.missing_mandatory if match else []
    uncertain = match.uncertain_criteria if match else []
    skills = parsed.skills if parsed else []

    questions = generate_interview_questions_for_candidate(
        candidate_name=cand.full_name or "Candidate",
        job_title=job.title,
        matched_mandatory=matched_mand,
        missing_mandatory=missing_mand,
        uncertain_criteria=uncertain,
        skills=skills
    )

    # Save to database
    existing_guide = db.query(InterviewGuide).filter(InterviewGuide.application_id == app.id).first()
    if existing_guide:
        existing_guide.questions = [q.model_dump() for q in questions]
        guide = existing_guide
    else:
        guide = InterviewGuide(
            application_id=app.id,
            questions=[q.model_dump() for q in questions]
        )
        db.add(guide)

    db.commit()
    db.refresh(guide)

    log_audit_event(
        db=db,
        action="INTERVIEW_GUIDE_GENERATED",
        entity_type="interview_guide",
        entity_id=guide.id,
        user=current_user,
        application_id=app.id,
        details={"question_count": len(questions)}
    )

    return InterviewGuideResponse(
        id=guide.id,
        application_id=app.id,
        candidate_id=cand.id,
        candidate_name=cand.full_name or "Anonymous Candidate",
        job_title=job.title,
        questions=questions,
        created_at=guide.created_at
    )

@router.get("/{application_id}", response_model=InterviewGuideResponse)
def get_interview_guide(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    guide = db.query(InterviewGuide).filter(InterviewGuide.application_id == application_id).first()
    if not guide:
        # Generate automatically on demand
        return generate_interview_guide(application_id, db, current_user)

    app = guide.application
    return InterviewGuideResponse(
        id=guide.id,
        application_id=app.id,
        candidate_id=app.candidate_id,
        candidate_name=app.candidate.full_name or "Anonymous Candidate",
        job_title=app.job.title,
        questions=[InterviewQuestionItem(**q) for q in (guide.questions or [])],
        created_at=guide.created_at
    )
