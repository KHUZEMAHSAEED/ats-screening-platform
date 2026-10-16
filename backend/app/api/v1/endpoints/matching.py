from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_hr_role
from app.models import Job, JobApplication, MatchResult, User, ScreeningCriteria, ParsedResume
from app.services.matching.engine import evaluate_candidate_match
from app.services.audit_service import log_audit_event

router = APIRouter()

@router.post("/re-evaluate")
def re_evaluate_job_candidates(
    job_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job opening not found.")

    criteria_obj = db.query(ScreeningCriteria).filter(ScreeningCriteria.job_id == job_id).first()
    if not criteria_obj:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job has no screening criteria configured.")

    criteria_dict = {
        "mandatory_skills": criteria_obj.mandatory_skills or [],
        "preferred_skills": criteria_obj.preferred_skills or [],
        "min_experience_years": criteria_obj.min_experience_years or 0.0,
        "required_qualifications": criteria_obj.required_qualifications or [],
        "weights": criteria_obj.weights or {}
    }

    applications = db.query(JobApplication).filter(JobApplication.job_id == job_id).all()
    re_evaluated_count = 0

    for app in applications:
        if not app.resume:
            continue
        parsed = db.query(ParsedResume).filter(ParsedResume.resume_id == app.resume.id).first()
        if not parsed:
            continue

        parsed_data = {
            "extracted_text": parsed.extracted_text,
            "skills": parsed.skills,
            "education": parsed.education,
            "total_experience_years": parsed.total_experience_years,
            "certifications": parsed.certifications
        }

        match_output = evaluate_candidate_match(parsed_data, criteria_dict)

        existing_match = db.query(MatchResult).filter(MatchResult.application_id == app.id).first()
        if existing_match:
            existing_match.overall_score = match_output["overall_score"]
            existing_match.score_breakdown = match_output["score_breakdown"]
            existing_match.matched_mandatory = match_output["matched_mandatory"]
            existing_match.missing_mandatory = match_output["missing_mandatory"]
            existing_match.matched_preferred = match_output["matched_preferred"]
            existing_match.missing_preferred = match_output["missing_preferred"]
            existing_match.uncertain_criteria = match_output["uncertain_criteria"]
            existing_match.explanation = match_output["explanation"]
        else:
            new_match = MatchResult(
                application_id=app.id,
                overall_score=match_output["overall_score"],
                score_breakdown=match_output["score_breakdown"],
                matched_mandatory=match_output["matched_mandatory"],
                missing_mandatory=match_output["missing_mandatory"],
                matched_preferred=match_output["matched_preferred"],
                missing_preferred=match_output["missing_preferred"],
                uncertain_criteria=match_output["uncertain_criteria"],
                explanation=match_output["explanation"]
            )
            db.add(new_match)

        app.recommendation_status = match_output["recommendation_status"]
        # Note: Do NOT touch app.hr_decision! Human decisions are never erased or modified by recalculation.
        re_evaluated_count += 1

    db.commit()

    log_audit_event(
        db=db,
        action="CANDIDATES_RE_EVALUATED",
        entity_type="job",
        entity_id=job.id,
        user=current_user,
        details={"re_evaluated_count": re_evaluated_count}
    )

    return {
        "message": f"Successfully re-evaluated {re_evaluated_count} candidates against updated criteria.",
        "job_id": job.id,
        "re_evaluated_count": re_evaluated_count
    }
