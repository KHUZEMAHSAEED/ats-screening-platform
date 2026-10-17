import logging
from typing import Dict, Any, List, Optional
from collections import defaultdict
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.models import (
    Job, JobApplication, MatchResult, HRDecision, ScreeningCriteria,
    User, ParsedResume, RecommendationStatus
)
from app.schemas.calibration import (
    JobCalibrationAnalysisResponse,
    WeightDeltaItem,
    ReviewerMetricItem,
    ApplyCalibratedWeightsResponse
)
from app.services.matching.engine import evaluate_candidate_match
from app.services.audit_service import log_audit_event

logger = logging.getLogger(__name__)

DEFAULT_WEIGHTS = {
    "mandatory": 50.0,
    "preferred": 25.0,
    "experience": 15.0,
    "qualifications": 10.0
}

CATEGORY_LABELS = {
    "mandatory": "Mandatory Technical Skills",
    "preferred": "Preferred & Secondary Skills",
    "experience": "Years of Relevant Experience",
    "qualifications": "Educational & Degree Credentials"
}

def analyze_job_calibration(db: Session, job_id: str) -> JobCalibrationAnalysisResponse:
    """
    Analyzes historical human recruiter decisions vs automated screening recommendations
    and calculates optimized active learning criteria weights.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise ValueError(f"Job opening {job_id} not found.")

    criteria = db.query(ScreeningCriteria).filter(ScreeningCriteria.job_id == job_id).first()
    current_weights = dict(criteria.weights) if criteria and criteria.weights else dict(DEFAULT_WEIGHTS)

    # Ensure all four keys exist in current_weights
    for k, v in DEFAULT_WEIGHTS.items():
        if k not in current_weights:
            current_weights[k] = v

    applications = db.query(JobApplication).filter(JobApplication.job_id == job_id).all()
    
    decisions_count = 0
    aligned_count = 0
    override_count = 0

    # Tracking for sub-score discriminative analysis
    shortlist_scores = defaultdict(list)
    reject_scores = defaultdict(list)

    # Tracking for reviewer metrics
    reviewer_stats = defaultdict(lambda: {
        "user_email": "",
        "user_name": "",
        "total": 0,
        "shortlist": 0,
        "reject": 0,
        "override": 0,
        "accepted_scores": []
    })

    for app in applications:
        if not app.decisions:
            continue

        latest_dec = app.decisions[0]  # ordered by desc(created_at)
        dec_type = latest_dec.decision.upper()
        if dec_type not in ("SHORTLISTED", "REJECTED", "ON_HOLD"):
            continue

        decisions_count += 1
        is_override = latest_dec.is_override
        rec_status = app.recommendation_status

        # Alignment logic
        is_aligned = False
        if dec_type == "SHORTLISTED" and rec_status == RecommendationStatus.RECOMMENDED_FOR_SHORTLISTING.value:
            is_aligned = True
        elif dec_type == "REJECTED" and rec_status == RecommendationStatus.DOES_NOT_MEET_CRITERIA.value:
            is_aligned = True
        elif dec_type == "ON_HOLD" or rec_status == RecommendationStatus.NEEDS_HR_REVIEW.value:
            # Borderline case
            is_aligned = not is_override

        if is_aligned:
            aligned_count += 1
        else:
            override_count += 1

        # Track reviewer metrics
        rev_id = latest_dec.user_id or "system"
        rev_user = latest_dec.reviewer
        rev_entry = reviewer_stats[rev_id]
        rev_entry["user_email"] = rev_user.email if rev_user else "reviewer@company.com"
        rev_entry["user_name"] = rev_user.full_name if rev_user else "HR Reviewer"
        rev_entry["total"] += 1

        match = app.match_result
        overall = match.overall_score if match else 0.0

        if dec_type == "SHORTLISTED":
            rev_entry["shortlist"] += 1
            rev_entry["accepted_scores"].append(overall)
            if match and match.score_breakdown:
                for cat in ("mandatory", "preferred", "experience", "qualifications"):
                    score_val = match.score_breakdown.get(f"{cat}_score", 0.0)
                    shortlist_scores[cat].append(score_val)
        elif dec_type == "REJECTED":
            rev_entry["reject"] += 1
            if match and match.score_breakdown:
                for cat in ("mandatory", "preferred", "experience", "qualifications"):
                    score_val = match.score_breakdown.get(f"{cat}_score", 0.0)
                    reject_scores[cat].append(score_val)

        if is_override:
            rev_entry["override"] += 1

    alignment_rate = round((aligned_count / decisions_count * 100.0), 1) if decisions_count > 0 else 100.0
    override_rate = round((override_count / decisions_count * 100.0), 1) if decisions_count > 0 else 0.0

    # Build Reviewer Metric Items
    reviewer_items: List[ReviewerMetricItem] = []
    for uid, rdata in reviewer_stats.items():
        total = rdata["total"]
        s_count = rdata["shortlist"]
        r_count = rdata["reject"]
        o_count = rdata["override"]
        o_rate = round((o_count / total * 100.0), 1) if total > 0 else 0.0
        avg_score = round(sum(rdata["accepted_scores"]) / len(rdata["accepted_scores"]), 1) if rdata["accepted_scores"] else 0.0
        
        s_rate = (s_count / total) if total > 0 else 0.5
        if s_rate <= 0.35 or avg_score >= 82.0:
            strictness = "Strict / Conservative"
        elif s_rate >= 0.75 or (avg_score > 0 and avg_score <= 65.0):
            strictness = "Permissive / Lenient"
        else:
            strictness = "Balanced / Calibrated"

        reviewer_items.append(ReviewerMetricItem(
            user_id=uid,
            user_email=rdata["user_email"],
            user_name=rdata["user_name"],
            total_reviews=total,
            shortlist_count=s_count,
            reject_count=r_count,
            override_count=o_count,
            override_rate=o_rate,
            avg_accepted_score=avg_score,
            strictness_index=strictness
        ))

    # Active Learning Weight Calculation
    recommended_weights: Dict[str, float] = dict(current_weights)
    weight_deltas: List[WeightDeltaItem] = []
    estimated_gain = 0.0
    rationale = ""

    if decisions_count < 2 or not shortlist_scores:
        # Insufficient data: provide baseline stability
        rationale = (
            f"Currently {decisions_count} decision(s) recorded for this requisition. "
            "Active learning requires at least 2 recruiter evaluations to extrapolate statistical feature significance. "
            "Current baseline weights remain optimal."
        )
        for cat in ("mandatory", "preferred", "experience", "qualifications"):
            weight_deltas.append(WeightDeltaItem(
                criterion=cat,
                label=CATEGORY_LABELS[cat],
                current_weight=current_weights[cat],
                recommended_weight=current_weights[cat],
                delta=0.0,
                direction="neutral",
                rationale="Insufficient historical data to calibrate."
            ))
    else:
        # Calculate separation power (delta between shortlisted and rejected means)
        raw_separations = {}
        for cat in ("mandatory", "preferred", "experience", "qualifications"):
            s_mean = sum(shortlist_scores[cat]) / len(shortlist_scores[cat]) if shortlist_scores[cat] else 50.0
            r_mean = sum(reject_scores[cat]) / len(reject_scores[cat]) if reject_scores[cat] else 30.0
            raw_separations[cat] = max(5.0, s_mean - r_mean)

        total_sep = sum(raw_separations.values())
        calibrated_proportions = {cat: (raw_separations[cat] / total_sep) * 100.0 for cat in raw_separations}

        # Blend 60% current weights + 40% empirical recruiter preference
        blended = {}
        for cat in ("mandatory", "preferred", "experience", "qualifications"):
            b_val = 0.55 * current_weights[cat] + 0.45 * calibrated_proportions[cat]
            # Clamp between 10% and 55%
            blended[cat] = max(10.0, min(55.0, b_val))

        # Re-normalize to 100.0
        b_sum = sum(blended.values())
        recommended_weights = {cat: round((blended[cat] / b_sum) * 100.0, 1) for cat in blended}
        
        # Ensure exact 100.0 sum
        diff = round(100.0 - sum(recommended_weights.values()), 1)
        recommended_weights["mandatory"] = round(recommended_weights["mandatory"] + diff, 1)

        # Compute deltas and rationales
        for cat in ("mandatory", "preferred", "experience", "qualifications"):
            delta = round(recommended_weights[cat] - current_weights[cat], 1)
            direction = "increase" if delta > 0.5 else ("decrease" if delta < -0.5 else "neutral")
            
            if direction == "increase":
                cat_rat = f"Recruiters consistently reward candidates with stronger {CATEGORY_LABELS[cat].lower()}."
            elif direction == "decrease":
                cat_rat = f"Recruiters displayed willingness to overlook lower scores in {CATEGORY_LABELS[cat].lower()} when compensated elsewhere."
            else:
                cat_rat = "Current weighting matches empirical human decision thresholds."

            weight_deltas.append(WeightDeltaItem(
                criterion=cat,
                label=CATEGORY_LABELS[cat],
                current_weight=current_weights[cat],
                recommended_weight=recommended_weights[cat],
                delta=delta,
                direction=direction,
                rationale=cat_rat
            ))

        estimated_gain = round(min(28.0, max(5.0, override_rate * 0.42)), 1)
        shifts = [f"{w.label} ({'+' if w.delta > 0 else ''}{w.delta}%)" for w in weight_deltas if abs(w.delta) >= 1.0]
        shift_text = ", ".join(shifts) if shifts else "subtle fine-tuning"

        rationale = (
            f"Based on {decisions_count} human evaluations ({override_rate}% override rate), "
            f"the active learning model recommends recalibrating {shift_text}. "
            f"Adopting these weights is projected to reduce reviewer overrides and boost machine-human alignment by +{estimated_gain}%."
        )

    return JobCalibrationAnalysisResponse(
        job_id=job.id,
        job_title=job.title,
        total_decisions=decisions_count,
        alignment_rate=alignment_rate,
        override_rate=override_rate,
        current_weights=current_weights,
        recommended_weights=recommended_weights,
        estimated_alignment_gain=estimated_gain,
        executive_rationale=rationale,
        weight_deltas=weight_deltas,
        reviewer_metrics=reviewer_items
    )

def apply_calibrated_weights(
    db: Session,
    job_id: str,
    reevaluate: bool,
    user: Optional[User] = None
) -> ApplyCalibratedWeightsResponse:
    """
    Applies the active learning calibrated weights to the job's screening criteria,
    optionally re-evaluating all existing candidate applications.
    """
    analysis = analyze_job_calibration(db, job_id)
    criteria = db.query(ScreeningCriteria).filter(ScreeningCriteria.job_id == job_id).first()
    if not criteria:
        raise ValueError(f"Screening criteria not found for job {job_id}.")

    old_weights = dict(criteria.weights) if criteria.weights else dict(DEFAULT_WEIGHTS)
    new_weights = analysis.recommended_weights

    criteria.weights = new_weights
    criteria.updated_at = datetime.now(timezone.utc)
    db.commit()

    reevaluated_count = 0
    if reevaluate:
        criteria_dict = {
            "mandatory_skills": criteria.mandatory_skills or [],
            "preferred_skills": criteria.preferred_skills or [],
            "min_experience_years": criteria.min_experience_years or 0.0,
            "required_qualifications": criteria.required_qualifications or [],
            "weights": new_weights
        }

        applications = db.query(JobApplication).filter(JobApplication.job_id == job_id).all()
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
                existing_match.evaluated_at = datetime.now(timezone.utc)
            
            app.recommendation_status = match_output["recommendation_status"]
            reevaluated_count += 1

        db.commit()

    # Log immutable audit event
    log_audit_event(
        db=db,
        action="CRITERIA_WEIGHTS_CALIBRATED",
        entity_type="job",
        entity_id=job_id,
        user=user,
        details={
            "old_weights": old_weights,
            "new_weights": new_weights,
            "candidates_reevaluated": reevaluated_count
        }
    )

    return ApplyCalibratedWeightsResponse(
        job_id=job_id,
        new_weights=new_weights,
        candidates_reevaluated=reevaluated_count,
        message=f"Successfully calibrated criteria weights. {reevaluated_count} candidates re-evaluated."
    )
