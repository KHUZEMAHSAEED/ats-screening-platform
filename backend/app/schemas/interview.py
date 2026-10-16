from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class InterviewQuestionItem(BaseModel):
    question: str
    category: str
    target_gap: str
    expected_answer: str
    suggested_rubric: str

class InterviewGuideResponse(BaseModel):
    id: str
    application_id: str
    candidate_id: str
    candidate_name: str
    job_title: str
    questions: List[InterviewQuestionItem]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
