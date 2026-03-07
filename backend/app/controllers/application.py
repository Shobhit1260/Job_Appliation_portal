from app import models
from app.schemas import application
from fastapi import APIRouter,Depends,HTTPException
from app.database import get_db
from sqlalchemy.orm import Session

router=APIRouter()



 