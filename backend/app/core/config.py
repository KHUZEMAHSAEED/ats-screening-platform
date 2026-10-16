from pydantic_settings import BaseSettings
from typing import List, Optional
import os
from pathlib import Path

class Settings(BaseSettings):
    PROJECT_NAME: str = "ATS Screening System"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "ats-super-secret-production-key-change-in-env-2026")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    ALGORITHM: str = "HS256"

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
    MAX_FILE_SIZE_MB: int = 15  # 15MB limit per file
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".docx"]

    # AI / LLM Configuration (Optional & Configurable)
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
    ENABLE_LLM_ENRICHMENT: bool = os.getenv("ENABLE_LLM_ENRICHMENT", "false").lower() == "true"

    # OCR Fallback
    ENABLE_OCR: bool = os.getenv("ENABLE_OCR", "true").lower() == "true"
    TESSERACT_CMD: Optional[str] = os.getenv("TESSERACT_CMD", None)

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000", "*"]

    model_config = {
        "env_file": ".env",
        "extra": "allow"
    }

settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
