from typing import Literal
from pydantic import BaseModel, constr, field_validator
from datetime import datetime
from uuid import UUID

VALID_STATUSES = [
    "saved", "applied", "screening",
    "interview", "offer", "rejected",
    "withdrawn", "ghosted"
]


class CreateApplication(BaseModel):
    resume_id: UUID|None=None
    company_name: str
    role: str
    portal: str
    job_title: str
    status: str = "applied"
    applied_at: datetime| None=None
    location: str
    job_description: str
    job_description_embedding:str|None=None
    is_remote:bool=False
    salary_mentioned:int|None=None
    notes:str|None=None
    skills_I_mentioned:dict | None = None

class UpdatedApplication(BaseModel):
    company_name:str|None=None
    role:str|None=None
    portal:str|None=None
    job_title:str|None=None
    status: str|None=None
    location:str|None=None
    job_description:str|None=None
    salary_mentioned:int|None=None
    notes:str|None=None
    skills_I_mentioned:dict|None=None

    @field_validator("status")
    def validate_status(cls, v):
        if v is not None and v not in VALID_STATUSES:
            raise ValueError("Invalid status value")
        return v

class ApplicationResponse(BaseModel):
    id: UUID
    company_name: str
    role: str
    status: str
    notes: str|None=None
    salary_mentioned: str|None
    portal: str|None=None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True 

class CreateScreeningAnswer(BaseModel):
    question: constr(strip_whitespace=True, min_length=1) # type: ignore
    answer: constr(strip_whitespace=True, min_length=1)   # type: ignore
    question_type: Literal["text", "mcq", "rating"] = "text"


