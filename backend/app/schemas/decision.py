from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from app.models import HRDecisionType

class HRDecisionCreate(BaseModel):
    decision: HRDecisionType
    reason: Optional[str] = None
    confirmed: bool = Field(..., description="Must explicitly confirm to record final decision, especially rejection")

class HRDecisionResponse(BaseModel):
    id: str
    application_id: str
    user_id: str
    reviewer_name: Optional[str] = None
    decision: str
    reason: Optional[str] = None
    is_override: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CandidateNoteCreate(BaseModel):
    content: str

class CandidateNoteResponse(BaseModel):
    id: str
    application_id: str
    user_id: str
    author_name: Optional[str] = None
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
