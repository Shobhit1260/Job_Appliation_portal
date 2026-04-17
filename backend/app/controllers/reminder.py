from datetime import datetime, timezone
from app import models
from app.schemas import reminder
from fastapi import APIRouter,Depends,HTTPException, Query
from app.database import get_db
from sqlalchemy.orm import Session, selectinload
from app.auth import utils
from app.models import Application, Reminder,ScreeningAnswer,TimelineEvent
from sqlalchemy import or_
from uuid import UUID
from app.cache_utils import cache_endpoint, invalidate_cache

router=APIRouter()

@router.post("/create_reminder")
async def create_reminder(data: reminder.CreateReminder, user=Depends(utils.get_current_user), db: Session = Depends(get_db)):
    # Normalize input datetime to UTC before validating against current UTC time.
    if data.remind_at.tzinfo is None:
        remind_at_utc = data.remind_at.replace(tzinfo=timezone.utc)
    else:
        remind_at_utc = data.remind_at.astimezone(timezone.utc)

    if remind_at_utc <= datetime.now(timezone.utc):
        raise HTTPException(status_code=422, detail="remind_at must be in the future")

   
    if data.application_id:
        app = db.query(Application).filter(
            Application.id == data.application_id,
            Application.user_id == user
        ).first()

        if not app:
            raise HTTPException(status_code=404, detail="Application not found")

    reminder = Reminder(
        user_id=user,
        title=data.title,
        # Persist as naive UTC because SQLAlchemy DateTime column is timezone-naive here.
        remind_at=remind_at_utc.replace(tzinfo=None),
        application_id=data.application_id
    )

    db.add(reminder)
    db.commit()
    db.refresh(reminder)

    # Invalidate reminder list cache when new reminder is created
    await invalidate_cache(pattern=f"reminder:list:{user}:*")

    return reminder


@router.get("/reminders")
@cache_endpoint(prefix="reminder:list", ttl=900)  # Cache for 15 minutes (reminders time-sensitive)
async def list_reminders(
    is_sent: bool | None = None,
    application_id: UUID | None = None,
    user=Depends(utils.get_current_user),
    db: Session = Depends(get_db)
):

    query = db.query(Reminder).filter(Reminder.user_id == user)

    if is_sent is not None:
        query = query.filter(Reminder.is_sent == is_sent)

    if application_id:
        query = query.filter(Reminder.application_id == application_id)

    reminders = query.order_by(Reminder.remind_at.asc()).all()

    return {"reminders": reminders}