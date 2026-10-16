import csv
import io
from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.security import require_hr_role
from app.models import JobApplication, Candidate, Job, MatchResult, User
from app.services.audit_service import log_audit_event

router = APIRouter()

@router.get("/candidates.csv")
def export_candidates_csv(
    job_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    query = db.query(JobApplication).join(Candidate).join(Job).outerjoin(MatchResult)
    if job_id:
        query = query.filter(JobApplication.job_id == job_id)

    applications = query.order_by(JobApplication.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Application ID",
        "Job Title",
        "Job Department",
        "Candidate Name",
        "Anonymized ID",
        "Email",
        "Match Score",
        "Advisory Recommendation",
        "Final HR Decision",
        "Matched Mandatory Skills",
        "Missing Mandatory Skills",
        "Applied Date"
    ])

    for app in applications:
        cand = app.candidate
        job = app.job
        match = app.match_result

        matched_skills = ", ".join(m["name"] for m in match.matched_mandatory) if match and match.matched_mandatory else ""
        missing_skills = ", ".join(match.missing_mandatory) if match and match.missing_mandatory else ""

        writer.writerow([
            app.id,
            job.title,
            job.department,
            cand.full_name or "Anonymous",
            cand.anonymized_id or "",
            cand.email or "",
            f"{match.overall_score:.1f}" if match else "N/A",
            app.recommendation_status,
            app.hr_decision,
            matched_skills,
            missing_skills,
            app.created_at.strftime("%Y-%m-%d %H:%M:%S")
        ])

    log_audit_event(
        db=db,
        action="CANDIDATE_DATA_EXPORTED",
        entity_type="export",
        entity_id="candidates_csv",
        user=current_user,
        details={"record_count": len(applications), "job_id": job_id}
    )

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ats_candidate_screening_report.csv"}
    )
