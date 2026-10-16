from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models import JobApplication, Job, ScreeningCriteria, MatchResult
from app.schemas.comparison import (
    CandidateComparisonItem,
    ComparisonCriterionMatch,
    CandidateComparisonResponse
)

def compare_candidates_service(
    db: Session,
    application_ids: List[str],
    blind_mode: bool = False
) -> CandidateComparisonResponse:
    if len(application_ids) < 2 or len(application_ids) > 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Side-by-side comparison requires between 2 and 4 candidate applications."
        )

    # Fetch applications in specified order
    applications = []
    for app_id in application_ids:
        app = db.query(JobApplication).filter(JobApplication.id == app_id).first()
        if not app:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Candidate application with ID {app_id} could not be found."
            )
        applications.append(app)

    primary_job: Job = applications[0].job
    criteria: Optional[ScreeningCriteria] = primary_job.criteria

    candidate_items: List[CandidateComparisonItem] = []
    app_matched_mandatory_map: Dict[str, set] = {}
    app_evidence_map: Dict[str, Dict[str, str]] = {}

    for app in applications:
        cand = app.candidate
        match = app.match_result
        resume = app.resume
        parsed = resume.parsed_resume if resume else None

        score_bd = match.score_breakdown if match and match.score_breakdown else {}
        matched_mand = match.matched_mandatory if match and match.matched_mandatory else []
        missing_mand = match.missing_mandatory if match and match.missing_mandatory else []

        # Store set of matched skill names for matrix lookup
        matched_names = set()
        evidence_dict = {}
        for item in matched_mand:
            name = item.get("name", "").lower()
            matched_names.add(name)
            evidence_dict[name] = item.get("evidence_snippet", "")
        app_matched_mandatory_map[app.id] = matched_names
        app_evidence_map[app.id] = evidence_dict

        # Education extraction
        edu_degree = None
        edu_inst = None
        if parsed and parsed.education and len(parsed.education) > 0:
            first_edu = parsed.education[0]
            edu_degree = first_edu.get("degree")
            edu_inst = "[REDACTED University/College]" if blind_mode else first_edu.get("institution")

        # Identity masking in blind mode
        anon_label = cand.anonymized_id or cand.id[:8]
        cand_name = f"Candidate #{anon_label}" if blind_mode else (cand.full_name or "Anonymous Candidate")
        cand_email = None if blind_mode else cand.email

        candidate_items.append(CandidateComparisonItem(
            application_id=app.id,
            candidate_id=cand.id,
            candidate_name=cand_name,
            anonymized_id=anon_label,
            email=cand_email,
            overall_score=match.overall_score if match else 0.0,
            recommendation_status=app.recommendation_status,
            hr_decision=app.hr_decision,
            total_experience_years=parsed.total_experience_years if parsed else 0.0,
            mandatory_score=score_bd.get("mandatory_score", 0.0),
            preferred_score=score_bd.get("preferred_score", 0.0),
            experience_score=score_bd.get("experience_score", 0.0),
            qualification_score=score_bd.get("qualification_score", 0.0),
            matched_mandatory_count=len(matched_mand),
            total_mandatory_count=len(matched_mand) + len(missing_mand),
            top_skills=(parsed.skills[:10] if parsed and parsed.skills else []),
            education_degree=edu_degree,
            education_institution=edu_inst,
            extraction_method=parsed.parsing_method if parsed else "none"
        ))

    # Build Criteria Matrix
    criteria_matrix: List[ComparisonCriterionMatch] = []

    if criteria:
        # 1. Mandatory Skills
        for skill in criteria.mandatory_skills:
            skill_name = skill.get("name", "")
            matches = {}
            evidence = {}
            for app in applications:
                matched_set = app_matched_mandatory_map.get(app.id, set())
                has_match = (skill_name.lower() in matched_set)
                matches[app.id] = has_match
                evidence[app.id] = app_evidence_map.get(app.id, {}).get(skill_name.lower())
            
            criteria_matrix.append(ComparisonCriterionMatch(
                name=skill_name,
                category="Mandatory Skill",
                min_years=float(skill.get("min_years", 1.0)),
                candidate_matches=matches,
                candidate_evidence=evidence
            ))

        # 2. Preferred Skills
        for skill in criteria.preferred_skills:
            skill_name = skill.get("name", "")
            matches = {}
            evidence = {}
            for app in applications:
                parsed = app.resume.parsed_resume if app.resume else None
                cand_skills = [s.lower() for s in (parsed.skills if parsed else [])]
                has_match = any(skill_name.lower() in s or s in skill_name.lower() for s in cand_skills)
                matches[app.id] = has_match
                evidence[app.id] = f"Found in extracted skills: '{skill_name}'" if has_match else None
            
            criteria_matrix.append(ComparisonCriterionMatch(
                name=skill_name,
                category="Preferred Skill",
                candidate_matches=matches,
                candidate_evidence=evidence
            ))

        # 3. Minimum Experience Baseline
        exp_matches = {}
        exp_evidence = {}
        min_years = float(criteria.min_experience_years)
        for app in applications:
            parsed = app.resume.parsed_resume if app.resume else None
            exp = parsed.total_experience_years if parsed else 0.0
            exp_matches[app.id] = (exp >= min_years)
            exp_evidence[app.id] = f"{exp:.1f} years total documented experience"
        criteria_matrix.append(ComparisonCriterionMatch(
            name=f"Minimum {min_years} Years Experience",
            category="Experience Tenure",
            min_years=min_years,
            candidate_matches=exp_matches,
            candidate_evidence=exp_evidence
        ))

    # Executive Synthesis Generation
    top_scorer = max(candidate_items, key=lambda c: c.overall_score)
    top_exp = max(candidate_items, key=lambda c: c.total_experience_years)

    summary_parts = [
        f"Comparative Analysis across {len(candidate_items)} shortlisted applicants for '{primary_job.title}':",
        f"• Score Leader: {top_scorer.candidate_name} achieves the highest overall match score ({top_scorer.overall_score:.1f}%), satisfying {top_scorer.matched_mandatory_count}/{top_scorer.total_mandatory_count} mandatory competencies.",
    ]

    if top_exp.application_id != top_scorer.application_id and top_exp.total_experience_years > top_scorer.total_experience_years:
        summary_parts.append(
            f"• Experience Contrast: {top_exp.candidate_name} offers superior industry tenure ({top_exp.total_experience_years:.1f} years vs {top_scorer.total_experience_years:.1f} years)."
        )

    summary_parts.append(
        "• Strategic Hiring Advice: Calibrate trade-offs between depth in core frameworks vs broader stack versatility during structured technical interviews."
    )

    executive_summary = "\n".join(summary_parts)

    return CandidateComparisonResponse(
        job_id=primary_job.id,
        job_title=primary_job.title,
        job_department=primary_job.department,
        candidates=candidate_items,
        criteria_matrix=criteria_matrix,
        executive_summary=executive_summary
    )
