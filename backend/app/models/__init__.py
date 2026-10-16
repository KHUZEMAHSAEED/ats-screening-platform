import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON, Enum, Index
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class UserRole(str, enum.Enum):
    HR_ADMIN = "hr_admin"
    RECRUITER = "recruiter"
    HIRING_MANAGER = "hiring_manager"

class RecommendationStatus(str, enum.Enum):
    RECOMMENDED_FOR_SHORTLISTING = "RECOMMENDED_FOR_SHORTLISTING"
    NEEDS_HR_REVIEW = "NEEDS_HR_REVIEW"
    DOES_NOT_MEET_CRITERIA = "DOES_NOT_MEET_CRITERIA"
    PROCESSING_FAILED = "PROCESSING_FAILED"

class HRDecisionType(str, enum.Enum):
    PENDING_REVIEW = "PENDING_REVIEW"
    SHORTLISTED = "SHORTLISTED"
    ON_HOLD = "ON_HOLD"
    REJECTED = "REJECTED"

class ProcessingStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default=UserRole.RECRUITER.value, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    jobs = relationship("Job", back_populates="creator")
    decisions = relationship("HRDecision", back_populates="reviewer")
    notes = relationship("CandidateNote", back_populates="author")

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False, index=True)
    department = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    responsibilities = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    work_arrangement = Column(String(50), default="Hybrid")  # Remote, Hybrid, On-site
    is_archived = Column(Boolean, default=False, index=True)
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    creator = relationship("User", back_populates="jobs")
    criteria = relationship("ScreeningCriteria", back_populates="job", uselist=False, cascade="all, delete-orphan")
    applications = relationship("JobApplication", back_populates="job", cascade="all, delete-orphan")

class ScreeningCriteria(Base):
    __tablename__ = "screening_criteria"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # JSON structure: list of { "name": "Python", "min_years": 3, "synonyms": ["py", "python3"] }
    mandatory_skills = Column(JSON, default=list)
    # JSON structure: list of { "name": "Docker", "weight": 1.0, "synonyms": ["containerization"] }
    preferred_skills = Column(JSON, default=list)
    min_experience_years = Column(Float, default=0.0)
    # JSON structure: list of { "degree": "Bachelor", "field": "Computer Science" }
    required_qualifications = Column(JSON, default=list)
    
    # Configurable weights: {"mandatory": 50, "preferred": 25, "experience": 15, "qualifications": 10}
    weights = Column(JSON, default=dict)
    
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    job = relationship("Job", back_populates="criteria")

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    full_name = Column(String(255), nullable=True, index=True)
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(100), nullable=True)
    location = Column(String(255), nullable=True)
    anonymized_id = Column(String(64), unique=True, index=True)  # e.g., CAND-8A3F29
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    resumes = relationship("ResumeDocument", back_populates="candidate", cascade="all, delete-orphan")
    applications = relationship("JobApplication", back_populates="candidate", cascade="all, delete-orphan")

class ResumeDocument(Base):
    __tablename__ = "resume_documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)  # stored safe filename
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_hash = Column(String(64), index=True, nullable=False)  # SHA-256 for duplicate detection
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(128), nullable=False)
    upload_status = Column(String(50), default=ProcessingStatus.PENDING.value)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    candidate = relationship("Candidate", back_populates="resumes")
    parsed_resume = relationship("ParsedResume", back_populates="resume", uselist=False, cascade="all, delete-orphan")
    applications = relationship("JobApplication", back_populates="resume")

class ParsedResume(Base):
    __tablename__ = "parsed_resumes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    resume_id = Column(String(36), ForeignKey("resume_documents.id", ondelete="CASCADE"), unique=True, nullable=False)
    extracted_text = Column(Text, nullable=False)
    skills = Column(JSON, default=list)  # list of extracted skill strings
    experience_items = Column(JSON, default=list)  # list of {title, company, start_date, end_date, duration_years, description}
    total_experience_years = Column(Float, default=0.0)
    education = Column(JSON, default=list)  # list of {degree, institution, year}
    certifications = Column(JSON, default=list)
    projects = Column(JSON, default=list)
    extraction_warnings = Column(JSON, default=list)
    parsing_method = Column(String(50), default="PyMuPDF+Heuristics")  # or "python-docx", "OCR", "LLM-Enriched"
    parsed_at = Column(DateTime(timezone=True), default=utc_now)

    resume = relationship("ResumeDocument", back_populates="parsed_resume")

