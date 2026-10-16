from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class RediscoveredCandidate(BaseModel):
    candidate_id: str
    anonymized_id: str
    candidate_name: str
    email: Optional[str] = None
    original_job_title: str
    target_job_title: str
    match_score: float
    matched_mandatory: List[str]
    missing_mandatory: List[str]
    recommendation: str
    resume_id: str

    model_config = ConfigDict(from_attributes=True)

class RediscoveryResponse(BaseModel):
    job_id: str
    job_title: str
    total_pool_evaluated: int
    matches_found: int
    candidates: List[RediscoveredCandidate]
