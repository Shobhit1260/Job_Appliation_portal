from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.auth.routes import router as auth_router
from app.controllers.application import router as application_router
from app.controllers.resume import router as resume_router

from app.config import settings

app = FastAPI(
    title=settings.APP_NAME
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.ALLOW_CREDENTIALS,
    allow_methods=[settings.ALLOW_METHODS],
    allow_headers=[settings.ALLOW_HEADERS],
)

Base.metadata.create_all(bind=engine)

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(application_router,prefix="/application",tags=["application"])
app.include_router(resume_router,prefix="/resume",tags=["resume"])