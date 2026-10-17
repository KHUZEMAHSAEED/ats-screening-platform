from pydantic_settings import BaseSettings
from typing import List, Optional
import os
import logging
from pathlib import Path

logger = logging.getLogger("ats.config")

class Settings(BaseSettings):
    PROJECT_NAME: str = "ATS Screening System"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # JWT Authentication & Cryptographic Signing
    SECRET_KEY: str = os.getenv("SECRET_KEY", "ats-super-secret-production-key-change-in-env-2026")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24))  # 24 hours
    ALGORITHM: str = "HS256"

    # Initial Admin Seed Credentials
    INITIAL_ADMIN_EMAIL: str = os.getenv("INITIAL_ADMIN_EMAIL", "admin@example.com")
    INITIAL_ADMIN_PASSWORD: str = os.getenv("INITIAL_ADMIN_PASSWORD", "AdminPass123!")

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./ats.db"  # Fallback to local SQLite if Postgres is not configured
    )

    # Redis / Celery
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    USE_IN_PROCESS_TASKS: bool = os.getenv("USE_IN_PROCESS_TASKS", "true").lower() == "true"

    # File uploads
    UPLOAD_DIR: Path = Path(os.getenv("UPLOAD_DIR", "uploads")).resolve()
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", 15))  # 15MB limit per file
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".docx"]

    # AI / LLM Configuration (Optional & Configurable)
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
    ENABLE_LLM_ENRICHMENT: bool = os.getenv("ENABLE_LLM_ENRICHMENT", "false").lower() == "true"

    # OCR Fallback
    ENABLE_OCR: bool = os.getenv("ENABLE_OCR", "true").lower() == "true"
    TESSERACT_CMD: Optional[str] = os.getenv("TESSERACT_CMD", None)

    # CORS
    CORS_ORIGINS: List[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
        if origin.strip()
    ]

    model_config = {
        "env_file": ".env",
        "extra": "allow"
    }

settings = Settings()

# Enterprise Security Guardrail: Refuse to boot in production with default secret key
if settings.ENVIRONMENT.lower() == "production":
    if settings.SECRET_KEY == "ats-super-secret-production-key-change-in-env-2026" or len(settings.SECRET_KEY) < 32:
        raise ValueError(
            "CRITICAL SECURITY CONFIGURATION ERROR: "
            "In production mode, SECRET_KEY must be set in your .env file to a unique, random string of at least 32 characters."
        )

settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
