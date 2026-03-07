from pydantic import BaseModel
from datetime import datetime
from sqlalchemy import UUID


class CreateApplication(BaseModel):
    resume_id: UUID|None=None
    company_name: str
    role: str
    portal: str
    job_title: str
    status: dict={"status":"applied"}
    applied_at: datetime| None=None
    location: str
    job_description: str
    job_description_embedding:str|None=None
    is_remote:bool=False
    salary_mentioned:int|None=None
    notes:str|None=None
    skills_I_mentioned:dict | None = None