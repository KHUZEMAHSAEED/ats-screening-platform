from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

class MandatorySkillItem(BaseModel):
    name: str
    min_years: Optional[float] = 0.0
    synonyms: List[str] = Field(default_factory=list)

class PreferredSkillItem(BaseModel):
    name: str
    weight: Optional[float] = 1.0
    synonyms: List[str] = Field(default_factory=list)

class QualificationItem(BaseModel):
    degree: str
    field: Optional[str] = None
    required: bool = True

class CriteriaWeights(BaseModel):
    mandatory: float = 50.0
    preferred: float = 25.0
    experience: float = 15.0
    qualifications: float = 10.0

class ScreeningCriteriaBase(BaseModel):
    mandatory_skills: List[MandatorySkillItem] = Field(default_factory=list)
    preferred_skills: List[PreferredSkillItem] = Field(default_factory=list)
    min_experience_years: float = 0.0
    required_qualifications: List[QualificationItem] = Field(default_factory=list)
    weights: CriteriaWeights = Field(default_factory=CriteriaWeights)

class ScreeningCriteriaCreate(ScreeningCriteriaBase):
    pass

class ScreeningCriteriaResponse(ScreeningCriteriaBase):
    id: str
    job_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class JobBase(BaseModel):
    title: str
    department: str
    description: str
    responsibilities: Optional[str] = None
    location: Optional[str] = "Remote"
    work_arrangement: Optional[str] = "Hybrid"

class JobCreate(JobBase):
    criteria: Optional[ScreeningCriteriaCreate] = None

class JobUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    description: Optional[str] = None
    responsibilities: Optional[str] = None
    location: Optional[str] = None
    work_arrangement: Optional[str] = None
    is_archived: Optional[bool] = None
    criteria: Optional[ScreeningCriteriaBase] = None

class JobResponse(JobBase):
    id: str
    is_archived: bool
    created_by_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    criteria: Optional[ScreeningCriteriaResponse] = None
    applications_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

class JobListResponse(BaseModel):
    total: int
    items: List[JobResponse]
