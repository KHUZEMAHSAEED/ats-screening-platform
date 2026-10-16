from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

class UploadFileResult(BaseModel):
    filename: str
    status: str  # "queued", "duplicate", "failed"
    candidate_id: Optional[str] = None
    application_id: Optional[str] = None
    error: Optional[str] = None

class BulkUploadResponse(BaseModel):
    task_id: str
    job_id: str
    total_files: int
    queued_files: int
    duplicates_detected: int
    failed_files: int
    items: List[UploadFileResult]

class ProcessingTaskResponse(BaseModel):
    id: str
    task_type: str
    job_id: Optional[str]
    status: str
    total_files: int
    processed_files: int
    failed_files: int
    results: List[Dict[str, Any]]
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
