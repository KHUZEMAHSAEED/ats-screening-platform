from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.schemas.matching import MatchResultResponse
from app.schemas.decision import HRDecisionResponse, CandidateNoteResponse

class ParsedResumeData(BaseModel):
    extracted_text: str
    skills: List[str]
    experience_items: List[Dict[str, Any]]
    total_experience_years: float
    education: List[Dict[str, Any]]
    certifications: List[str]
    projects: List[Dict[str, Any]]
    extraction_warnings: List[str]
    parsing_method: str
    parsed_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ResumeDocumentResponse(BaseModel):
    id: str
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    upload_status: str
    error_message: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ApplicationSummary(BaseModel):
    id: str
    job_id: str
    job_title: str
    job_department: str
    candidate_id: str
    resume_id: str
    recommendation_status: str
    hr_decision: str
    processing_status: str
    overall_score: Optional[float] = None
    matched_mandatory_count: Optional[int] = 0
    total_mandatory_count: Optional[int] = 0
    missing_mandatory: List[str] = []
    created_at: datetime
    updated_at: datetime

class CandidateListItem(BaseModel):
    application_id: str
    candidate_id: str
    candidate_name: str
    anonymized_id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    job_id: str
    job_title: str
    job_department: str
    overall_score: Optional[float] = None
    matched_mandatory_count: int = 0
    total_mandatory_count: int = 0
    missing_mandatory: List[str] = []
    recommendation_status: str
    hr_decision: str
    processing_status: str
    total_experience_years: Optional[float] = 0.0
    created_at: datetime

class CandidateListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[CandidateListItem]

class CandidateDetailResponse(BaseModel):
    application_id: str
    candidate_id: str
    candidate_name: str
    anonymized_id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    job_id: str
    job_title: str
    job_department: str
    recommendation_status: str
    hr_decision: str
    processing_status: str
    applied_at: datetime
    resume: ResumeDocumentResponse
    parsed_data: Optional[ParsedResumeData] = None
    match_result: Optional[MatchResultResponse] = None
    decisions: List[HRDecisionResponse] = []
    notes: List[CandidateNoteResponse] = []
