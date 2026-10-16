from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user, require_hr_role
from app.models import Job, ScreeningCriteria, JobApplication, User
from app.schemas.job import JobCreate, JobUpdate, JobResponse, JobListResponse, ScreeningCriteriaResponse
from app.services.audit_service import log_audit_event

router = APIRouter()

def serialize_job(job: Job, db: Session) -> JobResponse:
    app_count = db.query(func.count(JobApplication.id)).filter(JobApplication.job_id == job.id).scalar() or 0
    criteria_resp = None
    if job.criteria:
        criteria_resp = ScreeningCriteriaResponse.model_validate(job.criteria)

    return JobResponse(
        id=job.id,
        title=job.title,
        department=job.department,
        description=job.description,
        responsibilities=job.responsibilities,
        location=job.location,
        work_arrangement=job.work_arrangement,
        is_archived=job.is_archived,
        created_by_id=job.created_by_id,
        created_at=job.created_at,
        updated_at=job.updated_at,
        criteria=criteria_resp,
        applications_count=app_count
    )

@router.get("", response_model=JobListResponse)
def list_jobs(
    include_archived: bool = Query(False),
    department: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Job)
    if not include_archived:
        query = query.filter(Job.is_archived == False)
    if department:
        query = query.filter(Job.department.ilike(f"%{department}%"))
    if search:
        query = query.filter(Job.title.ilike(f"%{search}%") | Job.description.ilike(f"%{search}%"))

    total = query.count()
    jobs = query.order_by(Job.created_at.desc()).all()
    items = [serialize_job(j, db) for j in jobs]
    return JobListResponse(total=total, items=items)

@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    job_in: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    job = Job(
        title=job_in.title,
        department=job_in.department,
        description=job_in.description,
        responsibilities=job_in.responsibilities,
        location=job_in.location,
        work_arrangement=job_in.work_arrangement,
        created_by_id=current_user.id
    )
    db.add(job)
    db.flush()

    # Create ScreeningCriteria
    crit_data = job_in.criteria
    if crit_data:
        criteria = ScreeningCriteria(
            job_id=job.id,
            mandatory_skills=[m.model_dump() for m in crit_data.mandatory_skills],
            preferred_skills=[p.model_dump() for p in crit_data.preferred_skills],
            min_experience_years=crit_data.min_experience_years,
            required_qualifications=[q.model_dump() for q in crit_data.required_qualifications],
            weights=crit_data.weights.model_dump()
        )
    else:
        criteria = ScreeningCriteria(
            job_id=job.id,
            mandatory_skills=[],
            preferred_skills=[],
            min_experience_years=0.0,
            required_qualifications=[],
            weights={"mandatory": 50, "preferred": 25, "experience": 15, "qualifications": 10}
        )
    db.add(criteria)
    db.commit()
    db.refresh(job)

    log_audit_event(
        db=db,
        action="JOB_CREATED",
        entity_type="job",
        entity_id=job.id,
        user=current_user,
        details={"title": job.title, "department": job.department}
    )

    return serialize_job(job, db)

@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job opening not found")
    return serialize_job(job, db)

@router.put("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: str,
    job_in: JobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job opening not found")

    if job_in.title is not None:
        job.title = job_in.title
    if job_in.department is not None:
        job.department = job_in.department
    if job_in.description is not None:
        job.description = job_in.description
    if job_in.responsibilities is not None:
        job.responsibilities = job_in.responsibilities
    if job_in.location is not None:
        job.location = job_in.location
    if job_in.work_arrangement is not None:
        job.work_arrangement = job_in.work_arrangement
    if job_in.is_archived is not None:
        job.is_archived = job_in.is_archived

    if job_in.criteria is not None:
        crit = job.criteria
        if not crit:
            crit = ScreeningCriteria(job_id=job.id)
            db.add(crit)
        crit.mandatory_skills = [m.model_dump() for m in job_in.criteria.mandatory_skills]
        crit.preferred_skills = [p.model_dump() for p in job_in.criteria.preferred_skills]
        crit.min_experience_years = job_in.criteria.min_experience_years
        crit.required_qualifications = [q.model_dump() for q in job_in.criteria.required_qualifications]
        crit.weights = job_in.criteria.weights.model_dump()

    db.commit()
    db.refresh(job)

    log_audit_event(
        db=db,
        action="JOB_UPDATED",
        entity_type="job",
        entity_id=job.id,
        user=current_user,
        details={"title": job.title}
    )

    return serialize_job(job, db)

@router.post("/{job_id}/archive", response_model=JobResponse)
def toggle_archive_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job opening not found")

    job.is_archived = not job.is_archived
    db.commit()
    db.refresh(job)

    action = "JOB_ARCHIVED" if job.is_archived else "JOB_UNARCHIVED"
    log_audit_event(
        db=db,
        action=action,
        entity_type="job",
        entity_id=job.id,
        user=current_user
    )

    return serialize_job(job, db)
