import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import engine
import models

from routers import auth, cases, documents, research, cause_list, alerts

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables on startup."""
    logger.info("Starting up - creating tables if needed")
    models.Base.metadata.create_all(bind=engine)
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="Legal Case Management API",
    description="Production-ready API for Indian Court Case Management",
    version="1.0.0",
    lifespan=lifespan,
)

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,https://legal-case-mgmt.vercel.app",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(cases.router)
app.include_router(documents.router)
app.include_router(research.router)
app.include_router(cause_list.router)
app.include_router(alerts.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "Legal Case Management API"}


@app.get("/")
def root():
    return {
        "message": "Legal Case Management API",
        "docs": "/docs",
        "version": "1.0.0",
    }


@app.get("/admin/seed")
def run_seed(key: str = ""):
    expected_key = os.getenv("JWT_SECRET_KEY", "")
    if not expected_key or key != expected_key:
        return JSONResponse(status_code=403, content={"detail": "Invalid or missing key"})

    try:
        import seed as seed_module
        seed_module.seed()
        return {"status": "ok", "message": "Database seeded successfully"}
    except Exception as e:
        logger.error(f"Seed failed: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"detail": f"Seed failed: {str(e)}"})


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )