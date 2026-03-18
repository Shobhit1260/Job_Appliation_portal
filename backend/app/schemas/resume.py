from pydantic import BaseModel
from typing import Optional, List

class ResumeConfirmRequest(BaseModel):
    file_key: str
    label: str
    commit_message: Optional[str] = None
    tags: Optional[List[str]] = None