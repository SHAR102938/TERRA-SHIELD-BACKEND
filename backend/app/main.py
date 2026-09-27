import sys
import os

_cur_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.dirname(_cur_dir)
_root_dir = os.path.dirname(_backend_dir)
for _d in [_backend_dir, _cur_dir, _root_dir]:
    if _d not in sys.path:
        sys.path.insert(0, _d)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import geometry, materials, climate, analysis

from app.db.database import engine
from app.models import db_models

# Create DB tables
db_models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TERRA-SHIELD API",
    description="Backend for the TERRA-SHIELD thermal comfort and shelter design platform.",
    version="0.1.0",
)

# CORS configuration
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include classic routers
app.include_router(geometry.router, prefix="/api/geometry", tags=["Geometry"])
app.include_router(materials.router, prefix="/api/materials", tags=["Materials"])
app.include_router(climate.router, prefix="/api/climate", tags=["Climate"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
from app.api.routes import projects
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
from app.api.routes import optimize
app.include_router(optimize.router, prefix="/api/optimize", tags=["Optimization"])
from app.api.routes import validation
app.include_router(validation.router, prefix="/api/validation", tags=["Validation"])

# Include v1 router
try:
    import sys, os
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    from api.v1.router import api_router
    app.include_router(api_router, prefix="/api/v1")
except Exception as e:
    print(f"Warning: could not mount v1 router: {e}")

@app.get("/")
def read_root():
    return {"message": "Welcome to the TERRA-SHIELD API", "version": "0.1.0"}

@app.get("/health")
def health_check():
    return {"status": "ok", "app": "TERRA-SHIELD API", "version": "0.1.0"}