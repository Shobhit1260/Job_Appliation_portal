from pydantic import BaseModel
import sqlalchemy
from typing import Dict


class CreateDashboard(BaseModel):
    applications:int
    by_status:Dict[str,int]
    by_portal:Dict[str,int]
    funnel:Dict[str,int]
    by_kpis:Dict[str,float]