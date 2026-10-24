import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import Base, engine

# Import all models to ensure metadata registration
import app.models

# Routers
from app.api.v1.auth import router as auth_router
from app.api.v1.businesses import router as business_router
from app.api.v1.products import router as products_router
from app.api.v1.customers import router as customers_router
from app.api.v1.enquiries import router as enquiries_router
from app.api.v1.quotations import router as quotations_router
from app.api.v1.roi import router as roi_router
from app.api.v1.audit import router as audit_router
from app.api.v1.reports import router as reports_router
from app.api.v1.health import router as health_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vyaparpilot")

# Create tables automatically on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Verified AI Co-Pilot for MSME Productivity with Verifiable Return on Investment. PRAGYAN 2K26 Hackathon Track 4-01.",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local hackathon demo and testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Safe global exception handling
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred. The incident has been recorded in the system audit logs.",
            "error_type": exc.__class__.__name__
        }
    )

# Register API v1 Routers
api_v1_prefix = settings.API_V1_STR
app.include_router(auth_router, prefix=api_v1_prefix)
app.include_router(business_router, prefix=api_v1_prefix)
app.include_router(products_router, prefix=api_v1_prefix)
app.include_router(customers_router, prefix=api_v1_prefix)
app.include_router(enquiries_router, prefix=api_v1_prefix)
app.include_router(quotations_router, prefix=api_v1_prefix)
app.include_router(roi_router, prefix=api_v1_prefix)
app.include_router(audit_router, prefix=api_v1_prefix)
app.include_router(reports_router, prefix=api_v1_prefix)
app.include_router(health_router, prefix=api_v1_prefix)

@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "track": "PRAGYAN 2K26 National-Level Hackathon Track 4-01",
        "description": "Verified AI Co-Pilot for MSME Productivity with Verifiable ROI",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health"
    }
