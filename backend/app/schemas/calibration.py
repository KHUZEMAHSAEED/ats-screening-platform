from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Optional

class ReviewerMetricItem(BaseModel):
    user_id: str
    user_email: str
    user_name: str
    total_reviews: int
    shortlist_count: int
    reject_count: int
    override_count: int
    override_rate: float
    avg_accepted_score: float
    strictness_index: str

    model_config = ConfigDict(from_attributes=True)

class WeightDeltaItem(BaseModel):
    criterion: str
    label: str
    current_weight: float
    recommended_weight: float
    delta: float
    direction: str  # "increase" | "decrease" | "neutral"
    rationale: str

    model_config = ConfigDict(from_attributes=True)

class JobCalibrationAnalysisResponse(BaseModel):
    job_id: str
    job_title: str
    total_decisions: int
    alignment_rate: float
    override_rate: float
    current_weights: Dict[str, float]
    recommended_weights: Dict[str, float]
    estimated_alignment_gain: float
    executive_rationale: str
    weight_deltas: List[WeightDeltaItem]
    reviewer_metrics: List[ReviewerMetricItem]

    model_config = ConfigDict(from_attributes=True)

class ApplyCalibratedWeightsRequest(BaseModel):
    reevaluate_candidates: bool = Field(default=False, description="Re-run matching engine for all candidates with new weights")

class ApplyCalibratedWeightsResponse(BaseModel):
    job_id: str
    new_weights: Dict[str, float]
    candidates_reevaluated: int
    message: str
