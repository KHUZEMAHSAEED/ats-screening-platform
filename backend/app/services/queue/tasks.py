import os
import logging
from typing import Optional
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models import (
    ResumeDocument, ParsedResume, Candidate, JobApplication,
    Job, ScreeningCriteria, MatchResult, ProcessingStatus, RecommendationStatus
)
from app.services.parsing.base import parse_resume_document
from app.services.matching.engine import evaluate_candidate_match
from app.services.audit_service import log_audit_event

logger = logging.getLogger(__name__)

def process_resume_document_task(
    resume_id: str,
    job_id: str,
    application_id: str,
    user_id: Optional[str] = None
):
    """
    Core pipeline task executed for each uploaded resume.
    1. Parse text & extract fields
    2. Match against job criteria
    3. Persist parsed data & match score
    4. Guardrail: Never reject candidate automatically on failure
    """
    db: Session = SessionLocal()
    try:
        resume = db.query(ResumeDocument).filter(ResumeDocument.id == resume_id).first()
        application = db.query(JobApplication).filter(JobApplication.id == application_id).first()
        job = db.query(Job).filter(Job.id == job_id).first()

        if not resume or not application or not job:
            logger.error(f"Task aborted: Missing entities for resume_id={resume_id}, app_id={application_id}")
            return

        application.processing_status = ProcessingStatus.PROCESSING.value
        db.commit()

        # Step 1: Run modular parser
        file_path = resume.file_path
        parsed_data = parse_resume_document(file_path, resume.mime_type)

        # Update candidate details if missing
        candidate = db.query(Candidate).filter(Candidate.id == resume.candidate_id).first()
        if candidate:
            if not candidate.full_name and parsed_data.get("candidate_name"):
                candidate.full_name = parsed_data["candidate_name"]
            if not candidate.email and parsed_data.get("email"):
                candidate.email = parsed_data["email"]
            if not candidate.phone and parsed_data.get("phone"):
                candidate.phone = parsed_data["phone"]

        # Save or update ParsedResume record
        existing_parsed = db.query(ParsedResume).filter(ParsedResume.resume_id == resume.id).first()
        if existing_parsed:
            db.delete(existing_parsed)
            db.flush()

        parsed_record = ParsedResume(
            resume_id=resume.id,
            extracted_text=parsed_data.get("extracted_text", ""),
            skills=parsed_data.get("skills", []),
            experience_items=parsed_data.get("experience_items", []),
            total_experience_years=float(parsed_data.get("total_experience_years", 0.0)),
            education=parsed_data.get("education", []),
            certifications=parsed_data.get("certifications", []),
            projects=parsed_data.get("projects", []),
            extraction_warnings=parsed_data.get("warnings", []),
            parsing_method=parsed_data.get("parsing_method", "Deterministic Parser")
        )
        db.add(parsed_record)
        db.flush()

        # Step 2: Run Matching Engine
        criteria_obj = db.query(ScreeningCriteria).filter(ScreeningCriteria.job_id == job_id).first()
        criteria_dict = {}
        if criteria_obj:
            criteria_dict = {
                "mandatory_skills": criteria_obj.mandatory_skills or [],
                "preferred_skills": criteria_obj.preferred_skills or [],
                "min_experience_years": criteria_obj.min_experience_years or 0.0,
                "required_qualifications": criteria_obj.required_qualifications or [],
                "weights": criteria_obj.weights or {}
            }

        match_output = evaluate_candidate_match(parsed_data, criteria_dict)

        # Save or update MatchResult
        existing_match = db.query(MatchResult).filter(MatchResult.application_id == application.id).first()
        if existing_match:
            db.delete(existing_match)
            db.flush()

        match_record = MatchResult(
            application_id=application.id,
            overall_score=match_output["overall_score"],
            score_breakdown=match_output["score_breakdown"],
            matched_mandatory=match_output["matched_mandatory"],
            missing_mandatory=match_output["missing_mandatory"],
            matched_preferred=match_output["matched_preferred"],
            missing_preferred=match_output["missing_preferred"],
            uncertain_criteria=match_output["uncertain_criteria"],
            explanation=match_output["explanation"]
        )
        db.add(match_record)

        # Update application state
        application.recommendation_status = match_output["recommendation_status"]
        application.processing_status = ProcessingStatus.COMPLETED.value
        resume.upload_status = ProcessingStatus.COMPLETED.value
        db.commit()

        # Step 3: Audit event
        log_audit_event(
            db=db,
            action="RESUME_PARSED_AND_MATCHED",
            entity_type="job_application",
            entity_id=application.id,
            application_id=application.id,
            details={
                "overall_score": match_output["overall_score"],
                "recommendation": match_output["recommendation_status"],
                "matched_count": len(match_output["matched_mandatory"])
            }
        )

    except Exception as e:
        logger.error(f"Error processing resume {resume_id}: {str(e)}", exc_info=True)
        db.rollback()
        try:
            # Mark failure gracefully without rejecting candidate
            app_rec = db.query(JobApplication).filter(JobApplication.id == application_id).first()
            if app_rec:
                app_rec.processing_status = ProcessingStatus.FAILED.value
                app_rec.recommendation_status = RecommendationStatus.PROCESSING_FAILED.value
                db.commit()
            res_rec = db.query(ResumeDocument).filter(ResumeDocument.id == resume_id).first()
            if res_rec:
                res_rec.upload_status = ProcessingStatus.FAILED.value
                res_rec.error_message = str(e)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()
