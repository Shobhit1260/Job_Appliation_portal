from sqlalchemy import Column, String, Text ,DateTime, Boolean, ForeignKey, Integer, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base
import uuid
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    reset_token_hash = Column(String, nullable=True)
    reset_token_expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    preferences = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    resumes = relationship("Resume", back_populates="user", cascade="all, delete")
    applications = relationship("Application", back_populates="user", cascade="all, delete")
    reminders = relationship("Reminder", back_populates="user", cascade="all, delete")

class Resume(Base):
    __tablename__= "resumes"

    id=Column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4)
    user_id=Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    version=Column(Integer,nullable=False)
    label=Column(String, nullable=False)
    file_path=Column(String,nullable=False)
    file_hash=Column(String,nullable=False)
    file_size_kb=Column(Integer,nullable=False)
    is_active=Column(Boolean,default=True)
    commit_message=Column(Text, nullable=True)
    tags=Column(JSONB, nullable=True)
    skills_claimed=Column(JSONB,nullable=True)
    diff_from_prev=Column(Text,nullable=True)
    created_at=Column(DateTime,default=datetime.utcnow,nullable=False)
    updated_at=Column(DateTime, default=datetime.utcnow,onupdate=datetime.utcnow,nullable=False)

    user=relationship("User",back_populates='resumes')
    applications=relationship("Application", back_populates="applications")

    #unique constaint:
    __table_args__=(
        UniqueConstraint("user_id","version",name="uq_user_version"),
        Index("idx_user_active","user_id","is_active")
        )



class Application(Base):
    __tablename__="applications"

    id=Column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4)
    user_id=Column(UUID(as_uuid=True),ForeignKey("users.id", ondelete="CASCADE"),nullable=True) 
    resume_id=Column(UUID(as_uuid=True),ForeignKey("resumes.id",ondelete="CASCADE"),nullable=True)
    company_name=Column(String,nullable=False) 
    role=Column(String,nullable=False)
    portal=Column(String,nullable=False)
    job_title=Column(Text,nullable=False) 
    status=Column(JSONB,nullable=False,default=lambda: {"status": "applied"})
    applied_at=Column(DateTime,default=datetime.utcnow,nullable=True) 
    location=Column(String,nullable=False)
    job_description=Column(String,nullable=True)
    job_description_embedding=Column(Text,nullable=True)
    salary_mentioned=Column(Text,nullable=True)
    is_remote=Column(Boolean,default=False)
    notes=Column(Text,nullable=True)
    skills_I_mentioned=Column(JSONB,nullable=True)
    created_at=Column(DateTime,default=datetime.utcnow,nullable=False)
    updated_at=Column(DateTime, default=datetime.utcnow,onupdate=datetime.utcnow,nullable=False)

    user=relationship("User",back_populates="applications")
    resume=relationship("Resume", back_populates='applications')
    screening_answers=relationship("ScreeningAnswer",back_populates='application',cascade="all, delete")
    timeline_events=relationship("TimelineEvent",back_populates="application",cascade="all, delete")
    reminders=relationship("Reminder",back_populates="application",cascade="all, delete")
    interview_prep=relationship("Interview",back_populates="application",cascade="all, delete")

    __table_args__=(
        Index("idx_user_status","user_id","status"),
        Index("idx_user_company","user_id","company_name")
    )

class ScreeningAnswer(Base):
    __tablename__="screeninganswers"

    id=Column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4)
    application_id=Column(UUID(as_uuid=True),ForeignKey("applications.id",ondelete="CASCADE"),nullable=False,index=True)
    question=Column(Text,nullable=False)
    answer=Column(Text,nullable=False)
    question_type=Column(String,nullable=True)
    created_at=Column(DateTime,default=datetime.now(),nullable=False)

    application=relationship("Application",back_populates="screening_answers")



class TimelineEvent(Base):
    __tablename__="timeline_events"

    id=Column(UUID(as_uuid=True),nullable=False,primary_key=True)
    application_id=Column(UUID(as_uuid=True),ForeignKey("applications.id" ,ondelete="CASCADE"),nullable=False)
    event_type=Column(String,nullable=False)
    title=Column(Text,nullable=False)
    metadataa=Column(JSONB,nullable=True)
    event_at=Column(DateTime,default=datetime.utcnow,nullable=False)

    application=relationship("Application",back_populates="timeline_events")

    __table_args__=(
        Index("idx_application_event_time", "application_id", "event_at"),
    )

class Reminder(Base):
    __tablename__="reminders"

    id=Column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4)
    user_id=Column(UUID(as_uuid=True),ForeignKey("users.id",ondelete="CASCADE"),nullable=False)
    application_id=Column(UUID(as_uuid=True),ForeignKey("applications.id",ondelete="CASCADE"),nullable=False)
    title=Column(Text,nullable=False)
    description=Column(Text,nullable=True)
    remind_at=Column(DateTime,nullable=False)
    is_sent=Column(Boolean,default=False,nullable=False)
    created_at=Column(DateTime,default=datetime.utcnow,nullable=False)

    user=relationship("User",back_populates="reminders")
    application=relationship("Application",back_populates="reminders")

    __table_args__=(
        Index("idx_is_sent_remind_at","is_sent","remind_at"),
    )

class InterviewPrep(Base):
    __tablename__ = "interview_preps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    application_id = Column(
        UUID(as_uuid=True),
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False
    )

    round_name = Column(String(100), nullable=True)

    scheduled_at = Column(DateTime(timezone=True), nullable=True)

    questions = Column(JSONB, nullable=True)

    suggested_topics = Column(JSONB, nullable=True)
    notes = Column(Text, nullable=True)

    outcome = Column(String(50), nullable=True)

    ai_suggestions = Column(JSONB, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )

    # Relationship
    application = relationship(
        "Application",
        back_populates="interview_preps"
    )

    # Index
    __table_args__ = (
        Index("idx_interviewprep_application", "application_id"),
    )

