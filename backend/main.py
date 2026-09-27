"""
TERRA-SHIELD Backend — Unified FastAPI Application.
"""

import sys
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Add parent and backend dir so modules are importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from config import settings
from exceptions import ThermashellError
from app.db.database import engine, Base
from app.models import db_models
from app.api.routes import geometry, materials, climate, analysis, projects, optimize, validation, retrofit


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize unified database schema
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.API_VERSION,
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler for typed exceptions
@app.exception_handler(ThermashellError)
async def thermashell_error_handler(request: Request, exc: ThermashellError):
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.to_dict(),
    )


# Mount Canonical API Routers
app.include_router(geometry.router, prefix="/api/geometry", tags=["Geometry"])
app.include_router(materials.router, prefix="/api/materials", tags=["Materials"])
app.include_router(climate.router, prefix="/api/climate", tags=["Climate"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(optimize.router, prefix="/api/optimize", tags=["Optimization"])
app.include_router(validation.router, prefix="/api/validation", tags=["Validation"])
app.include_router(retrofit.router, prefix="/api/retrofit", tags=["Retrofit"])


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.API_VERSION}
