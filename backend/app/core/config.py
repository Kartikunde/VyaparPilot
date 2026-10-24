import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_DB_PATH = (BACKEND_DIR / "vyaparpilot.db").as_posix()

# Handle Vercel Serverless environment where only /tmp is writable
if os.getenv("VERCEL") and not os.getenv("DATABASE_URL"):
    tmp_db = Path("/tmp/vyaparpilot.db")
    if not tmp_db.exists() and (BACKEND_DIR / "vyaparpilot.db").exists():
        import shutil
        try:
            shutil.copyfile((BACKEND_DIR / "vyaparpilot.db").as_posix(), "/tmp/vyaparpilot.db")
        except Exception:
            pass
    DEFAULT_DB_PATH = "/tmp/vyaparpilot.db"

class Settings(BaseSettings):
    PROJECT_NAME: str = "VyaparPilot AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database (resolves to absolute path or PostgreSQL)
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "vyaparpilot_super_secure_production_secret_key_2026_pragyan")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # AI Engine
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "https://vyapar-pilot.vercel.app",
        "https://vyaparpilot.onrender.com",
        "https://vyapar-pilot.onrender.com",
        "https://vyaparpilot-ai.onrender.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://*.vercel.app"
    ]
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
