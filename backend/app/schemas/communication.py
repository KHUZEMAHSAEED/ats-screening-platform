from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, Dict, List
from datetime import datetime
from enum import Enum

class TemplateType(str, Enum):
    INTERVIEW_INVITATION = "INTERVIEW_INVITATION"
    COMPETENCY_CLARIFICATION = "COMPETENCY_CLARIFICATION"
    RESPECTFUL_REJECTION = "RESPECTFUL_REJECTION"
    OFFER_OR_NEXT_STEPS = "OFFER_OR_NEXT_STEPS"
    CUSTOM = "CUSTOM"

class EmailPreviewRequest(BaseModel):
    application_id: str
    template_type: TemplateType
    custom_note: Optional[str] = None

class EmailPreviewResponse(BaseModel):
    template_type: str
    recipient_name: str
    recipient_email: str
    subject: str
    body: str
    placeholders: Dict[str, str]

class SendEmailRequest(BaseModel):
    application_id: str
    template_type: str
    recipient_email: str
    recipient_name: str
    subject: str
    body: str
    confirmed_by_recruiter: bool = Field(..., description="Mandatory Human-in-the-Loop confirmation checkbox")

class CommunicationLogResponse(BaseModel):
    id: str
    application_id: str
    recipient_name: str
    recipient_email: str
    template_type: str
    subject: str
    body: str
    status: str
    sent_at: datetime
    sender_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
