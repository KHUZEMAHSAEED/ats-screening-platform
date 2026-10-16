from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models import (
    Candidate, JobApplication, Job, ResumeDocument, ParsedResume,
    MatchResult, HRDecision, CandidateNote, User
)
from app.schemas.candidate import (
    CandidateListResponse, CandidateListItem, CandidateDetailResponse,
    ResumeDocumentResponse, ParsedResumeData
)
from app.schemas.matching import MatchResultResponse
from app.schemas.decision import HRDecisionResponse, CandidateNoteResponse
from app.schemas.comparison import ComparisonRequest, CandidateComparisonResponse
from app.services.comparison_service import compare_candidates_service

router = APIRouter()

@router.get("", response_model=CandidateListResponse)
def list_candidates(
    job_id: Optional[str] = Query(None),
    recommendation_status: Optional[str] = Query(None),
    hr_decision: Optional[str] = Query(None),
    min_score: Optional[float] = Query(None),
    max_score: Optional[float] = Query(None),
    search: Optional[str] = Query(None),
    skill: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),  # "score", "created_at", "name"
    sort_order: str = Query("desc"),    # "asc", "desc"
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    blind_mode: bool = Query(False, description="Enable blind screening mode to mask candidate personal details"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(JobApplication).join(Candidate).join(Job).outerjoin(MatchResult)

    if job_id:
        query = query.filter(JobApplication.job_id == job_id)
    if recommendation_status:
        query = query.filter(JobApplication.recommendation_status == recommendation_status)
    if hr_decision:
        query = query.filter(JobApplication.hr_decision == hr_decision)
    if min_score is not None:
        query = query.filter(MatchResult.overall_score >= min_score)
    if max_score is not None:
        query = query.filter(MatchResult.overall_score <= max_score)
    if search:
        s = f"%{search}%"
        query = query.filter(
            Candidate.full_name.ilike(s) |
            Candidate.email.ilike(s) |
            Candidate.anonymized_id.ilike(s)
        )

    # Sorting
    if sort_by == "score":
        order_col = MatchResult.overall_score
    elif sort_by == "name":
        order_col = Candidate.full_name
    else:
        order_col = JobApplication.created_at

    if sort_order == "asc":
        query = query.order_by(asc(order_col))
    else:
        query = query.order_by(desc(order_col))

    total = query.count()
    offset = (page - 1) * page_size
    applications = query.offset(offset).limit(page_size).all()

    items = []
    for app in applications:
        cand = app.candidate
        job = app.job
        match = app.match_result
        parsed = app.resume.parsed_resume if app.resume else None

        matched_mand_count = len(match.matched_mandatory) if match and match.matched_mandatory else 0
        missing_mand = match.missing_mandatory if match and match.missing_mandatory else []
        total_mand = matched_mand_count + len(missing_mand)

        # Apply Blind Screening Masking if enabled
        anon_label = cand.anonymized_id or cand.id[:8]
        cand_name = f"Candidate #{anon_label}" if blind_mode else (cand.full_name or "Anonymous Candidate")
        cand_email = None if blind_mode else cand.email
        cand_phone = None if blind_mode else cand.phone

        items.append(CandidateListItem(
            application_id=app.id,
            candidate_id=cand.id,
            candidate_name=cand_name,
            anonymized_id=anon_label,
            email=cand_email,
            phone=cand_phone,
            job_id=job.id,
            job_title=job.title,
            job_department=job.department,
            overall_score=match.overall_score if match else None,
            matched_mandatory_count=matched_mand_count,
            total_mandatory_count=total_mand,
            missing_mandatory=missing_mand,
            recommendation_status=app.recommendation_status,
            hr_decision=app.hr_decision,
            processing_status=app.processing_status,
            total_experience_years=parsed.total_experience_years if parsed else 0.0,
            created_at=app.created_at
        ))

    return CandidateListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items
    )

@router.post("/compare", response_model=CandidateComparisonResponse)
def compare_candidates(
    req: ComparisonRequest,
    blind_mode: bool = Query(False, description="Enable blind screening mode to mask candidate personal details"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Side-by-Side Candidate Comparison Matrix:
    Evaluates 2 to 4 candidate applications against job criteria,
    producing a granular side-by-side competency grid and executive calibration synthesis.
    """
    return compare_candidates_service(
        db=db,
        application_ids=req.application_ids,
        blind_mode=blind_mode
    )

@router.get("/{application_id}", response_model=CandidateDetailResponse)
def get_candidate_detail(
    application_id: str,
    blind_mode: bool = Query(False, description="Enable blind screening mode to mask candidate personal details"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    app = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application record not found.")

    cand = app.candidate
    job = app.job
    resume = app.resume
    match = app.match_result
    parsed = resume.parsed_resume if resume else None

    # Fetch decisions and notes
    decisions = db.query(HRDecision).filter(HRDecision.application_id == app.id).order_by(HRDecision.created_at.desc()).all()
    notes = db.query(CandidateNote).filter(CandidateNote.application_id == app.id).order_by(CandidateNote.created_at.desc()).all()

    dec_responses = []
    for d in decisions:
        dec_responses.append(HRDecisionResponse(
            id=d.id,
            application_id=d.application_id,
            user_id=d.user_id,
            reviewer_name=d.reviewer.full_name if d.reviewer else None,
            decision=d.decision,
            reason=d.reason,
            is_override=d.is_override,
            created_at=d.created_at
        ))

    note_responses = []
    for n in notes:
        note_responses.append(CandidateNoteResponse(
            id=n.id,
            application_id=n.application_id,
            user_id=n.user_id,
            author_name=n.author.full_name if n.author else None,
            content=n.content,
            created_at=n.created_at
        ))

    # Apply Blind Screening Masking
    anon_label = cand.anonymized_id or cand.id[:8]
    cand_name = f"Candidate #{anon_label}" if blind_mode else (cand.full_name or "Anonymous Candidate")
    cand_email = "[REDACTED (Blind Review Mode)]" if blind_mode else cand.email
    cand_phone = "[REDACTED]" if blind_mode else cand.phone
    cand_location = "[REDACTED]" if blind_mode else cand.location

    parsed_resp = None
    if parsed:
        parsed_resp = ParsedResumeData.model_validate(parsed)
        if blind_mode:
            # Mask university names to prevent prestige bias
            masked_edu = []
            for edu in parsed_resp.education:
                masked_edu.append({
                    "degree": edu.get("degree", "Degree"),
                    "institution": "[REDACTED University/College]",
                    "graduation_year": None
                })
            parsed_resp.education = masked_edu

    return CandidateDetailResponse(
        application_id=app.id,
        candidate_id=cand.id,
        candidate_name=cand_name,
        anonymized_id=anon_label,
        email=cand_email,
        phone=cand_phone,
        location=cand_location,
        job_id=job.id,
        job_title=job.title,
        job_department=job.department,
        recommendation_status=app.recommendation_status,
        hr_decision=app.hr_decision,
        processing_status=app.processing_status,
        applied_at=app.created_at,
        resume=ResumeDocumentResponse.model_validate(resume),
        parsed_data=parsed_resp,
        match_result=MatchResultResponse.model_validate(match) if match else None,
        decisions=dec_responses,
        notes=note_responses
    )