class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    resume_id = Column(String(36), ForeignKey("resume_documents.id", ondelete="CASCADE"), nullable=False)
    
    # 2 Separate fields for Machine vs Human decisions
    recommendation_status = Column(String(50), default=RecommendationStatus.NEEDS_HR_REVIEW.value, nullable=False, index=True)
    hr_decision = Column(String(50), default=HRDecisionType.PENDING_REVIEW.value, nullable=False, index=True)
    
    processing_status = Column(String(50), default=ProcessingStatus.PENDING.value, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    job = relationship("Job", back_populates="applications")
    candidate = relationship("Candidate", back_populates="applications")
    resume = relationship("ResumeDocument", back_populates="applications")
    match_result = relationship("MatchResult", back_populates="application", uselist=False, cascade="all, delete-orphan")
    decisions = relationship("HRDecision", back_populates="application", cascade="all, delete-orphan", order_by="desc(HRDecision.created_at)")
    notes = relationship("CandidateNote", back_populates="application", cascade="all, delete-orphan", order_by="desc(CandidateNote.created_at)")
    audit_logs = relationship("AuditLog", back_populates="application", cascade="all, delete-orphan")

class MatchResult(Base):
    __tablename__ = "match_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(36), ForeignKey("job_applications.id", ondelete="CASCADE"), unique=True, nullable=False)
    overall_score = Column(Float, nullable=False, default=0.0, index=True)
    
    # JSON breakdown: mandatory_score, preferred_score, experience_score, qualification_score, weights_applied
    score_breakdown = Column(JSON, default=dict)
    matched_mandatory = Column(JSON, default=list)  # list of {criterion, source_evidence}
    missing_mandatory = Column(JSON, default=list)  # list of strings
    matched_preferred = Column(JSON, default=list)
    missing_preferred = Column(JSON, default=list)
    uncertain_criteria = Column(JSON, default=list) # list of {criterion, reason, snippet}
    explanation = Column(Text, nullable=False)
    evaluated_at = Column(DateTime(timezone=True), default=utc_now)

    application = relationship("JobApplication", back_populates="match_result")

class HRDecision(Base):
    __tablename__ = "hr_decisions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(36), ForeignKey("job_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    decision = Column(String(50), nullable=False)  # SHORTLISTED, ON_HOLD, REJECTED
    reason = Column(Text, nullable=True)  # Mandatory for REJECTED or overrides
    is_override = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    application = relationship("JobApplication", back_populates="decisions")
    reviewer = relationship("User", back_populates="decisions")

class CandidateNote(Base):
    __tablename__ = "candidate_notes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(36), ForeignKey("job_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    application = relationship("JobApplication", back_populates="notes")
    author = relationship("User", back_populates="notes")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(36), ForeignKey("job_applications.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_email = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False, index=True)  # e.g., "UPLOAD_RESUME", "HR_SHORTLIST", "HR_REJECT"
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(36), nullable=False)
    details = Column(JSON, default=dict)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, index=True)

    application = relationship("JobApplication", back_populates="audit_logs")

class ProcessingTask(Base):
    __tablename__ = "processing_tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    task_type = Column(String(50), nullable=False)  # "BULK_UPLOAD", "REMATCH"
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), default=ProcessingStatus.PENDING.value)
    total_files = Column(Integer, default=0)
    processed_files = Column(Integer, default=0)
    failed_files = Column(Integer, default=0)
    results = Column(JSON, default=list)  # list of {filename, status, error, candidate_id}
    created_at = Column(DateTime(timezone=True), default=utc_now)
    completed_at = Column(DateTime(timezone=True), nullable=True)
