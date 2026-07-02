from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"
DEFAULT_CORS_ORIGINS = ("http://localhost:3000", "https://job.shobhitsri.me")


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Job Tracker API"
    ENVIRONMENT: str = "development"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database
    DATABASE_URL: str
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = ""
    DB_USER: str = ""
    DB_PASSWORD: str = ""

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    EMAIL_VERIFICATION_CODE_EXPIRE_MINUTES: int = 15
    LOGIN_OTP_EXPIRE_MINUTES: int = 10

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,https://job.shobhitsri.me"
    ALLOW_CREDENTIALS: bool = True
    ALLOW_METHODS: str = "*"
    ALLOW_HEADERS: str = "*"

    # AWS S3
    AWS_REGION: str
    S3_BUCKET_NAME: str
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_SESSION_TOKEN: Optional[str] = None

    # Redis Caching
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None
    CACHE_TTL_SECONDS: int = 3600  # 1 hour default TTL
    ENABLE_CACHING: bool = False

    # Email (SMTP)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 465
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_FROM_NAME: str = "Job Tracker"
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False

    # OAuth
    FRONTEND_URL: Optional[str] = "http://localhost:3000"
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def cors_origins(self) -> List[str]:
        """Normalize CORS origins from a comma-separated string or sequence."""
        allowed_origins = self.ALLOWED_ORIGINS

        if isinstance(allowed_origins, str):
            parsed_origins = [origin.strip() for origin in allowed_origins.split(",")]
        elif isinstance(allowed_origins, (list, tuple, set)):
            parsed_origins = [str(origin).strip() for origin in allowed_origins]
        else:
            parsed_origins = []

        cleaned_origins = [origin for origin in parsed_origins if origin]
        return cleaned_origins or list(DEFAULT_CORS_ORIGINS)


settings = Settings()
