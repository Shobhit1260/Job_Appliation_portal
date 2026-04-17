from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy import text
from app.database import engine, Base
from app.auth.routes import router as auth_router
from app.controllers.application import router as application_router
from app.controllers.resume import router as resume_router
from app.controllers.reminder import router as reminder_router
from app.controllers.dashboard import router as dashboard_router
from app.controllers.settings import router as settings_router
from app.config import settings
from app.redis_client import init_redis, close_redis
from app.reminder_dispatcher import run_reminder_dispatcher
import asyncio

app = FastAPI(
    title=settings.APP_NAME
)

reminder_dispatcher_stop_event: asyncio.Event | None = None
reminder_dispatcher_task: asyncio.Task | None = None

# CORS middleware - MUST be added first to handle preflight requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)


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

# Redis Startup Event
@app.on_event("startup")
async def startup_event():
    """Initialize Redis connection on app startup."""
    global reminder_dispatcher_stop_event, reminder_dispatcher_task

    await init_redis()

    reminder_dispatcher_stop_event = asyncio.Event()
    reminder_dispatcher_task = asyncio.create_task(
        run_reminder_dispatcher(reminder_dispatcher_stop_event)
    )

# Redis Shutdown Event
@app.on_event("shutdown")
async def shutdown_event():
    """Close Redis connection on app shutdown."""
    global reminder_dispatcher_stop_event, reminder_dispatcher_task

    if reminder_dispatcher_stop_event is not None:
        reminder_dispatcher_stop_event.set()

    if reminder_dispatcher_task is not None:
        try:
            await reminder_dispatcher_task
        except Exception:
            pass

    await close_redis()

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(application_router,prefix="/application",tags=["application"])
app.include_router(resume_router,prefix="/resume",tags=["resume"])
app.include_router(reminder_router,prefix="/reminder",tags=["reminder"])
app.include_router(dashboard_router,prefix="/dashboard",tags=["dashboard"])
app.include_router(settings_router,prefix="/settings",tags=["settings"])