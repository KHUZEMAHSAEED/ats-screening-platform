from pydantic import BaseModel, ConfigDict
from typing import Dict, List, Any
from datetime import datetime

class ComplianceMetricsResponse(BaseModel):
    total_evaluated: int
    shortlisted_count: int
    selection_rate: float
    disparate_impact_ratio: float
    four_fifths_rule_status: str  # "COMPLIANT", "POTENTIAL_DISPARATE_IMPACT"
    compliance_explanation: str
    recommendation_distribution: Dict[str, int]
    decision_distribution: Dict[str, int]
    regulatory_frameworks: List[str]
    audit_timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
