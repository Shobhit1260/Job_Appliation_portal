from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.database import get_db
from app.auth.utils import get_current_user
from app.models import Application
from app.cache_utils import cache_endpoint, invalidate_cache


router=APIRouter()

@router.get("/get_dashboard")
@cache_endpoint(prefix="dashboard:summary", ttl=600)  # Cache for 10 minutes (stats update relatively)
async def get_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    user_id = current_user

#    total_applications
    total =(db.query(func.count(Application.id))
        .filter(Application.user_id == user_id)
        .scalar())

   
    status_rows = db.query(
        Application.status,
        func.count(Application.id)
    ).filter(
        Application.user_id == user_id
    ).group_by(Application.status).all()

    by_status = {status: count for status, count in status_rows}

  
    portal_rows = db.query(
        Application.portal,
        func.count(Application.id)
    ).filter(
        Application.user_id == user_id
    ).group_by(Application.portal).all()

    by_portal = {portal: count for portal, count in portal_rows}

    screened = by_status.get("screening", 0)
    interviewed = by_status.get("interview", 0)
    offered = by_status.get("offer", 0)

    funnel = {
        "applied": total,
        "screened": screened + interviewed + offered,
        "interviewed": interviewed + offered,
        "offered": offered
    }

  
    response_rate = (
        (screened + interviewed + offered) / total * 100
        if total else 0
    )

    offer_rate = (
        offered / total * 100
        if total else 0
    )

    kpis = {
        "response_rate_pct": round(response_rate, 1),
        "offer_rate_pct": round(offer_rate, 1),
        "ghosted": by_status.get("ghosted", 0),
        "rejected": by_status.get("rejected", 0)
    }

    return {
        "total_applications": total,
        "by_status": by_status,
        "by_portal": by_portal,
        "funnel": funnel,
        "kpis": kpis
    }