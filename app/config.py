from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ─── App ───────────────────────────────────────────────────────────────────
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    APP_TITLE: str = "ORBIT - Intelligent Distribution & Scheduling Nexus"
    APP_VERSION: str = "1.0.0"

    # ─── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://orbit_user:orbit_pass@localhost:5432/orbit"
    # Sync URL used by Alembic only (psycopg2 driver); not used by the async app
    SYNC_DATABASE_URL: str = ""

    # ─── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # ─── Security ──────────────────────────────────────────────────────────────
    SECRET_KEY: str = "change-me-in-production-32-chars!!"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # ─── Twitter / X ───────────────────────────────────────────────────────────
    TWITTER_API_KEY: str = ""
    TWITTER_API_SECRET: str = ""
    TWITTER_ACCESS_TOKEN: str = ""
    TWITTER_ACCESS_SECRET: str = ""
    TWITTER_BEARER_TOKEN: str = ""

    # ─── Instagram / Facebook ──────────────────────────────────────────────────
    FACEBOOK_APP_ID: str = ""
    FACEBOOK_APP_SECRET: str = ""
    INSTAGRAM_ACCESS_TOKEN: str = ""

    # ─── LinkedIn ──────────────────────────────────────────────────────────────
    LINKEDIN_CLIENT_ID: str = ""
    LINKEDIN_CLIENT_SECRET: str = ""

    # ─── YouTube ───────────────────────────────────────────────────────────────
    YOUTUBE_CLIENT_ID: str = ""
    YOUTUBE_CLIENT_SECRET: str = ""
    YOUTUBE_API_KEY: str = ""

    # ─── ML / Scheduling ───────────────────────────────────────────────────────
    MODEL_PATH: str = "./models"
    DEFAULT_TIMEZONE: str = "UTC"
    PUBLISH_RETRY_ATTEMPTS: int = 3
    MIN_DATA_POINTS_FOR_ML: int = 50  # Minimum records before using ML model
    RELEVANCE_DECAY_DEFAULT: float = 0.05  # 5% per hour

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
