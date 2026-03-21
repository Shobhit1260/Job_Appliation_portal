from typing import Literal
from pydantic import BaseModel, constr, field_validator
from datetime import datetime
from uuid import UUID

class CreateReminder(BaseModel):
    title:str
    remind_at:datetime
    application_id:UUID
    
