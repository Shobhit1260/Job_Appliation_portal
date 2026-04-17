from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class UpdateUserSettings(BaseModel):
    email_notifications: bool | None = None
    reminder_notifications: bool | None = None
    application_updates: bool | None = None
    interview_reminders: bool | None = None
    offer_notifications: bool | None = None
    weekly_digest: bool | None = None
    dark_mode: bool | None = None
    theme: str | None = None


class UserSettingsResponse(BaseModel):
    id: UUID
    user_id: UUID
    email_notifications: bool
    reminder_notifications: bool
    application_updates: bool
    interview_reminders: bool
    offer_notifications: bool
    weekly_digest: bool
    dark_mode: bool
    theme: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    application_id: UUID | None
    title: str
    description: str | None
    notification_type: str
    is_read: bool
    data: dict | None
    created_at: datetime

    class Config:
        from_attributes = True


class CreateNotification(BaseModel):
    title: str
    description: str | None = None
    notification_type: str
    application_id: UUID | None = None
    data: dict | None = None
