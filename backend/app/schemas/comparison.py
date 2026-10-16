from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Optional

class ComparisonRequest(BaseModel):
    application_ids: List[str] = Field(..., min_length=2, max_length=4, description="List of 2 to 4 application IDs to compare")

class ComparisonCriterionMatch(BaseModel):
    name: str
    category: str  # "Mandatory", "Preferred", "Experience", "Qualification"
    min_years: Optional[float] = None
    candidate_matches: Dict[str, bool]  # {application_id: True/False}
    candidate_evidence: Dict[str, Optional[str]]  # {application_id: "snippet evidence"}

class CandidateComparisonItem(BaseModel):
    application_id: str
    candidate_id: str
    candidate_name: str
    anonymized_id: str
    email: Optional[str] = None
    overall_score: float
    recommendation_status: str
    hr_decision: str
    total_experience_years: float
    mandatory_score: float
    preferred_score: float
    experience_score: float
    qualification_score: float
    matched_mandatory_count: int
    total_mandatory_count: int
    top_skills: List[str]
    education_degree: Optional[str] = None
    education_institution: Optional[str] = None
    extraction_method: str

    model_config = ConfigDict(from_attributes=True)

class CandidateComparisonResponse(BaseModel):
    job_id: str
    job_title: str
    job_department: str
    candidates: List[CandidateComparisonItem]
    criteria_matrix: List[ComparisonCriterionMatch]
    executive_summary: str
