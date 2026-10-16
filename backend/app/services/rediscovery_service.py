from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models import Job, JobApplication, Candidate, ParsedResume, ScreeningCriteria, ResumeDocument
from app.services.matching.engine import evaluate_candidate_match
from app.schemas.rediscovery import RediscoveredCandidate, RediscoveryResponse

def rediscover_candidates_for_job(db: Session, job_id: str, min_match_score: float = 50.0) -> RediscoveryResponse:
    target_job = db.query(Job).filter(Job.id == job_id).first()
    if not target_job or not target_job.criteria:
        return RediscoveryResponse(
            job_id=job_id,
            job_title=target_job.title if target_job else "Unknown",
            total_pool_evaluated=0,
            matches_found=0,
            candidates=[]
        )

    criteria_dict = {
        "mandatory_skills": target_job.criteria.mandatory_skills or [],
        "preferred_skills": target_job.criteria.preferred_skills or [],
        "min_experience_years": target_job.criteria.min_experience_years or 0.0,
        "required_qualifications": target_job.criteria.required_qualifications or [],
        "weights": target_job.criteria.weights or {}
    }

    # Fetch applications from OTHER jobs to discover transferable talent
    other_applications = db.query(JobApplication).filter(JobApplication.job_id != job_id).all()
    
    seen_candidates = set()
    matches: List[RediscoveredCandidate] = []

    for app in other_applications:
        cand = app.candidate
        if not cand or cand.id in seen_candidates or not app.resume:
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

        eval_result = evaluate_candidate_match(parsed_data, criteria_dict)
        score = eval_result["overall_score"]

        if score >= min_match_score:
            seen_candidates.add(cand.id)
            matches.append(RediscoveredCandidate(
                candidate_id=cand.id,
                anonymized_id=cand.anonymized_id or cand.id[:8],
                candidate_name=cand.full_name or "Anonymous",
                email=cand.email,
                original_job_title=app.job.title,
                target_job_title=target_job.title,
                match_score=score,
                matched_mandatory=[m["name"] for m in eval_result["matched_mandatory"]],
                missing_mandatory=eval_result["missing_mandatory"],
                recommendation=eval_result["recommendation_status"],
                resume_id=app.resume.id
            ))

    # Sort descending by match score
    matches.sort(key=lambda x: x.match_score, reverse=True)

    return RediscoveryResponse(
        job_id=target_job.id,
        job_title=target_job.title,
        total_pool_evaluated=len(other_applications),
        matches_found=len(matches),
        candidates=matches
    )
