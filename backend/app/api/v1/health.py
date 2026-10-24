from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.core.config import settings

router = APIRouter(prefix="/health", tags=["Health & Status"])

@router.get("/")
def health_check(db: Session = Depends(get_db)):
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    ai_mode = "GEMINI_LIVE_API" if settings.GEMINI_API_KEY else "VERIFIED_DEMO_ENGINE"

    return {
        "status": "healthy" if db_ok else "degraded",
        "database_connected": db_ok,
        "ai_engine_mode": ai_mode,
        "version": settings.VERSION,
        "project": settings.PROJECT_NAME
    }
