from pydantic import BaseModel, HttpUrl, ConfigDict
from typing import List, Optional
from datetime import datetime

class WebhookCreate(BaseModel):
    url: str
    event_types: List[str] = ["candidate.screened", "hr.decision.committed", "job.created"]
    description: Optional[str] = None

class WebhookResponse(BaseModel):
    id: str
    url: str
    secret: str
    event_types: List[str]
    is_active: bool
    description: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
