import uuid
import os
import secrets
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user, require_hr_role
from app.core.file_validator import validate_resume_file, compute_file_hash
from app.models import (
    Job, Candidate, ResumeDocument, JobApplication, ProcessingTask,
    User, ProcessingStatus, RecommendationStatus, HRDecisionType, ParsedResume
)
from app.schemas.resume import BulkUploadResponse, UploadFileResult, ProcessingTaskResponse
from app.schemas.candidate import ParsedResumeData
from app.services.queue.in_process_worker import dispatch_resume_task
from app.services.audit_service import log_audit_event

router = APIRouter()

def generate_anonymized_id() -> str:
    return f"CAND-{secrets.token_hex(3).upper()}"

@router.post("/upload", response_model=BulkUploadResponse)
async def upload_resumes(
    job_id: str = Form(...),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job opening not found.")

    task = ProcessingTask(
        task_type="BULK_UPLOAD",
        job_id=job.id,
        total_files=len(files),
        status=ProcessingStatus.PROCESSING.value
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    results: List[UploadFileResult] = []
    queued_count = 0
    dup_count = 0
    fail_count = 0

    for file in files:
        try:
            content = await file.read()
            clean_name, mime_type = validate_resume_file(file, content)
            file_hash = compute_file_hash(content)

            # Check duplicate resume hash for this exact job application
            existing_doc = db.query(ResumeDocument).filter(ResumeDocument.file_hash == file_hash).first()
            if existing_doc:
                existing_app = db.query(JobApplication).filter(
                    JobApplication.job_id == job_id,
                    JobApplication.resume_id == existing_doc.id
                ).first()
                if existing_app:
                    dup_count += 1
                    results.append(UploadFileResult(
                        filename=clean_name,
                        status="duplicate",
                        candidate_id=existing_doc.candidate_id,
                        application_id=existing_app.id,
                        error="This identical resume is already registered for this job."
                    ))
                    continue

            # Save file safely to disk
            ext = os.path.splitext(clean_name)[1].lower()
            storage_name = f"{uuid.uuid4()}{ext}"
            saved_path = settings.UPLOAD_DIR / storage_name
            with open(saved_path, "wb") as f:
                f.write(content)

            # Create or reuse Candidate
            if existing_doc:
                candidate = existing_doc.candidate
            else:
                candidate = Candidate(
                    anonymized_id=generate_anonymized_id()
                )
                db.add(candidate)
                db.flush()

            # Record ResumeDocument
            resume_doc = ResumeDocument(
                candidate_id=candidate.id,
                filename=storage_name,
                original_filename=clean_name,
                file_path=str(saved_path),
                file_hash=file_hash,
                file_size=len(content),
                mime_type=mime_type,
                upload_status=ProcessingStatus.PENDING.value
            )
            db.add(resume_doc)
            db.flush()

            # Create JobApplication
            application = JobApplication(
                job_id=job.id,
                candidate_id=candidate.id,
                resume_id=resume_doc.id,
                recommendation_status=RecommendationStatus.NEEDS_HR_REVIEW.value,
                hr_decision=HRDecisionType.PENDING_REVIEW.value,
                processing_status=ProcessingStatus.PENDING.value
            )
            db.add(application)
            db.commit()
            db.refresh(application)

            # Dispatch background task for parsing & matching
            dispatch_resume_task(
                resume_id=resume_doc.id,
                job_id=job.id,
                application_id=application.id,
                user_id=current_user.id
            )

            queued_count += 1
            results.append(UploadFileResult(
                filename=clean_name,
                status="queued",
                candidate_id=candidate.id,
                application_id=application.id
            ))

            log_audit_event(
                db=db,
                action="RESUME_UPLOADED",
                entity_type="resume_document",
                entity_id=resume_doc.id,
                user=current_user,
                application_id=application.id,
                details={"filename": clean_name, "file_size": len(content)}
            )

        except HTTPException as he:
            fail_count += 1
            results.append(UploadFileResult(
                filename=file.filename or "unknown",
                status="failed",
                error=he.detail
            ))
        except Exception as e:
            fail_count += 1
            results.append(UploadFileResult(
                filename=file.filename or "unknown",
                status="failed",
                error=str(e)
            ))

    task.processed_files = queued_count + dup_count
    task.failed_files = fail_count
    task.status = ProcessingStatus.COMPLETED.value
    task.results = [r.model_dump() for r in results]
    db.commit()

    return BulkUploadResponse(
        task_id=task.id,
        job_id=job.id,
        total_files=len(files),
        queued_files=queued_count,
        duplicates_detected=dup_count,
        failed_files=fail_count,
        items=results
    )

@router.get("/tasks/{task_id}", response_model=ProcessingTaskResponse)
def get_task_status(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(ProcessingTask).filter(ProcessingTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Processing task not found.")
    return task

@router.get("/{resume_id}/file")
def get_resume_file(
    resume_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = db.query(ResumeDocument).filter(ResumeDocument.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")

    if not os.path.exists(resume.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume file missing from storage.")

    # Defense in depth: Verify file path is strictly contained within designated upload directory
    real_path = os.path.realpath(resume.file_path)
    upload_dir_real = os.path.realpath(str(settings.UPLOAD_DIR))
    if not real_path.startswith(upload_dir_real):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: File outside permitted storage directory."
        )

    return FileResponse(
        path=real_path,
        filename=resume.original_filename,
        media_type=resume.mime_type
    )

@router.get("/{resume_id}/parsed", response_model=ParsedResumeData)
def get_parsed_resume(
    resume_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    parsed = db.query(ParsedResume).filter(ParsedResume.resume_id == resume_id).first()
    if not parsed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parsed resume data not found.")
    return parsed

@router.post("/{resume_id}/retry")
def retry_failed_resume(
    resume_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    resume = db.query(ResumeDocument).filter(ResumeDocument.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume document not found.")

    application = db.query(JobApplication).filter(JobApplication.resume_id == resume.id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job application not found.")

    # Re-queue task
    dispatch_resume_task(
        resume_id=resume.id,
        job_id=application.job_id,
        application_id=application.id,
        user_id=current_user.id
    )

    return {"message": "Resume processing re-queued successfully."}
