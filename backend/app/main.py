from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine, Base
from app.auth.routes import router as auth_router
from app.controllers.application import router as application_router
from app.controllers.resume import router as resume_router
from app.controllers.reminder import router as reminder_router
from app.controllers.dashboard import router as dashboard_router
from app.config import settings
from app.redis_client import init_redis, close_redis

app = FastAPI(
    title=settings.APP_NAME
)


@app.get("/healthz", tags=["health"])
async def health_check():
    """Readiness endpoint used by containers and deployment smoke tests."""
    db_status = "ok"
    redis_status = "disabled"

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    if settings.ENABLE_CACHING:
        redis_status = "ok"
        redis_client = await init_redis()
        if redis_client is None:
            redis_status = "error"

    overall_status = "ok" if db_status == "ok" and redis_status != "error" else "degraded"
    return {
        "status": overall_status,
        "database": db_status,
        "redis": redis_status,
    }

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.ALLOW_CREDENTIALS,
    allow_methods=[settings.ALLOW_METHODS],
    allow_headers=[settings.ALLOW_HEADERS],
)



# Redis Startup Event
@app.on_event("startup")
async def startup_event():
    """Initialize Redis connection on app startup."""
    await init_redis()

# Redis Shutdown Event
@app.on_event("shutdown")
async def shutdown_event():
    """Close Redis connection on app shutdown."""
    await close_redis()

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(application_router,prefix="/application",tags=["application"])
app.include_router(resume_router,prefix="/resume",tags=["resume"])
app.include_router(reminder_router,prefix="/reminder",tags=["reminder"])
app.include_router(dashboard_router,prefix="/dashboard",tags=["dashboard"])