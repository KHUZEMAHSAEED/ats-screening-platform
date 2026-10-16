from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

class CriterionEvidence(BaseModel):
    name: str
    category: str  # "mandatory" or "preferred"
    matched: bool
    evidence_snippet: Optional[str] = None
    confidence: Optional[float] = 1.0

class UncertainItem(BaseModel):
    name: str
    reason: str
    evidence_snippet: Optional[str] = None

class ScoreBreakdown(BaseModel):
    mandatory_score: float
    preferred_score: float
    experience_score: float
    qualification_score: float
    weights_applied: Dict[str, float]
    overall_score: float

class MatchResultResponse(BaseModel):
    id: str
    application_id: str
    overall_score: float
    score_breakdown: Dict[str, Any]
    matched_mandatory: List[Dict[str, Any]]
    missing_mandatory: List[str]
    matched_preferred: List[Dict[str, Any]]
    missing_preferred: List[str]
    uncertain_criteria: List[Dict[str, Any]]
    explanation: str
    evaluated_at: datetime

    model_config = ConfigDict(from_attributes=True)
