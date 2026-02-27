from sqlalchemy import Column, Integer, String, DateTime
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    reset_token_hash = Column(String, nullable=True)
    reset_token_expires_at = Column(DateTime, nullable=True) 