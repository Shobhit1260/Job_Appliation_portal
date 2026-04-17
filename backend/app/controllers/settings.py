from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime

from app.database import get_db
from app.auth.utils import get_current_user
from app.models import UserSettings, Notification, User
from app.schemas import settings as settings_schema
from app.cache_utils import invalidate_cache

router = APIRouter()


# ===== USER SETTINGS ROUTES =====

@router.get("/settings")
async def get_user_settings(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """Get current user's settings"""
    user_settings = db.query(UserSettings).filter(
        UserSettings.user_id == user_id
    ).first()
    
    if not user_settings:
        # Create default settings if they don't exist
        user_settings = UserSettings(user_id=user_id)
        db.add(user_settings)
        db.commit()
        db.refresh(user_settings)
    
    return {
        "data": settings_schema.UserSettingsResponse.from_orm(user_settings)
    }


@router.put("/settings")
async def update_user_settings(
    payload: settings_schema.UpdateUserSettings,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """Update user settings"""
    user_settings = db.query(UserSettings).filter(
        UserSettings.user_id == user_id
    ).first()
    
    if not user_settings:
        user_settings = UserSettings(user_id=user_id)
        db.add(user_settings)
        db.flush()
    
    # Update only provided fields
    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user_settings, field, value)
    
    user_settings.updated_at = datetime.now()
    db.commit()
    db.refresh(user_settings)
    
    return {
        "message": "Settings updated successfully",
        "data": settings_schema.UserSettingsResponse.from_orm(user_settings)
    }


# ===== NOTIFICATION ROUTES =====

@router.get("/notifications")
async def get_notifications(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
    limit: int = 20,
    offset: int = 0,
    unread_only: bool = False
):
    """Get user's notifications"""
    query = db.query(Notification).filter(
        Notification.user_id == user_id
    )
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    total = query.count()
    notifications = query.order_by(
        Notification.created_at.desc()
    ).offset(offset).limit(limit).all()
    
    return {
        "notifications": [
            settings_schema.NotificationResponse.from_orm(n) 
            for n in notifications
        ],
        "total": total,
        "unread_count": db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()
    }


@router.patch("/notifications/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """Mark a notification as read"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    db.commit()
    
    return {"message": "Notification marked as read"}


@router.patch("/notifications/read-all")
async def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """Mark all notifications as read"""
    db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).update({"is_read": True})
    
    db.commit()
    
    return {"message": "All notifications marked as read"}


@router.delete("/notifications/{notification_id}")
async def delete_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """Delete a notification"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    db.delete(notification)
    db.commit()
    
    return {"message": "Notification deleted"}


@router.delete("/notifications")
async def delete_all_notifications(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """Delete all notifications"""
    db.query(Notification).filter(
        Notification.user_id == user_id
    ).delete()
    
    db.commit()
    
    return {"message": "All notifications deleted"}
