from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime

class LLMCompetencyProof(BaseModel):
    skill: str = Field(..., description="The verified technical or domain skill")
    evidence_quote: str = Field(..., description="Direct quote or verified excerpt from the resume")
    depth_level: str = Field(..., description="Foundational, Proficient, or Expert / Architectural")
    context_source: Optional[str] = Field(None, description="Section or role where evidence was observed")

class LLMAnalysisResponse(BaseModel):
    application_id: str
    candidate_id: str
    candidate_name: Optional[str] = "Candidate"
    job_title: str
    executive_summary: str = Field(..., description="Strategic executive assessment of candidate fit")
    technical_depth_score: float = Field(..., ge=0.0, le=100.0, description="Scale & architectural complexity score")
    verified_competencies: List[LLMCompetencyProof] = Field(default_factory=list)
    potential_risk_factors: List[str] = Field(default_factory=list, description="Tenure anomalies, unverified claims, or tooling discrepancies")
    key_achievements: List[str] = Field(default_factory=list, description="Quantified business and engineering outcomes")
    recommended_interview_focus: List[str] = Field(default_factory=list, description="Targeted high-signal probing areas for the panel")
    prompt_injection_detected: bool = Field(default=False, description="Flag if adversarial prompt injections were detected in candidate document")
    provider_used: str = Field(..., description="Engine provider used: e.g. openai:gpt-4o-mini or heuristic-fallback")
    analyzed_at: datetime

    model_config = ConfigDict(from_attributes=True)
