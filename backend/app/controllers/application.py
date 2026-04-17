from datetime import datetime
from app import models
from app.schemas import application
from fastapi import APIRouter,Depends,HTTPException, Query
from app.database import get_db
from sqlalchemy.orm import Session, selectinload
from app.auth import utils
from app.models import Application,ScreeningAnswer,TimelineEvent
from sqlalchemy import or_
from uuid import UUID
from app.schemas.application import TimelineEventResponse
from app.cache_utils import cache_endpoint, invalidate_cache

router=APIRouter()

@router.post("/create_application")
async def create_application(data:application.CreateApplication,db:Session=Depends(get_db),user:str=Depends(utils.get_current_user)): # type: ignore
  try:
    new_application=Application(
        user_id=user,
        **data.model_dump()
    )
    db.add(new_application)
    db.commit()
    db.refresh(new_application)
    
    # Invalidate user's application list cache and dashboard when new application is created
    await invalidate_cache(pattern=f"applications:list:{user}:*")
    await invalidate_cache(pattern=f"dashboard:summary:{user}:*")
    
    return new_application
  except Exception as e:
    raise HTTPException(status_code=400, detail=str(e))


@router.get("/getallApplication")
@cache_endpoint(prefix="applications:list", ttl=1800)  # Cache for 30 minutes
async def getallApplication(
  status:str|None=Query(None),
  portal:str|None=Query(None),
  search:str|None=Query(None),
  page: int = Query(1,ge=1),
  page_size:int=Query(20,ge=1 ,le=100),
  db:Session=Depends(get_db),
  current_user:str=Depends(utils.get_current_user)
  ):
  query=db.query(Application).filter(Application.user_id==current_user)
  if status:
    query=query.filter(Application.status==status)
  if portal:
    query=query.filter(Application.portal.ilike(f"%{portal}%")) 
  if search:
     query=query.filter(
      or_(
         Application.company_name.ilike(f"%{search}%"),
         Application.role.ilike(f"%{search}%")
         )
      )
  total = query.count()   
  applications = (
        query
        .order_by(Application.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

  return {
        "applications": applications,
        "total": total,
        "page": page,
        "page_size": page_size
    }  

@router.get("/getApplication/{id}") 
@cache_endpoint(prefix="applications:single", ttl=3600)  # Cache single app for 1 hour
async def singleApplication(id:UUID,db:Session=Depends(get_db),user:str=Depends(utils.get_current_user)):
    application = (
    db.query(Application)
    .options(
        selectinload(Application.screening_answers),
        selectinload(Application.timeline_events),
        selectinload(Application.reminders),
        selectinload(Application.resume),
    )
    .filter(
        Application.id == id,
        Application.user_id == user
    )
    .first()
    )
    if not application:
      raise HTTPException(status=404,detail="Application not found")
    
    
    return application


@router.patch("/update_application/{id}", response_model=application.ApplicationResponse)
async def update_application(
    id: UUID,
    payload: application.UpdatedApplication, # type: ignore
    db: Session = Depends(get_db),
    current_user = Depends(utils.get_current_user)
):
    application = (
        db.query(Application)
        .filter(
            Application.id == id,
            Application.user_id == current_user
        )
        .first()
    )

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    old_status = application.status

    update_data = payload.dict(exclude_unset=True)

    for key, value in update_data.items():
        setattr(application, key, value)

    if "status" in update_data and update_data["status"] != old_status:
        timeline_event = models.TimelineEvent(
            application_id=application.id,
            event_type="status_changed",
            title=payload.title,
            metadata={
                "from": old_status,
                "to": update_data["status"]
            }
        )
        db.add(timeline_event)

    application.updated_at = datetime.utcnow()
    db.add(application)
    db.commit()
    db.refresh(application)
    
    # Invalidate related caches when application is updated
    await invalidate_cache(pattern=f"applications:list:{current_user}:*")  # List cache
    await invalidate_cache(key=f"applications:single:{id}")  # Single app cache
    await invalidate_cache(pattern=f"dashboard:summary:{current_user}:*")  # Dashboard cache

    return application

@router.delete("/delete_application/{id}")
async def deleteApplication(id:UUID,db:Session=Depends(get_db),user_id:str=Depends(utils.get_current_user)):
   application=db.query(Application).filter(
      Application.id==id,
      Application.user_id==user_id
      ).first()
   if not application:
        raise HTTPException(status_code=404, detail="Application not found")

   db.delete(application)
   db.commit() 
   
   # Invalidate caches when application is deleted
   await invalidate_cache(pattern=f"applications:list:{user_id}:*")  # List cache
   await invalidate_cache(key=f"applications:single:{id}")  # Single app cache
   await invalidate_cache(pattern=f"dashboard:summary:{user_id}:*")  # Dashboard cache
   
   return{
      "message":"Application successfully deleted."
   }

@router.post("/applications/{id}/screening-answers")
async def Screening_Answer(
   id:UUID,
   payload:application.CreateScreeningAnswer,
   db:Session=Depends(get_db),
   user_id:str=Depends(utils.get_current_user)):
   application=db.query(Application).filter(
      Application.id==id,
      Application.user_id==user_id
      ).first()
   if not application:
        raise HTTPException(status_code=404, detail="Application not found")
   new_ques_ans=ScreeningAnswer(
      application_id=id,
      question=payload.question,
      answer=payload.answer,
      question_type=payload.question_type
   )
   db.add(new_ques_ans)
   db.commit() 
   db.refresh(new_ques_ans)
   
   # Invalidate single application cache when screening answers are added
   await invalidate_cache(key=f"applications:single:{id}")
   
   return{
        "message": "Answer saved",
        "id": new_ques_ans.id
    }

@router.get("/gettimeline/{id}")
@cache_endpoint(prefix="applications:timeline", ttl=1800)  # Cache timeline for 30 min
async def GetTimeline(
   id:UUID,
   db:Session=Depends(get_db),
   user_id:str=Depends(utils.get_current_user)
):
   application=db.query(Application).filter(
      Application.id==id,
      Application.user_id==user_id
      ).first()
   
   if not application:
      raise HTTPException(status_code=404,detail="Application not found")

   events=(
     db.query(TimelineEvent)
     .filter(TimelineEvent.application_id==id)
     .order_by(TimelineEvent.event_at.asc())
     .all()
   ) 
   print(events) 

   return {
    "events": [TimelineEventResponse.from_orm(event) for event in events]
   }      

    
  



 